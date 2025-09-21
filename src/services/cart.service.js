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

  let cart = await Cart.findOne({ user: userId, product: productId });

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
        await cart.deleteOne();
        return null;
      } else {
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
        await cart.deleteOne();
        return null;
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
    await cart.deleteOne();
    return null;
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

  await cart.deleteOne();

  return null;
};

const clearCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found');
  }

  await cart.deleteOne();

  return null;
};

const getCart = async (userId) => {
  let cart = await Cart.aggregate([
    {
      $match: { user: userId },
    },
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'productDetails',
      },
    },
    {
      $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: 'coupons',
        let: { productId: '$product' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ['$$productId', '$products'] },
                  { $eq: ['$isActive', true] }
                ]
              }
            }
          }
        ],
        as: 'availableCoupons',
      },
    },
    {
      $unwind: { path: '$availableCoupons', preserveNullAndEmptyArrays: true },
    },

    {
      $project: {
        _id: 1,
        productName: '$productDetails.productTitle',
        selectedSize: 1,
        itemqty: 1,
        price: '$productDetails.price',
        salePrice: '$productDetails.salePrice',
        image: 1,
        product: 1,
        couponDiscount: {
          $ifNull: ['$availableCoupons.discount', null]
        },
        couponOfferDiscount: {
          $ifNull: ['$availableCoupons.offerDiscount', null]
        },
        couponType: {
          $ifNull: ['$availableCoupons.type', null]
        },
        isOfferAvailable: {
          $cond: {
            if: {
              $and: [
                { $ne: ['$availableCoupons', null] },
                { $ne: [ { $ifNull: ['$availableCoupons.type', null] }, null ] }
              ]
            },
            then: true,
            else: false
          }
        },
        discountPercentage: {
          $cond: [
            { $gt: ['$productDetails.price', 0] },
            {
              $multiply: [
                {
                  $divide: [
                    {
                      $subtract: [
                        '$productDetails.price',
                        '$productDetails.salePrice',
                      ],
                    },
                    '$productDetails.price',
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
  ]);

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
