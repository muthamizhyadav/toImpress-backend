const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const cartService = require('../services/cart.service');

const addToCart = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const cartData = req.body;
  const cart = await cartService.addToCart(userId, cartData);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Item added to cart successfully',
    data: cart,
  });
});

const getCart = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const cart = await cartService.getCart(userId);
  res.status(httpStatus.OK).send({
    success: true,
    data: cart,
  });
});

const updateCartItem = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { itemId } = req.params;
  const updateData = req.body;
  const cart = await cartService.updateCartItem(userId, itemId, updateData);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Cart item updated successfully',
    data: cart,
  });
});

const removeFromCart = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { itemId } = req.params;
  const cart = await cartService.removeFromCart(userId, itemId);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Item removed from cart successfully',
    data: cart,
  });
});

const clearCart = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const cart = await cartService.clearCart(userId);
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Cart cleared successfully',
    data: cart,
  });
});

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};