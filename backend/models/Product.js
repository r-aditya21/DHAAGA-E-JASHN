const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
      trim: true,
    },

    color: {
      type: String,
      required: true,
      trim: true,
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    _id: true,
  }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    images: [
      {
        type: String,
      },
    ],

    category: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Category",
  required: true,
},

    // Which storefront section the piece belongs to. "unisex" shows in both.
    gender: {
      type: String,
      enum: ["men", "women", "unisex"],
      default: "unisex",
      index: true,
    },

    variants: [variantSchema],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ category: 1, isActive: 1 });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;