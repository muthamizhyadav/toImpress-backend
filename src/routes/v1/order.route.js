const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { orderValidation } = require('../../validations');
const { orderController } = require('../../controllers');

const router = express.Router();

router
  .route('/')
  .post(auth('createOrder'), validate(orderValidation.createOrder), orderController.createOrder)
  .get(auth('getOrders'), validate(orderValidation.getOrders), orderController.getOrders);

router
  .route('/my-orders')
  .get(auth(), validate(orderValidation.getUserOrders), orderController.getUserOrders);

router
  .route('/stats')
  .get(auth('manageOrders'), orderController.getOrderStats);

router
  .route('/:id')
  .get(auth('getOrders'), validate(orderValidation.getOrder), orderController.getOrder)
  .patch(auth('manageOrders'), validate(orderValidation.updateOrder), orderController.updateOrder)
  .delete(auth('manageOrders'), validate(orderValidation.deleteOrder), orderController.deleteOrder);

module.exports = router;
