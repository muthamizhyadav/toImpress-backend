const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { reviewValidation } = require('../../validations');
const { reviewController } = require('../../controllers');
const multer = require('multer');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router
  .route('/product/:productId')
  .post(auth(), validate(reviewValidation.createReview), reviewController.createReview)
  .get(validate(reviewValidation.getProductReviews), reviewController.getProductReviews);

// User's own reviews
router
  .route('/my-reviews')
  .get(auth(), validate(reviewValidation.getUserReviews), reviewController.getUserReviews);

// Admin routes for all reviews
router
  .route('/')
  .get(auth('getReviews'), validate(reviewValidation.getAllReviews), reviewController.getAllReviews);

// Review statistics (admin only)
router
  .route('/stats')
  .get(auth('manageReviews'), reviewController.getReviewStats);

// Individual review operations
router
  .route('/:reviewId')
  .get(auth(), validate(reviewValidation.getReview), reviewController.getReview)
  .patch(auth('manageOwnReviews'), validate(reviewValidation.updateReview), reviewController.updateReview)
  .delete(auth('manageOwnReviews'), validate(reviewValidation.deleteReview), reviewController.deleteReview);

// Review interactions
router
  .route('/:reviewId/helpful')
  .post(auth(), validate(reviewValidation.markHelpful), reviewController.markHelpful)
  .delete(auth(), validate(reviewValidation.removeHelpful), reviewController.removeHelpful);

// Report review
router
  .route('/:reviewId/report')
  .post(auth(), validate(reviewValidation.reportReview), reviewController.reportReview);

// File upload for review images
router
  .route('/upload/images')
  .post(auth(), upload.array('images', 5), async (req, res) => {
    // This would handle image upload to your storage service
    // For now, return mock URLs
    const imageUrls = req.files.map((file, index) => `https://example.com/review-images/${Date.now()}-${index}.jpg`);
    res.json({
      success: true,
      message: 'Images uploaded successfully',
      data: { images: imageUrls },
    });
  });

module.exports = router;
