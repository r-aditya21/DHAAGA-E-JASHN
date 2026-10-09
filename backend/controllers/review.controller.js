const mongoose = require("mongoose");
const Review = require("../models/Review");
const Order = require("../models/Order");
const {
  isValidObjectId,
  parsePagination,
  buildPagination,
} = require("../utils/helpers");

const isValidRating = (rating) =>
  Number.isInteger(rating) && rating >= 1 && rating <= 5;

const createReview = async (req, res, next) => {
  try {
    const { productId, orderId, rating, comment } = req.body;

    if (!productId || !orderId || rating === undefined || !comment) {
      return res.status(400).json({
        message: "Product, order, rating and comment are required",
      });
    }

    if (!isValidObjectId(productId) || !isValidObjectId(orderId)) {
      return res.status(400).json({
        message: "Invalid product or order ID",
      });
    }

    if (!isValidRating(rating)) {
      return res.status(400).json({
        message: "Rating must be a whole number between 1 and 5",
      });
    }

    if (typeof comment !== "string" || !comment.trim()) {
      return res.status(400).json({
        message: "Comment is required",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user.userId,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.orderStatus !== "delivered") {
      return res.status(400).json({
        message: "You can review a product after delivery",
      });
    }

    const purchasedItem = order.items.find(
      (item) => item.product.toString() === productId
    );

    if (!purchasedItem) {
      return res.status(403).json({
        message: "You can only review products you purchased",
      });
    }

    const existingReview = await Review.findOne({
      user: req.user.userId,
      product: productId,
    });

    if (existingReview) {
      return res.status(409).json({
        message: "You have already reviewed this product",
      });
    }

    let review;

    try {
      review = await Review.create({
        user: req.user.userId,
        product: productId,
        order: orderId,
        rating,
        comment: comment.trim(),
        verifiedPurchase: true,
      });
    } catch (error) {
      // Unique (user, product) index hit by a simultaneous request
      if (error.code === 11000) {
        return res.status(409).json({
          message: "You have already reviewed this product",
        });
      }

      throw error;
    }

    res.status(201).json({
      message: "Review created successfully",
      review,
    });
  } catch (error) {
    next(error);
  }
};

const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const pagination = parsePagination(req.query, {
      defaultLimit: 10,
      maxLimit: 50,
    });

    const filter = { product: productId, isApproved: true };

    const [reviews, total, stats] = await Promise.all([
      Review.find(filter)
        .populate("user", "name")
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Review.countDocuments(filter),
      Review.aggregate([
        {
          $match: {
            product: new mongoose.Types.ObjectId(productId),
            isApproved: true,
          },
        },
        { $group: { _id: null, average: { $avg: "$rating" } } },
      ]),
    ]);

    res.status(200).json({
      reviews,
      summary: {
        count: total,
        averageRating: stats.length
          ? Math.round(stats[0].average * 10) / 10
          : 0,
      },
      pagination: buildPagination(pagination, total),
    });
  } catch (error) {
    next(error);
  }
};

const getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({
      user: req.user.userId,
    })
      .populate("product", "name slug images")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

const updateReview = async (req, res, next) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    const { rating, comment } = req.body;

    if (rating !== undefined) {
      if (!isValidRating(rating)) {
        return res.status(400).json({
          message: "Rating must be a whole number between 1 and 5",
        });
      }

      review.rating = rating;
    }

    if (comment !== undefined) {
      if (typeof comment !== "string" || !comment.trim()) {
        return res.status(400).json({
          message: "Comment cannot be empty",
        });
      }

      review.comment = comment.trim();
    }

    await review.save();

    res.status(200).json({
      message: "Review updated successfully",
      review,
    });
  } catch (error) {
    next(error);
  }
};

const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

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
  createReview,
  getProductReviews,
  getMyReviews,
  updateReview,
  deleteReview,
};
