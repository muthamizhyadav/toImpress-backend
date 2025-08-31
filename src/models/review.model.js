const mongoose = require('mongoose');
const { v4 } = require('uuid');
const { toJSON, paginate } = require('./plugins');

const reviewSchema = mongoose.Schema(
  {
    _id: {
      type: String,
      default: v4,
    },
    user: {
      type: String,
      ref: 'User',
      required: true,
    },
    product: {
      type: String,
      ref: 'Product',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    images: {
      type: Array,
      default: [],
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    // For tracking who found the review helpful
    helpfulVotes: [{
      user: {
        type: String,
        ref: 'User',
      },
      votedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // For tracking reports
    reports: [{
      user: {
        type: String,
        ref: 'User',
      },
      reason: {
        type: String,
        enum: ['spam', 'inappropriate', 'fake', 'offensive', 'other'],
        required: true,
      },
      description: {
        type: String,
        trim: true,
      },
      reportedAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Add plugin that converts mongoose to json
reviewSchema.plugin(toJSON);
reviewSchema.plugin(paginate);

// Index for better query performance
reviewSchema.index({ product: 1, user: 1 }, { unique: true }); // One review per user per product
reviewSchema.index({ product: 1, status: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });

// Update helpful count when helpfulVotes change
reviewSchema.pre('save', function (next) {
  if (this.helpfulVotes) {
    this.helpfulCount = this.helpfulVotes.length;
  }
  if (this.reports) {
    this.reportCount = this.reports.length;
  }
  next();
});

// Static method to calculate average rating for a product
reviewSchema.statics.calculateAverageRating = async function (productId) {
  const result = await this.aggregate([
    {
      $match: {
        product: productId,
        status: 'approved',
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingBreakdown: {
          $push: '$rating',
        },
      },
    },
  ]);

  if (result.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const data = result[0];
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  data.ratingBreakdown.forEach(rating => {
    breakdown[rating] = (breakdown[rating] || 0) + 1;
  });

  return {
    averageRating: Math.round(data.averageRating * 100) / 100,
    totalReviews: data.totalReviews,
    ratingBreakdown: breakdown,
  };
};

// Static method to get review statistics
reviewSchema.statics.getReviewStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const overallStats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
      },
    },
  ]);

  return {
    byStatus: stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {}),
    overall: overallStats[0] || { totalReviews: 0, averageRating: 0 },
  };
};

/**
 * @typedef Review
 */
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
