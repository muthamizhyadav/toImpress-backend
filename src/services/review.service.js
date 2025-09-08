const httpStatus = require('http-status');
const { Review, Product, User, Order } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a review
 * @param {Object} reviewBody
 * @param {Object} user
 * @returns {Promise<Review>}
 */
const createReview = async (req) => {
  const { rating, title, comment, images } = req.body;
  const { productId } = req.params;
  const userId = req.user.id;

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  // Check if user has already reviewed this product
  const existingReview = await Review.findOne({ user: userId, product: productId });
  if (existingReview) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You have already reviewed this product');
  }

  // Check if user has purchased this product (verified purchase)
  const hasPurchased = await Order.findOne({
    user: userId,
    'items.product': productId,
    status: 'delivered',
  });

  const reviewData = {
    user: userId,
    product: productId,
    rating,
    title,
    comment,
    images: images || [],
    isVerifiedPurchase: !!hasPurchased,
    status: 'approved', // Auto-approve for now, can be changed to 'pending' for moderation
  };

  const review = await Review.create(reviewData);
  return await Review.findById(review._id)
    .populate('user', 'name')
    .populate('product', 'productTitle images');
};

/**
 * Get reviews for a product
 * @param {Object} req
 * @returns {Promise<Object>}
 */
const getProductReviews = async (req) => {
  const { productId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const filter = { product: productId, status: 'approved' };
  const sort = { createdAt: -1 };

  // Apply filters
  if (req.query.rating) {
    filter.rating = parseInt(req.query.rating);
  }
  if (req.query.verified === 'true') {
    filter.isVerifiedPurchase = true;
  }

  if (req.query.sortBy) {
    const sortFields = req.query.sortBy.split(':');
    sort[sortFields[0]] = sortFields[1] === 'desc' ? -1 : 1;
  }

  const reviews = await Review.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('user', 'name')
    .populate('product', 'productTitle images');

  const total = await Review.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  // Get rating statistics
  const ratingStats = await Review.calculateAverageRating(productId);

  return {
    success: true,
    data: reviews,
    statistics: ratingStats,
    pagination: {
      total,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

/**
 * Get all reviews (admin)
 * @param {Object} req
 * @returns {Promise<Object>}
 */
const getAllReviews = async (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const filter = {};
  const sort = { createdAt: -1 };

  // Apply filters
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.rating) {
    filter.rating = parseInt(req.query.rating);
  }
  if (req.query.productId) {
    filter.product = req.query.productId;
  }
  if (req.query.userId) {
    filter.user = req.query.userId;
  }

  if (req.query.sortBy) {
    const sortFields = req.query.sortBy.split(':');
    sort[sortFields[0]] = sortFields[1] === 'desc' ? -1 : 1;
  }

  const reviews = await Review.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('user', 'name email')
    .populate('product', 'productTitle images');

  const total = await Review.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data: reviews,
    pagination: {
      total,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

/**
 * Get user's reviews
 * @param {Object} req
 * @returns {Promise<Object>}
 */
const getUserReviews = async (req) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const filter = { user: userId };
  const sort = { createdAt: -1 };

  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.rating) {
    filter.rating = parseInt(req.query.rating);
  }

  const reviews = await Review.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('product', 'productTitle images');

  const total = await Review.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data: reviews,
    pagination: {
      total,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

/**
 * Get review by ID
 * @param {Object} req
 * @returns {Promise<Review>}
 */
const getReviewById = async (req) => {
  const { reviewId } = req.params;
  const review = await Review.findById(reviewId)
    .populate('user', 'name')
    .populate('product', 'productTitle images');

  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
  }

  // Check if user can access this review
  if (req.user.role !== 'admin' && review.user._id !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied');
  }

  return review;
};

/**
 * Update review
 * @param {Object} req
 * @returns {Promise<Review>}
 */
const updateReview = async (req) => {
  const { reviewId } = req.params;
  const updateBody = req.body;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
  }

  // Check permissions
  if (req.user.role !== 'admin' && review.user !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only update your own reviews');
  }

  // Users can only update certain fields
  if (req.user.role !== 'admin') {
    const allowedUpdates = ['rating', 'title', 'comment', 'images'];
    const updates = Object.keys(updateBody);
    const isValidUpdate = updates.every(update => allowedUpdates.includes(update));
    
    if (!isValidUpdate) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid updates for user');
    }
  }

  Object.assign(review, updateBody);
  await review.save();

  return await Review.findById(review._id)
    .populate('user', 'name')
    .populate('product', 'productTitle images');
};

/**
 * Delete review
 * @param {Object} req
 * @returns {Promise<Review>}
 */
const deleteReview = async (req) => {
  const { reviewId } = req.params;
  const review = await Review.findById(reviewId);
  
  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
  }

  // Check permissions
  if (req.user.role !== 'admin' && review.user !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only delete your own reviews');
  }

  await Review.findByIdAndDelete(reviewId);
  return review;
};

/**
 * Mark review as helpful
 * @param {Object} req
 * @returns {Promise<Review>}
 */
const markHelpful = async (req) => {
  const { reviewId } = req.params;
  const userId = req.user.id;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
  }

  // Check if user already voted
  const existingVote = review.helpfulVotes.find(vote => vote.user === userId);
  if (existingVote) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You have already marked this review as helpful');
  }

  review.helpfulVotes.push({ user: userId });
  await review.save();

  return await Review.findById(review._id)
    .populate('user', 'name')
    .populate('product', 'productTitle images');
};

/**
 * Remove helpful vote
 * @param {Object} req
 * @returns {Promise<Review>}
 */
const removeHelpful = async (req) => {
  const { reviewId } = req.params;
  const userId = req.user.id;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
  }

  review.helpfulVotes = review.helpfulVotes.filter(vote => vote.user !== userId);
  await review.save();

  return await Review.findById(review._id)
    .populate('user', 'name')
    .populate('product', 'productTitle images');
};

/**
 * Report review
 * @param {Object} req
 * @returns {Promise<Review>}
 */
const reportReview = async (req) => {
  const { reviewId } = req.params;
  const { reason, description } = req.body;
  const userId = req.user.id;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
  }

  // Check if user already reported this review
  const existingReport = review.reports.find(report => report.user === userId);
  if (existingReport) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You have already reported this review');
  }

  review.reports.push({
    user: userId,
    reason,
    description,
  });

  await review.save();
  return { message: 'Review reported successfully' };
};

/**
 * Get review statistics
 * @returns {Promise<Object>}
 */
const getReviewStats = async () => {
  return await Review.getReviewStats();
};

module.exports = {
  createReview,
  getProductReviews,
  getAllReviews,
  getUserReviews,
  getReviewById,
  updateReview,
  deleteReview,
  markHelpful,
  removeHelpful,
  reportReview,
  getReviewStats,
};
