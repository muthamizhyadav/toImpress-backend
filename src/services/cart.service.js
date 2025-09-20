const httpStatus = require('http-status');
const { Cart, Product } = require('../models');
const ApiError = require('../utils/ApiError');

const getCartByUserId = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [], totalAmount: 0, itemCount: 0 });
  }
  return cart;
};

const addToCart = async (userId, productData) => {
  const { productId, quantity = 1, selectedColor, selectedSize } = productData;

  // Validate product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  // Check stock availability
  if (product.stockQuantity < quantity) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient stock');
  }

  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    // Create new cart
    const subtotal = (product.salePrice || product.price) * quantity;
    cart = await Cart.create({
      user: userId,
      items: [{
        product: productId,
        productTitle: product.productTitle,
        price: product.price,
        salePrice: product.salePrice,
        quantity,
        selectedColor,
        selectedSize,
        subtotal,
        image: product.images?.[0] || '',
      }],
    });
  } else {
    // Update existing cart
    const existingItemIndex = cart.items.findIndex(item =>
      item.product.toString() === productId &&
      item.selectedColor === selectedColor &&
      item.selectedSize === selectedSize
    );

    if (existingItemIndex > -1) {
      // Update quantity of existing item
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      if (product.stockQuantity < newQuantity) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient stock for requested quantity');
      }

      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].subtotal = (product.salePrice || product.price) * newQuantity;
    } else {
      // Add new item
      const subtotal = (product.salePrice || product.price) * quantity;
      cart.items.push({
        product: productId,
        productTitle: product.productTitle,
        price: product.price,
        salePrice: product.salePrice,
        quantity,
        selectedColor,
        selectedSize,
        subtotal,
        image: product.images?.[0] || '',
      });
    }

    await cart.save();
  }

  return await cart.populate('items.product');
};

const updateCartItem = async (userId, itemId, updateData) => {
  const { quantity, selectedColor, selectedSize } = updateData;

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found');
  }

  const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
  if (itemIndex === -1) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cart item not found');
  }

  const item = cart.items[itemIndex];
  const product = await Product.findById(item.product);

  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  // Check stock availability
  if (product.stockQuantity < quantity) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient stock');
  }

  // Update item
  cart.items[itemIndex].quantity = quantity;
  cart.items[itemIndex].selectedColor = selectedColor || item.selectedColor;
  cart.items[itemIndex].selectedSize = selectedSize || item.selectedSize;
  cart.items[itemIndex].subtotal = (product.salePrice || product.price) * quantity;

  await cart.save();
  return await cart.populate('items.product');
};

const removeFromCart = async (userId, itemId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found');
  }

  const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
  if (itemIndex === -1) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cart item not found');
  }

  cart.items.splice(itemIndex, 1);
  await cart.save();

  return await cart.populate('items.product');
};

const clearCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found');
  }

  cart.items = [];
  cart.totalAmount = 0;
  cart.itemCount = 0;
  await cart.save();

  return cart;
};

const getCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart) {
    return await Cart.create({ user: userId, items: [], totalAmount: 0, itemCount: 0 });
  }
  return cart;
};

module.exports = {
  getCartByUserId,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCart,
};