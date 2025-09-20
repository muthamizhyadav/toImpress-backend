const Joi = require('joi');
const { objectId } = require('./custom.validation');

const addToCart = {
  body: Joi.object().keys({
    productId: Joi.string().custom(objectId).required(),
    quantity: Joi.number().integer().min(1).default(1),
    selectedColor: Joi.string().optional(),
    selectedSize: Joi.string().optional(),
    selectedImage: Joi.string().optional(),
  }),
};

const updateCartItem = {
  params: Joi.object().keys({
    itemId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    quantity: Joi.number().integer().min(1).required(),
    selectedColor: Joi.string().optional(),
    selectedSize: Joi.string().optional(),
  }),
};

const removeFromCart = {
  params: Joi.object().keys({
    itemId: Joi.string().custom(objectId).required(),
  }),
};

const getCart = {
  query: Joi.object().keys({
    populate: Joi.string(),
  }),
};

module.exports = {
  addToCart,
  updateCartItem,
  removeFromCart,
  getCart,
};