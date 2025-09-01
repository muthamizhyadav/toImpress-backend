const express = require('express');
const validate = require('../../middlewares/validate');
const { paymentValidation } = require('../../validations');
const { paymentController } = require('../../controllers');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.post(
  '/razorpay/order',
  auth(),
  validate(paymentValidation.createRazorpayOrder),
  paymentController.createRazorpayOrder
);

router.post(
  '/razorpay/verify',
  validate(paymentValidation.verifyRazorpaySignature),
  paymentController.verifyRazorpaySignature
);

module.exports = router;
