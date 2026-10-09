const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Category = require("../models/Category");
const {
  escapeRegex,
  parsePagination,
  buildPagination,
} = require("../utils/helpers");
const { ORDER_STATUSES } = require("../config/constants");

const LOW_STOCK_THRESHOLD = 5;
const SALES_WINDOW_DAYS = 14;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // store is India-based

// "2026-10-06" for the given instant, as a calendar day in IST.
const istDay = (date) =>
  new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

// Revenue and order count per day for the last N days (empty days included
// so charts have a continuous axis). Cancelled orders are not counted.
const buildSalesByDay = async (days) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const orders = await Order.find({
    createdAt: { $gte: since },
    orderStatus: { $ne: "cancelled" },
  })
    .select("createdAt totalAmount")
    .lean();

  const buckets = new Map();

  for (let i = days - 1; i >= 0; i -= 1) {
    const key = istDay(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
    buckets.set(key, { date: key, orders: 0, revenue: 0 });
  }

  for (const order of orders) {
    const bucket = buckets.get(istDay(order.createdAt));

    if (bucket) {
      bucket.orders += 1;
      bucket.revenue += order.totalAmount;
    }
  }

  return [...buckets.values()];
};

const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalCategories,
      totalOrders,
      totalReviews,
      pendingOrders,
      deliveredOrders,
      revenueResult,
      statusCounts,
      salesByDay,
      topProducts,
      stockedProducts,
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Category.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Review.countDocuments(),
      Order.countDocuments({ orderStatus: "pending" }),
      Order.countDocuments({ orderStatus: "delivered" }),

      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),

      Order.aggregate([
        { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      ]),

      buildSalesByDay(SALES_WINDOW_DAYS),

      // Best sellers by units sold (cancelled orders excluded).
      Order.aggregate([
        { $match: { orderStatus: { $ne: "cancelled" } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            name: { $first: "$items.productName" },
            units: { $sum: "$items.quantity" },
            revenue: {
              $sum: { $multiply: ["$items.price", "$items.quantity"] },
            },
          },
        },
        { $sort: { units: -1 } },
        { $limit: 5 },
      ]),

      Product.find({
        isActive: true,
        "variants.stock": { $lte: LOW_STOCK_THRESHOLD },
      }).select("name slug variants"),
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    const ordersByStatus = Object.fromEntries(
      ORDER_STATUSES.map((status) => [status, 0])
    );

    for (const row of statusCounts) {
      if (row._id in ordersByStatus) ordersByStatus[row._id] = row.count;
    }

    // One row per variant that is running low, lowest stock first.
    const lowStock = stockedProducts
      .flatMap((product) =>
        product.variants
          .filter((variant) => variant.stock <= LOW_STOCK_THRESHOLD)
          .map((variant) => ({
            productId: product._id,
            name: product.name,
            slug: product.slug,
            size: variant.size,
            color: variant.color,
            stock: variant.stock,
          }))
      )
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10);

    res.status(200).json({
      stats: {
        totalUsers,
        totalProducts,
        totalCategories,
        totalOrders,
        totalReviews,
        pendingOrders,
        deliveredOrders,
        totalRevenue,
      },
      ordersByStatus,
      salesByDay,
      topProducts: topProducts.map((row) => ({
        productId: row._id,
        name: row.name,
        units: row.units,
        revenue: row.revenue,
      })),
      lowStock,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    });
  } catch (error) {
    next(error);
  }
};

const getRecentOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({
        createdAt: -1,
      })
      .limit(10);

    res.status(200).json({
      orders,
    });
  } catch (error) {
    next(error);
  }
};

// All products, including inactive ones.
// ?page=&limit=&q=&status=active|inactive
const getAdminProducts = async (req, res, next) => {
  try {
    const { q, status } = req.query;
    const pagination = parsePagination(req.query, {
      defaultLimit: 20,
      maxLimit: 100,
    });

    const filter = {};

    if (typeof q === "string" && q.trim()) {
      filter.name = { $regex: escapeRegex(q.trim()), $options: "i" };
    }

    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug isActive")
        .sort({ createdAt: -1 })
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

// One product by id, including inactive ones (the public endpoint only
// serves active products by slug, so the edit form needs this).
const getAdminProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "category",
      "name slug isActive"
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json({ product });
  } catch (error) {
    next(error);
  }
};

// All categories, including inactive ones (so they can be re-activated),
// each with the number of products filed under it.
const getAdminCategories = async (req, res, next) => {
  try {
    const [categories, counts] = await Promise.all([
      Category.find().sort({ name: 1 }).lean(),
      Product.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
    ]);

    const countById = new Map(counts.map((row) => [String(row._id), row.count]));

    res.status(200).json({
      categories: categories.map((category) => ({
        ...category,
        productCount: countById.get(String(category._id)) || 0,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// ?page=&limit=&approved=true|false
const getAdminReviews = async (req, res, next) => {
  try {
    const { approved } = req.query;
    const pagination = parsePagination(req.query, {
      defaultLimit: 20,
      maxLimit: 100,
    });

    const filter = {};

    if (approved === "true") filter.isApproved = true;
    if (approved === "false") filter.isApproved = false;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("user", "name email")
        .populate("product", "name slug")
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Review.countDocuments(filter),
    ]);

    res.status(200).json({
      reviews,
      pagination: buildPagination(pagination, total),
    });
  } catch (error) {
    next(error);
  }
};

const setReviewApproval = async (req, res, next) => {
  try {
    const { isApproved } = req.body;

    if (typeof isApproved !== "boolean") {
      return res.status(400).json({
        message: "isApproved must be true or false",
      });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isApproved },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    res.status(200).json({
      message: isApproved ? "Review approved" : "Review hidden",
      review,
    });
  } catch (error) {
    next(error);
  }
};

const deleteAdminReview = async (req, res, next) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    res.status(200).json({
      message: "Review deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getRecentOrders,
  getAdminProducts,
  getAdminProductById,
  getAdminCategories,
  getAdminReviews,
  setReviewApproval,
  deleteAdminReview,
};