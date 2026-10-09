const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const { isValidObjectId } = require("../utils/helpers");

// Deactivated products are hidden from the storefront, so they are hidden
// from wishlists too (populate drops non-matching entries from the array).
const ACTIVE_ONLY = { path: "products", match: { isActive: true } };

const getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({
      user: req.user.userId,
    }).populate(ACTIVE_ONLY);

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user.userId,
        products: [],
      });
    }

    res.status(200).json({
      wishlist,
    });
  } catch (error) {
    console.error("Get wishlist error:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};


const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId || !isValidObjectId(productId)) {
      return res.status(400).json({
        message: "A valid product ID is required",
      });
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

    let wishlist = await Wishlist.findOne({
      user: req.user.userId,
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user.userId,
        products: [productId],
      });
    } else {
      const alreadyExists = wishlist.products.some(
        (id) => id.toString() === productId
      );

      if (alreadyExists) {
        return res.status(409).json({
          message: "Product already in wishlist",
        });
      }

      wishlist.products.push(productId);

      await wishlist.save();
    }

    await wishlist.populate(ACTIVE_ONLY);

    res.status(200).json({
      message: "Product added to wishlist",
      wishlist,
    });
  } catch (error) {
    console.error("Add wishlist error:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};


const removeFromWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({
      user: req.user.userId,
    });

    if (!wishlist) {
      return res.status(404).json({
        message: "Wishlist not found",
      });
    }

    const productExists = wishlist.products.some(
      (id) => id.toString() === req.params.productId
    );

    if (!productExists) {
      return res.status(404).json({
        message: "Product not in wishlist",
      });
    }

    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== req.params.productId
    );

    await wishlist.save();
    await wishlist.populate(ACTIVE_ONLY);

    res.status(200).json({
      message: "Product removed from wishlist",
      wishlist,
    });
  } catch (error) {
    console.error("Remove wishlist error:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};


const clearWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({
      user: req.user.userId,
    });

    if (!wishlist) {
      return res.status(404).json({
        message: "Wishlist not found",
      });
    }

    wishlist.products = [];

    await wishlist.save();

    res.status(200).json({
      message: "Wishlist cleared successfully",
      wishlist,
    });
  } catch (error) {
    console.error("Clear wishlist error:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};


module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
};