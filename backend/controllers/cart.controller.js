const Cart = require("../models/Cart");
const Product = require("../models/Product");
const {
  MAX_CART_ITEM_QUANTITY,
  FREE_SHIPPING_THRESHOLD,
  calculateShipping,
} = require("../config/constants");
const { isValidObjectId } = require("../utils/helpers");

const isValidQuantity = (value) =>
  Number.isInteger(value) && value >= 1 && value <= MAX_CART_ITEM_QUANTITY;

const quantityError = `Quantity must be a whole number between 1 and ${MAX_CART_ITEM_QUANTITY}`;

// Loads the user's cart (creating it if needed), drops items whose product
// no longer exists, and populates products.
const loadCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate("items.product");

  if (!cart) {
    return Cart.create({ user: userId, items: [] });
  }

  const staleItems = cart.items.filter((item) => !item.product);

  if (staleItems.length > 0) {
    cart.items = cart.items.filter((item) => item.product);
    await cart.save();
    await cart.populate("items.product");
  }

  return cart;
};

// Totals are always computed from current database prices.
const buildSummary = (cart) => {
  let subtotal = 0;
  let itemCount = 0;
  let hasUnavailableItems = false;

  for (const item of cart.items) {
    const product = item.product;

    if (!product || !product.isActive) {
      hasUnavailableItems = true;
      continue;
    }

    const variant = product.variants.find(
      (v) => v.size === item.size && v.color === item.color
    );

    if (!variant || variant.stock < item.quantity) {
      hasUnavailableItems = true;
    }

    subtotal += product.price * item.quantity;
    itemCount += item.quantity;
  }

  const shippingFee = calculateShipping(subtotal);

  return {
    subtotal,
    itemCount,
    hasUnavailableItems,
    shippingFee,
    total: subtotal + shippingFee,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  };
};

const getCart = async (req, res, next) => {
  try {
    const cart = await loadCart(req.user.userId);

    res.status(200).json({
      cart,
      summary: buildSummary(cart),
    });
  } catch (error) {
    next(error);
  }
};

const addToCart = async (req, res, next) => {
  try {
    const { productId, size, color, quantity } = req.body;

    if (!productId || !size || !color || quantity === undefined) {
      return res.status(400).json({
        message: "Product, size, color and quantity are required",
      });
    }

    if (!isValidObjectId(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    if (typeof size !== "string" || typeof color !== "string") {
      return res.status(400).json({
        message: "Size and color must be strings",
      });
    }

    if (!isValidQuantity(quantity)) {
      return res.status(400).json({ message: quantityError });
    }

    const product = await Product.findOne({
      _id: productId,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const cleanSize = size.trim();
    const cleanColor = color.trim();

    const variant = product.variants.find(
      (item) => item.size === cleanSize && item.color === cleanColor
    );

    if (!variant) {
      return res.status(400).json({
        message: "Selected size and color are not available",
      });
    }

    if (variant.stock < quantity) {
      return res.status(400).json({
        message: "Not enough stock available",
      });
    }

    let cart = await Cart.findOne({
      user: req.user.userId,
    });

    if (!cart) {
      cart = await Cart.create({
        user: req.user.userId,
        items: [],
      });
    }

    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId &&
        item.size === cleanSize &&
        item.color === cleanColor
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > variant.stock) {
        return res.status(400).json({
          message: "Not enough stock available",
        });
      }

      if (newQuantity > MAX_CART_ITEM_QUANTITY) {
        return res.status(400).json({
          message: `You can add at most ${MAX_CART_ITEM_QUANTITY} of one item`,
        });
      }

      existingItem.quantity = newQuantity;
    } else {
      cart.items.push({
        product: productId,
        size: cleanSize,
        color: cleanColor,
        quantity,
      });
    }

    await cart.save();
    await cart.populate("items.product");

    res.status(200).json({
      message: "Product added to cart",
      cart,
      summary: buildSummary(cart),
    });
  } catch (error) {
    next(error);
  }
};

const updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;

    if (!isValidQuantity(quantity)) {
      return res.status(400).json({ message: quantityError });
    }

    const cart = await Cart.findOne({
      user: req.user.userId,
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    const item = cart.items.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({
        message: "Cart item not found",
      });
    }

    const product = await Product.findOne({
      _id: item.product,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const variant = product.variants.find(
      (v) => v.size === item.size && v.color === item.color
    );

    if (!variant) {
      return res.status(400).json({
        message: "Product variant is no longer available",
      });
    }

    if (quantity > variant.stock) {
      return res.status(400).json({
        message: "Not enough stock available",
      });
    }

    item.quantity = quantity;

    await cart.save();
    await cart.populate("items.product");

    res.status(200).json({
      message: "Cart updated successfully",
      cart,
      summary: buildSummary(cart),
    });
  } catch (error) {
    next(error);
  }
};

const removeCartItem = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({
      user: req.user.userId,
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    const item = cart.items.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({
        message: "Cart item not found",
      });
    }

    item.deleteOne();

    await cart.save();
    await cart.populate("items.product");

    res.status(200).json({
      message: "Item removed from cart",
      cart,
      summary: buildSummary(cart),
    });
  } catch (error) {
    next(error);
  }
};

const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({
      user: req.user.userId,
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    cart.items = [];

    await cart.save();

    res.status(200).json({
      message: "Cart cleared successfully",
      cart,
      summary: {
        subtotal: 0,
        itemCount: 0,
        hasUnavailableItems: false,
        shippingFee: 0,
        total: 0,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
