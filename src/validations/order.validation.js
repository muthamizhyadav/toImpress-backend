const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createOrder = {
  body: Joi.object().keys({
    items: Joi.array()
      .items(
        Joi.object().keys({
          product: Joi.string().custom(objectId).required(),
          quantity: Joi.number().integer().min(1).required(),
          selectedColor: Joi.string(),
          selectedSize: Joi.string(),
        })
      )
      .min(1)
      .required(),
    shippingAddress: Joi.alternatives().try(
      Joi.object().keys({
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        zipCode: Joi.string().required(),
        country: Joi.string().required(),
      }),
      Joi.array().items(
        Joi.object().keys({
          street: Joi.string().required(),
          city: Joi.string().required(),
          state: Joi.string().required(),
          zipCode: Joi.string().required(),
          country: Joi.string().required(),
        })
      )
    ).required(),
    billingAddress: Joi.alternatives().try(
      Joi.object().keys({
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        zipCode: Joi.string().required(),
        country: Joi.string().required(),
      }),
      Joi.array().items(
        Joi.object().keys({
          street: Joi.string().required(),
          city: Joi.string().required(),
          state: Joi.string().required(),
          zipCode: Joi.string().required(),
          country: Joi.string().required(),
        })
      )
    ),
    paymentMethod: Joi.string()
      .valid('credit_card', 'debit_card', 'paypal', 'stripe', 'cash_on_delivery')
      .required(),
    notes: Joi.string(),
    shippingCost: Joi.number().min(0),
    tax: Joi.number().min(0),
    discount: Joi.number().min(0),
  }),
};

const getOrders = {
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'),
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded'),
    userId: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getOrder = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).required(),
  }),
};

const updateOrder = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'),
      paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded'),
      trackingNumber: Joi.string(),
      notes: Joi.string(),
      estimatedDelivery: Joi.date(),
    })
    .min(1),
};

const deleteOrder = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId).required(),
  }),
};

const getUserOrders = {
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
  deleteOrder,
  getUserOrders,
};
