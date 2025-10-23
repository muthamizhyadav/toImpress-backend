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
  const { productId, quantity, selectedSize, selectedColor } = productData;
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  const getColorImages = (color) => {
    return product.colorData?.[color]?.images || [];
  };
  const redImages = getColorImages(selectedColor);


  const query = { user: userId, product: productId };
  if (typeof selectedColor !== 'undefined' && selectedColor !== null) {
    query.selectedColor = selectedColor;
  } else {
    query.$or = [{ selectedColor: { $exists: false } }, { selectedColor: null }, { selectedColor: '' }];
  }

  if (typeof selectedSize !== 'undefined' && selectedSize !== null) {
    query.selectedSize = selectedSize;
  } else {
    query.$or = query.$or || [];
    query.$or.push({ selectedSize: { $exists: false } }, { selectedSize: null }, { selectedSize: '' });
  }

  let cart = await Cart.findOne(query);

  if (!cart) {
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
        selectedColor,
        price: product.price,
        subtotal,
        image: redImages?.length>0 ?redImages[0]: product.images?.[0],
      });
    }
  } else {
    if (cart.product && cart.product.toString() === productId) {
      const newQty = quantity;

      if (quantity === 0) {
        await cart.deleteOne();
        return null;
      }

      if (product.stockQuantity < newQty) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient stock for requested quantity');
      }

      cart.itemqty = newQty;
      cart.selectedSize = selectedSize || cart.selectedSize;
      cart.selectedColor = selectedColor || cart.selectedColor;
      cart.subtotal = (product.salePrice || product.price) * cart.itemqty;
    } else {
      if (quantity > 0) {
        if (product.stockQuantity < quantity) {
          throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient stock');
        }
        const subtotal = (product.salePrice || product.price) * quantity;
        cart.product = productId;
        cart.itemqty = quantity;
        cart.selectedSize = selectedSize;
        cart.selectedColor = selectedColor;
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

  return cart;
};

const updateCart = async (userId, updateData) => {
  const { quantity, selectedSize, productId } = updateData;

  // Build query to find the correct cart item. Prefer explicit productId+size when provided.
  const buildQuery = () => {
    if (productId) {
      const q = { user: userId, product: productId };
      if (typeof selectedSize !== 'undefined' && selectedSize !== null) q.selectedSize = selectedSize;
      else q.$or = [{ selectedSize: { $exists: false } }, { selectedSize: null }, { selectedSize: '' }];
      return q;
    }
    return { user: userId };
  };

  let cart;
  if (productId) {
    cart = await Cart.findOne(buildQuery());
  } else {
    // If no productId provided and user has multiple cart items, require identifier
    const count = await Cart.countDocuments({ user: userId });
    if (count > 1) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Multiple cart items found. Provide productId and selectedSize to update a specific item'
      );
    }
    cart = await Cart.findOne({ user: userId });
  }

  if (!cart) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cart item not found');
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

const removeFromCart = async (userId, data = {}) => {
  const { productId, selectedSize } = data;

  // If productId provided, delete that specific item (size-aware)
  if (productId) {
    const query = { user: userId, product: productId };
    if (typeof selectedSize !== 'undefined' && selectedSize !== null) query.selectedSize = selectedSize;
    else query.$or = [{ selectedSize: { $exists: false } }, { selectedSize: null }, { selectedSize: '' }];

    const cart = await Cart.findOne(query);
    if (!cart) throw new ApiError(httpStatus.NOT_FOUND, 'Cart item not found');
    await cart.deleteOne();
    return null;
  }

  // If no productId provided and multiple items exist, ask for identifier
  const count = await Cart.countDocuments({ user: userId });
  if (count > 1) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Multiple cart items found. Provide productId and selectedSize to remove a specific item'
    );
  }

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
                  { $eq: ['$isActive', true] },
                ],
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
        selectedColor: 1,
        itemqty: 1,
        price: '$productDetails.price',
        salePrice: '$productDetails.salePrice',
        image: 1,
        product: 1,
        couponDiscount: { $ifNull: ['$availableCoupons.discount', null] },
        couponOfferDiscount: { $ifNull: ['$availableCoupons.offerDiscount', null] },
        couponType: { $ifNull: ['$availableCoupons.type', null] },
        isOfferAvailable: {
          $cond: {
            if: {
              $and: [
                { $ne: ['$availableCoupons', null] },
                { $ne: [{ $ifNull: ['$availableCoupons.type', null] }, null] },
              ],
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
                    { $subtract: ['$productDetails.price', '$productDetails.salePrice'] },
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
    {
      $match: { product: { $ne: null } },
    },
    // 👇 NEW STAGE: Group same products together
    {
      $group: {
        _id: '$product', // group by product ID
        productName: { $first: '$productName' },
        selectedSize: { $first: '$selectedSize' },
        selectedColor: { $first: '$selectedColor' },
        price: { $first: '$price' },
        salePrice: { $first: '$salePrice' },
        image: { $first: '$image' },
        couponDiscount: { $first: '$couponDiscount' },
        couponOfferDiscount: { $first: '$couponOfferDiscount' },
        couponType: { $first: '$couponType' },
        isOfferAvailable: { $first: '$isOfferAvailable' },
        discountPercentage: { $first: '$discountPercentage' },
        itemqty: { $first: '$itemqty' },
      },
    },
  ]);

  // --------------------------
  // After aggregation, do calculations
  // --------------------------

  let couponsProduct = cart.filter((item) => item.isOfferAvailable);
  let allProduct = cart.length > 0 ? cart.reduce((sum, item) => sum + item.salePrice * item.itemqty, 0) : 0;

  let totalSalesPrice =
    couponsProduct.length > 0
      ? couponsProduct.reduce((acc, item) => {
          const price = Number(item.salePrice * item.itemqty) || 0;
          return acc + price;
        }, 0)
      : 0;

  let totalPrice =
    cart.length > 0
      ? cart.reduce((acc, item) => {
          const price = Number(item.salePrice * item.itemqty) || 0;
          return acc + price;
        }, 0)
      : 0;

  let couponAmount = couponsProduct.length > 0 ? couponsProduct[0].couponDiscount : 0;
  let type = couponsProduct?.length ? couponsProduct[0].couponType : null;
  let discountvalue = couponsProduct?.length ? couponsProduct[0].couponOfferDiscount : null;

  let isDiscountApplicable = couponsProduct.length > 0 ? totalSalesPrice >= couponAmount : false;
  let discountedAmount = 0;
  let minusValue = 0;

  if (isDiscountApplicable) {
    if (type === 'percentage' && totalSalesPrice >= couponAmount) {
      const discountPercent = parseFloat(discountvalue) / 100;
      const calculatedDiscount = totalSalesPrice * discountPercent;
      const discount = Math.min(calculatedDiscount, couponAmount);
      discountedAmount = totalPrice - discount;
      minusValue = discount;
    } else if (couponAmount > 0 && totalSalesPrice > couponAmount) {
      discountedAmount = totalPrice - couponAmount;
      minusValue = couponAmount;
    }
  } else {
    discountedAmount = allProduct;
  }

  const totalAmt = Math.round(discountedAmount);
  const gst = Math.round(parseFloat((totalAmt * 0.05).toFixed(2)));

  return {
    data: cart,
    couponsProduct,
    totalSalesPrice: totalPrice,
    couponAmount,
    type,
    discountvalue,
    isDiscountApplicable,
    finalAmount: totalAmt,
    minusValue,
    gst: 0,
  };
};

module.exports = {
  getCartByUserId,
  addToCart,
  updateCart,
  removeFromCart,
  clearCart,
  getCart,
};
