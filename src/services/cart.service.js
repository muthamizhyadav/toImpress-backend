const httpStatus = require('http-status');
const { Cart, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const { log } = require('../config/logger');

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

  // If there's an existing cart entry for this user and product, we'll increment quantity
  let cart = await Cart.findOne({ user: userId, product: productId });

  if (!cart) {
    // Validate stock for new cart entry
    if (quantity > 0 && product.stockQuantity < quantity) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient stock');
    }

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
    // Existing cart for same product: add to quantity instead of overwriting
    if (cart.product && cart.product.toString() === productId) {
      const newQty = (cart.itemqty || 0) + quantity;

      if (quantity === 0) {
        await cart.deleteOne();
        return null;
      }

      // Validate stock against cumulative quantity
      if (product.stockQuantity < newQty) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient stock for requested quantity');
      }

      cart.itemqty = newQty;
      // Preserve original selectedSize unless user explicitly provides one
      cart.selectedSize = selectedSize || cart.selectedSize;
      cart.subtotal = (product.salePrice || product.price) * cart.itemqty;
    } else {
      // If cart belongs to the user but for a different product, replace only when quantity > 0
      if (quantity > 0) {
        if (product.stockQuantity < quantity) {
          throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient stock');
        }
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
                $and: [{ $in: ['$$productId', '$products'] }, { $eq: ['$isActive', true] }],
              },
            },
          },
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
          $ifNull: ['$availableCoupons.discount', null],
        },
        couponOfferDiscount: {
          $ifNull: ['$availableCoupons.offerDiscount', null],
        },
        couponType: {
          $ifNull: ['$availableCoupons.type', null],
        },
        isOfferAvailable: {
          $cond: {
            if: {
              $and: [{ $ne: ['$availableCoupons', null] }, { $ne: [{ $ifNull: ['$availableCoupons.type', null] }, null] }],
            },
            then: true,
            else: false,
          },
        },
        discountPercentage: {
          $cond: [
            { $gt: ['$productDetails.price', 0] },
            {
              $multiply: [
                {
                  $divide: [
                    {
                      $subtract: ['$productDetails.price', '$productDetails.salePrice'],
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

  let couponsProduct = cart.filter((item) => item.isOfferAvailable);
  let allProduct = cart.length > 0? cart.reduce((sum, item) => sum + (item.salePrice * item.itemqty), 0):0;

  let totalSalesPrice = couponsProduct.length > 0 ? couponsProduct.reduce((acc, item) => {
    const price = Number(item.salePrice * item.itemqty) || 0;
    return acc + price;
  }, 0) : 0;

  let couponAmount = couponsProduct.length > 0 ? couponsProduct[0].couponDiscount : 0
  let type = couponsProduct?.length ? couponsProduct[0].couponType : null
  let discountvalue = couponsProduct?.length ? couponsProduct[0].couponOfferDiscount : null

  let isDiscountApplicable = couponsProduct.length >0 ? totalSalesPrice >= couponAmount:false;
  let discountedAmount = 0;
  let minusValue = 0;


  if(isDiscountApplicable){
  if (type === 'percentage' && totalSalesPrice >= couponAmount ) {
    const discountPercent = parseFloat(discountvalue) / 100;
    const calculatedDiscount = totalSalesPrice * discountPercent;
    const discount = Math.min(calculatedDiscount, couponAmount);
    discountedAmount = totalSalesPrice - discount;
    minusValue = discount;
  } else if (couponAmount > 0 && totalSalesPrice > couponAmount) {
    discountedAmount = totalSalesPrice - couponAmount;
    minusValue = couponAmount;
  }
  } else {
    discountedAmount = allProduct
  }

  return { data: cart, couponsProduct, totalSalesPrice, couponAmount, type, discountvalue, isDiscountApplicable, finalAmount:discountedAmount, minusValue };
};

module.exports = {
  getCartByUserId,
  addToCart,
  updateCart,
  removeFromCart,
  clearCart,
  getCart,
};
