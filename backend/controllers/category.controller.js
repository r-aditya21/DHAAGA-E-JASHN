const Category = require("../models/Category");
const Product = require("../models/Product");
const { slugify } = require("../utils/helpers");

// Validates and normalises a category payload.
// partial=true (updates) only checks the fields that were sent.
// Every value must be the right primitive type, which also blocks
// NoSQL operator payloads such as {"name": {"$ne": null}}.
const parseCategoryBody = (body, { partial }) => {
  const data = {};
  const has = (key) => body[key] !== undefined;

  if (!partial || has("name")) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return { error: "Category name is required" };
    }

    if (body.name.trim().length > 60) {
      return { error: "Category name must be 60 characters or fewer" };
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

  if (has("description")) {
    if (typeof body.description !== "string" || body.description.length > 500) {
      return { error: "Description must be text up to 500 characters" };
    }

    data.description = body.description.trim();
  }

  if (has("image")) {
    if (typeof body.image !== "string" || body.image.length > 500) {
      return { error: "Image must be a URL or path up to 500 characters" };
    }

    data.image = body.image.trim();
  }

  if (has("isActive")) {
    if (typeof body.isActive !== "boolean") {
      return { error: "isActive must be true or false" };
    }

    data.isActive = body.isActive;
  }

  return { data };
};

const createCategory = async (req, res, next) => {
  try {
    const { data, error } = parseCategoryBody(req.body, { partial: false });

    if (error) {
      return res.status(400).json({ message: error });
    }

    const existing = await Category.findOne({
      $or: [{ name: data.name }, { slug: data.slug }],
    });

    if (existing) {
      return res.status(409).json({
        message: "Category name or slug already exists",
      });
    }

    const category = await Category.create(data);

    res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      name: 1,
    });

    res.status(200).json({ categories });
  } catch (error) {
    next(error);
  }
};

const getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      slug: req.params.slug.toLowerCase(),
      isActive: true,
    });

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    res.status(200).json({ category });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const { data, error } = parseCategoryBody(req.body, { partial: true });

    if (error) {
      return res.status(400).json({ message: error });
    }

    if (data.slug && data.slug !== category.slug) {
      const existing = await Category.findOne({
        slug: data.slug,
        _id: { $ne: category._id },
      });

      if (existing) {
        return res.status(409).json({
          message: "A category with this slug already exists",
        });
      }
    }

    if (data.name && data.name !== category.name) {
      const existing = await Category.findOne({
        name: data.name,
        _id: { $ne: category._id },
      });

      if (existing) {
        return res.status(409).json({
          message: "A category with this name already exists",
        });
      }
    }

    Object.assign(category, data);

    await category.save();

    res.status(200).json({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    next(error);
  }
};

// Soft delete: products keep pointing at the category, they are simply
// hidden from the storefront while it is inactive.
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    category.isActive = false;
    await category.save();

    const affectedProducts = await Product.countDocuments({
      category: category._id,
      isActive: true,
    });

    res.status(200).json({
      message: "Category deleted successfully",
      affectedProducts,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
};
