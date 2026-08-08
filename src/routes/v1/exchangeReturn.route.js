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

router
  .route('/exchanges/my-requests')
  .get(auth(), validate(exchangeReturnValidation.getMyExchanges), exchangeReturnController.getMyExchanges);

router
  .route('/exchanges/:id')
  .get(auth(), validate(exchangeReturnValidation.getExchange), exchangeReturnController.getExchange)
  .patch(
    auth('manageOrders'),
    validate(exchangeReturnValidation.updateExchangeStatus),
    exchangeReturnController.updateExchangeStatus
  );

router
  .route('/exchanges/:id/pay')
  .post(auth(), validate(exchangeReturnValidation.payExchangeCharge), exchangeReturnController.payExchangeCharge);

// Return routes
router
  .route('/returns')
  .post(auth(), validate(exchangeReturnValidation.createReturn), exchangeReturnController.createReturn)
  .get(auth(), validate(exchangeReturnValidation.getMyReturns), exchangeReturnController.getMyReturns);

router
  .route('/returns/my-requests')
  .get(auth(), validate(exchangeReturnValidation.getMyReturns), exchangeReturnController.getMyReturns);

router
  .route('/returns/:id')
  .get(auth(), validate(exchangeReturnValidation.getReturn), exchangeReturnController.getReturn)
  .patch(
    auth('manageOrders'),
    validate(exchangeReturnValidation.updateReturnStatus),
    exchangeReturnController.updateReturnStatus
  );

// File upload route
router.route('/upload/images').post(auth(), upload.array('images', 5), exchangeReturnController.uploadImages);

// ===== Admin management endpoints (mounted at top-level /v1 for the admin panel) =====
const adminRouter = express.Router();

adminRouter
  .route('/exchange-requests')
  .get(
    auth('manageOrders'),
    validate(exchangeReturnValidation.getAdminRequests),
    exchangeReturnController.getAdminExchanges
  );

adminRouter
  .route('/exchange-requests/:id/status')
  .put(
    auth('manageOrders'),
    validate(exchangeReturnValidation.updateAdminExchangeStatus),
    exchangeReturnController.updateExchangeStatus
  );

adminRouter
  .route('/exchange-requests/:id/pickup')
  .post(
    auth('manageOrders'),
    validate(exchangeReturnValidation.adminExchangePickup),
    exchangeReturnController.scheduleExchangePickup
  );

adminRouter
  .route('/exchange-requests/:id/replacement')
  .post(
    auth('manageOrders'),
    validate(exchangeReturnValidation.adminDispatchReplacement),
    exchangeReturnController.dispatchReplacement
  );

adminRouter
  .route('/exchange-requests/:id/track')
  .get(
    auth('manageOrders'),
    validate(exchangeReturnValidation.adminExchangeTrack),
    exchangeReturnController.checkExchangeShipment
  );

adminRouter
  .route('/exchange-requests/:id/payment')
  .post(
    auth('manageOrders'),
    validate(exchangeReturnValidation.adminPayExchange),
    exchangeReturnController.adminPayExchange
  );

adminRouter
  .route('/return-requests')
  .get(auth('manageOrders'), validate(exchangeReturnValidation.getAdminRequests), exchangeReturnController.getAdminReturns);

adminRouter
  .route('/return-requests/:id/status')
  .put(
    auth('manageOrders'),
    validate(exchangeReturnValidation.updateAdminReturnStatus),
    exchangeReturnController.updateReturnStatus
  );

adminRouter
  .route('/return-requests/:id/refund')
  .post(
    auth('manageOrders'),
    validate(exchangeReturnValidation.adminProcessRefund),
    exchangeReturnController.adminProcessRefund
  );

adminRouter
  .route('/return-requests/:id/pickup')
  .post(
    auth('manageOrders'),
    validate(exchangeReturnValidation.adminExchangePickup),
    exchangeReturnController.scheduleReturnPickup
  );

adminRouter
  .route('/return-requests/:id/track')
  .get(
    auth('manageOrders'),
    validate(exchangeReturnValidation.adminExchangeTrack),
    exchangeReturnController.checkReturnShipment
  );

module.exports = router;
module.exports.adminExchangeReturnRouter = adminRouter;
