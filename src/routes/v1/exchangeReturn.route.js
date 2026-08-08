const express = require('express');
const multer = require('multer');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { exchangeReturnValidation } = require('../../validations');
const { exchangeReturnController } = require('../../controllers');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Exchange routes
router
  .route('/exchanges')
  .post(auth(), validate(exchangeReturnValidation.createExchange), exchangeReturnController.createExchange)
  .get(auth(), validate(exchangeReturnValidation.getMyExchanges), exchangeReturnController.getMyExchanges);

router.route('/exchanges/my-requests').get(auth(), validate(exchangeReturnValidation.getMyExchanges), exchangeReturnController.getMyExchanges);

router
  .route('/exchanges/:id')
  .get(auth(), validate(exchangeReturnValidation.getExchange), exchangeReturnController.getExchange)
  .patch(auth('manageOrders'), validate(exchangeReturnValidation.updateExchangeStatus), exchangeReturnController.updateExchangeStatus);

router
  .route('/exchanges/:id/pay')
  .post(auth(), validate(exchangeReturnValidation.payExchangeCharge), exchangeReturnController.payExchangeCharge);

// Return routes
router
  .route('/returns')
  .post(auth(), validate(exchangeReturnValidation.createReturn), exchangeReturnController.createReturn)
  .get(auth(), validate(exchangeReturnValidation.getMyReturns), exchangeReturnController.getMyReturns);

router.route('/returns/my-requests').get(auth(), validate(exchangeReturnValidation.getMyReturns), exchangeReturnController.getMyReturns);

router
  .route('/returns/:id')
  .get(auth(), validate(exchangeReturnValidation.getReturn), exchangeReturnController.getReturn)
  .patch(auth('manageOrders'), validate(exchangeReturnValidation.updateReturnStatus), exchangeReturnController.updateReturnStatus);

// File upload route
router
  .route('/upload/images')
  .post(auth(), upload.array('images', 5), exchangeReturnController.uploadImages);

module.exports = router;
