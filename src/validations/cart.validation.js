const Joi = require('joi');
const { objectId } = require('./custom.validation');

const addToCart = {
  body: Joi.object().keys({
    productId: Joi.string().required(),
    quantity: Joi.number().integer().min(0).default(1),
    selectedColor: Joi.string().optional(),
    selectedSize: Joi.string().optional(),
    selectedImage: Joi.string().optional(),
  }),
};

const updateCartItem = {
  body: Joi.object().keys({
    quantity: Joi.number().integer().min(0).required(),
    selectedSize: Joi.string().optional(),
  }),
};

const removeFromCart = {
  // No parameters needed since we're removing the current cart item
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