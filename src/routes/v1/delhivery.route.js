const express = require('express');
const validate = require('../../middlewares/validate');
const { delhiveryValidation } = require('../../validations');
const { delhiveryController } = require('../../controllers');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.post(
  '/shipment',
  auth(),
  delhiveryController.createShipment
);

router.get(
  '/warehouses',
  delhiveryController.getWarehouses
);

router.post(
  '/test-json',
  delhiveryController.testJsonParsing
);

router.get(
  '/test-api',
  delhiveryController.testApiConnectivity
);

router.post(
  '/test-minimal',
  delhiveryController.testMinimalShipment
);

router.get(
  '/track',
  delhiveryController.trackShipment
);

router.get(
  '/orders',
  delhiveryController.getOrders
);

module.exports = router;
