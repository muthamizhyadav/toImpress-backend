const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const cartService = require('../services/cart.service');

const addToCart = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const cartData = req.body;
  const { productId, quantity = 1, selectedColor, selectedSize } = cartData;

  // Get cart before the operation to compare
  const cartBefore = await cartService.getCart(userId);
  let existingItem;

  if (cartBefore?.length) {
    existingItem = cartBefore?.items?.find(
      (item) =>
        item?.product.toString() === productId &&
        item?.selectedColor === selectedColor &&
        item?.selectedSize === selectedSize
    );
  }

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

  // Check if quantity is 0 (item should be removed)
  const isRemovingItem = updateData.quantity === 0;

  const cart = await cartService.updateCartItem(userId, itemId, updateData);
  res.status(httpStatus.OK).send({
    success: true,
    message: isRemovingItem ? 'Item removed from cart successfully' : 'Cart item updated successfully',
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
