const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { reviewService } = require('../services');

const createReview = catchAsync(async (req, res) => {
  const review = await reviewService.createReview(req);
  res.status(httpStatus.CREATED).send({
    success: true,
    message: 'Review created successfully',
    data: review,
  });
});

const getProductReviews = catchAsync(async (req, res) => {
  const result = await reviewService.getProductReviews(req);
  res.status(httpStatus.OK).send(result);
});

const getAllReviews = catchAsync(async (req, res) => {
  const result = await reviewService.getAllReviews(req);
  res.status(httpStatus.OK).send(result);
});

const getUserReviews = catchAsync(async (req, res) => {
  const result = await reviewService.getUserReviews(req);
  res.status(httpStatus.OK).send(result);
});

const getReview = catchAsync(async (req, res) => {
  const review = await reviewService.getReviewById(req);
  res.status(httpStatus.OK).send({
    success: true,
    data: review,
  });
});

const updateReview = catchAsync(async (req, res) => {
  const review = await reviewService.updateReview(req);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Review updated successfully',
    data: review,
  });
});

const deleteReview = catchAsync(async (req, res) => {
  await reviewService.deleteReview(req);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Review deleted successfully',
  });
});

const markHelpful = catchAsync(async (req, res) => {
  const review = await reviewService.markHelpful(req);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Review marked as helpful',
    data: review,
  });
});

const removeHelpful = catchAsync(async (req, res) => {
  const review = await reviewService.removeHelpful(req);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Helpful vote removed',
    data: review,
  });
});

const reportReview = catchAsync(async (req, res) => {
  const result = await reviewService.reportReview(req);
  res.status(httpStatus.OK).send({
    success: true,
    message: result.message,
  });
});

const getReviewStats = catchAsync(async (req, res) => {
  const stats = await reviewService.getReviewStats();
  res.status(httpStatus.OK).send({
    success: true,
    data: stats,
  });
});

module.exports = {
  createReview,
  getProductReviews,
  getAllReviews,
  getUserReviews,
  getReview,
  updateReview,
  deleteReview,
  markHelpful,
  removeHelpful,
  reportReview,
  getReviewStats,
};
