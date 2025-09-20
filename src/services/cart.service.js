const httpStatus = require('http-status');
const { Cart, Product } = require('../models');
const ApiError = require('../utils/ApiError');

const getCartByUserId = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate('product');
  if (!cart) {
    cart = await Cart.create({ user: userId, product: null, itemqty: 0, totalAmount: 0 });
  }
  return cart;
};

const addToCart = async (userId, productData) => {
  const { productId, quantity = 1, selectedSize } = productData;

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  if (quantity > 0 && product.stockQuantity < quantity) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient stock');
  }

  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    if (quantity > 0) {
      const subtotal = (product.salePrice || product.price) * quantity;
      cart = await Cart.create({
        user: userId,
        product: productId,
        itemqty: quantity,
        selectedSize,
        price: product.price,
        subtotal,
        image: product.images?.[0] || '',
      });
    } else {
      cart = await Cart.create({ user: userId, product: null, itemqty: 0, totalAmount: 0 });
    }
  } else {
    if (cart.product && cart.product.toString() === productId) {
      if (quantity === 0) {
        cart.product = null;
        cart.itemqty = 0;
        cart.selectedSize = null;
        cart.price = 0;
        cart.subtotal = 0;
        cart.image = '';
      } else {
        // Set quantity instead of adding to existing quantity
        if (product.stockQuantity < quantity) {
          throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient stock for requested quantity');
        }

        cart.itemqty = quantity;
        cart.selectedSize = selectedSize || cart.selectedSize;
        cart.subtotal = (product.salePrice || product.price) * quantity;
      }
    } else {
      if (quantity > 0) {
        const subtotal = (product.salePrice || product.price) * quantity;
        cart.product = productId;
        cart.itemqty = quantity;
        cart.selectedSize = selectedSize;
        cart.price = product.price;
        cart.subtotal = subtotal;
        cart.image = product.images?.[0] || '';
      } else {
        cart.product = null;
        cart.itemqty = 0;
        cart.selectedSize = null;
        cart.price = 0;
        cart.subtotal = 0;
        cart.image = '';
      }
    }

    await cart.save();
  }

  return cart.product ? await cart.populate('product') : cart;
};

const updateCart = async (userId, updateData) => {
  const { quantity, selectedSize } = updateData;

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found');
  }

  if (!cart.product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No product in cart');
  }

  // If quantity is 0, remove the product from cart
  if (quantity === 0) {
    cart.product = null;
    cart.itemqty = 0;
    cart.selectedSize = null;
    cart.price = 0;
    cart.subtotal = 0;
    cart.image = '';
    await cart.save();
    return cart.product ? await cart.populate('product') : cart;
  }

  const product = await Product.findById(cart.product);

  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  // Check stock availability
  if (product.stockQuantity < quantity) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient stock');
  }

  // Update cart
  cart.itemqty = quantity;
  cart.selectedSize = selectedSize || cart.selectedSize;
  cart.subtotal = (product.salePrice || product.price) * quantity;

  await cart.save();
  return cart.product ? await cart.populate('product') : cart;
};

const removeFromCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found');
  }

  cart.product = null;
  cart.itemqty = 0;
  cart.selectedSize = null;
  cart.price = 0;
  cart.subtotal = 0;
  cart.image = '';
  await cart.save();

  return cart;
};

const clearCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found');
  }

  cart.product = null;
  cart.itemqty = 0;
  cart.selectedSize = null;
  cart.price = 0;
  cart.subtotal = 0;
  cart.image = '';
  cart.totalAmount = 0;
  await cart.save();

  return cart;
};

const getCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    return await Cart.create({ user: userId, product: null, itemqty: 0, totalAmount: 0 });
  }
  
  // Only populate if there's a product
  if (cart.product) {
    cart = await Cart.findOne({ user: userId }).populate('product');
  }
  
  return cart;
};

module.exports = {
  getCartByUserId,
  addToCart,
  updateCart,
  removeFromCart,
  clearCart,
  getCart,
};