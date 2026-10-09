const Product = require("../models/Product");
const Category = require("../models/Category");
const {
  isValidObjectId,
  escapeRegex,
  slugify,
  parsePagination,
  buildPagination,
} = require("../utils/helpers");

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  name: { name: 1 },
};

// Validates and normalises a product payload.
// partial=true (updates) only checks the fields that were sent.
const parseProductBody = (body, { partial }) => {
  const data = {};
  const has = (key) => body[key] !== undefined;

  if (!partial || has("name")) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return { error: "Product name is required" };
    }
    data.name = body.name.trim();
  }

  if (has("slug") || !partial) {
    const source = has("slug") ? body.slug : data.name;

    if (typeof source !== "string" || !slugify(source)) {
      return { error: "A valid slug is required" };
    }
    data.slug = slugify(source);
  }

  if (!partial || has("description")) {
    if (typeof body.description !== "string" || !body.description.trim()) {
      return { error: "Product description is required" };
    }
    data.description = body.description.trim();
  }

  if (!partial || has("price")) {
    if (
      typeof body.price !== "number" ||
      !Number.isFinite(body.price) ||
      body.price < 0
    ) {
      return { error: "Price must be a number greater than or equal to 0" };
    }
    data.price = body.price;
  }

  if (has("images")) {
    if (
      !Array.isArray(body.images) ||
      body.images.some((img) => typeof img !== "string" || !img.trim())
    ) {
      return { error: "Images must be an array of URLs" };
    }
    data.images = body.images.map((img) => img.trim());
  }

  if (!partial || has("category")) {
    if (!isValidObjectId(body.category)) {
      return { error: "A valid category is required" };
    }
    data.category = body.category;
  }

  if (has("gender")) {
    if (!["men", "women", "unisex"].includes(body.gender)) {
      return { error: "Gender must be men, women or unisex" };
    }
    data.gender = body.gender;
  }

  if (has("variants")) {
    if (!Array.isArray(body.variants)) {
      return { error: "Variants must be an array" };
    }

    const seen = new Set();
    const variants = [];

    for (const variant of body.variants) {
      const size = typeof variant?.size === "string" ? variant.size.trim() : "";
      const color =
        typeof variant?.color === "string" ? variant.color.trim() : "";
      const stock = variant?.stock;

      if (!size || !color) {
        return { error: "Each variant needs a size and a color" };
      }

      if (!Number.isInteger(stock) || stock < 0) {
        return { error: "Variant stock must be a whole number, 0 or more" };
      }

      const key = `${size.toLowerCase()}|${color.toLowerCase()}`;

      if (seen.has(key)) {
        return { error: `Duplicate variant: ${size} / ${color}` };
      }

      seen.add(key);
      variants.push({ size, color, stock });
    }

    data.variants = variants;
  }

  if (has("isActive")) {
    if (typeof body.isActive !== "boolean") {
      return { error: "isActive must be true or false" };
    }
    data.isActive = body.isActive;
  }

  return { data };
};

const createProduct = async (req, res, next) => {
  try {
    const { data, error } = parseProductBody(req.body, { partial: false });

    if (error) {
      return res.status(400).json({ message: error });
    }

    const category = await Category.findById(data.category);

    if (!category || !category.isActive) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    const existingProduct = await Product.findOne({ slug: data.slug });

    if (existingProduct) {
      return res.status(409).json({
        message: "A product with this slug already exists",
      });
    }

    const product = await Product.create({
      ...data,
      images: data.images || [],
      variants: data.variants || [],
    });

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    next(error);
  }
};

// Public listing. Supports:
//   ?page=1&limit=12&category=<slug>&gender=men|women&q=<search>&minPrice=&maxPrice=
//   &sort=newest|price_asc|price_desc|name
const getProducts = async (req, res, next) => {
  try {
    const { category, q, minPrice, maxPrice, sort, gender } = req.query;
    const pagination = parsePagination(req.query);

    const filter = { isActive: true };

    // Only products whose category is still active are shown.
    const categoryFilter = { isActive: true };

    if (typeof category === "string" && category) {
      categoryFilter.slug = category.toLowerCase();
    }

    const categoryIds = await Category.find(categoryFilter).distinct("_id");
    filter.category = { $in: categoryIds };

    // ?gender=men|women also returns unisex pieces.
    if (gender === "men" || gender === "women") {
      filter.gender = { $in: [gender, "unisex"] };
    }

    if (typeof q === "string" && q.trim()) {
      filter.name = { $regex: escapeRegex(q.trim()), $options: "i" };
    }

    const priceRange = {};

    if (minPrice !== undefined && Number.isFinite(Number(minPrice))) {
      priceRange.$gte = Number(minPrice);
    }

    if (maxPrice !== undefined && Number.isFinite(Number(maxPrice))) {
      priceRange.$lte = Number(maxPrice);
    }

    if (Object.keys(priceRange).length > 0) {
      filter.price = priceRange;
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category")
        .sort(SORTS[sort] || SORTS.newest)
        .skip(pagination.skip)
        .limit(pagination.limit),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      products,
      pagination: buildPagination(pagination, total),
    });
  } catch (error) {
    next(error);
  }
};

const getProductBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug.toLowerCase(),
      isActive: true,
    }).populate("category");

    if (!product || !product.category || !product.category.isActive) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json({
      product,
    });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const { data, error } = parseProductBody(req.body, { partial: true });

    if (error) {
      return res.status(400).json({ message: error });
    }

    if (data.slug && data.slug !== product.slug) {
      const existingProduct = await Product.findOne({
        slug: data.slug,
        _id: { $ne: product._id },
      });

      if (existingProduct) {
        return res.status(409).json({
          message: "A product with this slug already exists",
        });
      }
    }

    if (data.category && String(data.category) !== String(product.category)) {
      const category = await Category.findById(data.category);

      if (!category || !category.isActive) {
        return res.status(404).json({
          message: "Category not found",
        });
      }
    }

    Object.assign(product, data);

    await product.save();

    res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    next(error);
  }
};

// Soft delete: carts, wishlists, reviews and orders all reference products,
// so the product is deactivated instead of removed.
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    product.isActive = false;

    await product.save();

    res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductBySlug,
  updateProduct,
  deleteProduct,
};
