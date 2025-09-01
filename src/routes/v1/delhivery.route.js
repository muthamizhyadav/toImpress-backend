const express = require('express');
const validate = require('../../middlewares/validate');
const { delhiveryValidation } = require('../../validations');
const { delhiveryController } = require('../../controllers');

const router = express.Router();

router.post(
  '/shipment',
  delhiveryController.createShipment
);

router.get(
  '/track',
  validate(delhiveryValidation.trackShipment),
  delhiveryController.trackShipment
);

module.exports = router;
