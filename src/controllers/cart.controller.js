const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const cartService = require('../services/cart.service');

const addToCart = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const cartData = req.body;
  const { productId, quantity = 1, selectedSize } = cartData;

  const cartBefore = await cartService.getCart(userId);
  // cartService.getCart returns an object with `data` (array of items)
  const existingItem = Array.isArray(cartBefore?.data)
    ? cartBefore.data.some((it) => it.product && it.product.toString() === productId)
    : false;
  const cart = await cartService.addToCart(userId, cartData);
  let message = 'Item added to cart successfully';

  if (existingItem) {
    if (quantity === 0) {
      message = 'Item removed from cart successfully';
    } else {
      message = 'Cart item updated successfully';
    }
  } else if (quantity === 0) {
    message = 'No item added to cart';
  }

  res.status(httpStatus.OK).send({
    success: true,
    message,
    data: cart,
  });
});

const getCart = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await cartService.getCart(userId);
  res.status(httpStatus.OK).send(result);
});

const updateCart = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const updateData = req.body;

  // Check if quantity is 0 (item should be removed)
  const isRemovingItem = updateData.quantity === 0;

  const cart = await cartService.updateCart(userId, updateData);
  res.status(httpStatus.OK).send({
    success: true,
    message: isRemovingItem ? 'Item removed from cart successfully' : 'Cart item updated successfully',
    data: cart,
  });
});

const removeFromCart = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const cart = await cartService.removeFromCart(userId);
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
  updateCart,
  removeFromCart,
  clearCart,
};
