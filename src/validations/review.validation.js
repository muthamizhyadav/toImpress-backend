const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createReview = {
  params: Joi.object().keys({
    productId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().required().max(100),
    comment: Joi.string().required().max(1000),
    images: Joi.array().items(Joi.string()),
  }),
};

const getProductReviews = {
  params: Joi.object().keys({
    productId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    rating: Joi.number().integer().min(1).max(5),
    verified: Joi.string().valid('true', 'false'),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getAllReviews = {
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'approved', 'rejected'),
    rating: Joi.number().integer().min(1).max(5),
    productId: Joi.string().custom(objectId),
    userId: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getUserReviews = {
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'approved', 'rejected'),
    rating: Joi.number().integer().min(1).max(5),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getReview = {
  params: Joi.object().keys({
    reviewId: Joi.string().custom(objectId).required(),
  }),
};

const updateReview = {
  params: Joi.object().keys({
    reviewId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      rating: Joi.number().integer().min(1).max(5),
      title: Joi.string().max(100),
      comment: Joi.string().max(1000),
      images: Joi.array().items(Joi.string()),
      status: Joi.string().valid('pending', 'approved', 'rejected'), // Admin only
      adminNotes: Joi.string().max(500), // Admin only
    })
    .min(1),
};

const deleteReview = {
  params: Joi.object().keys({
    reviewId: Joi.string().custom(objectId).required(),
  }),
};

const markHelpful = {
  params: Joi.object().keys({
    reviewId: Joi.string().custom(objectId).required(),
  }),
};

const removeHelpful = {
  params: Joi.object().keys({
    reviewId: Joi.string().custom(objectId).required(),
  }),
};

const reportReview = {
  params: Joi.object().keys({
    reviewId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    reason: Joi.string().valid('spam', 'inappropriate', 'fake', 'offensive', 'other').required(),
    description: Joi.string().max(500),
  }),
};

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
};
