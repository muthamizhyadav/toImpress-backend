const httpStatus = require('http-status');
const { Cart, Product, Coupon, Category } = require('../models');
const { getBestCouponDiscount, getCategoryIdentifiers } = require('./coupon.service');
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
  const cart = await Cart.aggregate([
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
      $project: {
        _id: 1,
        productName: '$productDetails.productTitle',
        selectedSize: 1,
        selectedColor: 1,
        itemqty: 1,
        price: '$productDetails.price',
        salePrice: '$productDetails.salePrice',
        category: '$productDetails.category',
        image: 1,
        product: 1,
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
        category: { $first: '$category' },
        image: { $first: '$image' },
        discountPercentage: { $first: '$discountPercentage' },
        itemqty: { $sum: '$itemqty' },
      },
    },
  ]);

  // --------------------------
  // After aggregation, do calculations
  // --------------------------

  if (!cart || cart.length === 0) {
    return {
      data: [],
      couponsProduct: [],
      totalSalesPrice: 0,
      couponCode: null,
      couponFor: null,
      couponAmount: 0,
      type: null,
      discountvalue: 0,
      discountAmount: 0,
      isDiscountApplicable: false,
      finalAmount: 0,
      minusValue: 0,
      gst: 0,
      coupons: [],
      availableCoupons: [],
    };
  }

  const pricedItems = cart.map((item) => ({
    productId: String(item._id ?? item.product),
    total: (Number(item.salePrice) || 0) * (Number(item.itemqty) || 0),
    category: item.category,
  }));

  const totalPrice = pricedItems.reduce((sum, item) => sum + item.total, 0);
  const productIds = pricedItems.map((item) => item.productId);

  const categories = await Category.find({});
  const categoryIdentifiers = [];
  pricedItems.forEach((it) => {
    const ids = getCategoryIdentifiers(it.category, categories);
    ids.forEach((id) => {
      if (!categoryIdentifiers.includes(id)) categoryIdentifiers.push(id);
    });
  });

  const coupons = await Coupon.find({
    isActive: true,
    $or: [
      { products: { $size: 0 } },
      { products: { $in: productIds } },
      { category: { $in: categoryIdentifiers } },
      { couponFor: { $in: ['minPurchase', 'auto'] } },
    ],
  });

  const { best, bestPotential, allCalculations = [] } = getBestCouponDiscount(
    coupons,
    pricedItems,
    totalPrice,
    categories
  );

  const isDiscountApplicable = Boolean(best && best.discount > 0);
  const discount = isDiscountApplicable ? best.discount : 0;
  const activeScheme = best || bestPotential;

  // Deduplicated list of all coupons applicable to cart items
  const applicableCouponsMap = new Map();
  allCalculations.forEach((calc) => {
    if (calc.coupon && !applicableCouponsMap.has(String(calc.coupon._id))) {
      applicableCouponsMap.set(String(calc.coupon._id), calc.coupon);
    }
  });
  const cartApplicableCoupons = Array.from(applicableCouponsMap.values());

  const data = cart.map((item) => {
    const itemId = String(item._id ?? item.product);

    // All calculations & coupons that apply to this specific item
    const itemCalculations = allCalculations.filter((calc) =>
      calc.eligibleProductIds && calc.eligibleProductIds.includes(itemId)
    );
    const itemCoupons = itemCalculations.map((calc) => calc.coupon);
    const isOfferAvailable = itemCoupons.length > 0;

    // Pick best calculation for this item if best applies, otherwise candidate
    const itemBestCalc =
      itemCalculations.find((calc) => best && String(calc.coupon._id) === String(best.coupon._id)) ||
      itemCalculations[0];

    const couponCode = itemBestCalc ? itemBestCalc.coupon.code || null : null;
    const couponDiscount = itemBestCalc
      ? itemBestCalc.threshold || itemBestCalc.coupon.discount || null
      : null;
    const couponOfferDiscount = itemBestCalc
      ? itemBestCalc.percent
        ? String(itemBestCalc.percent)
        : itemBestCalc.coupon.offerDiscount || String(itemBestCalc.coupon.discount) || null
      : null;
    const couponType = itemBestCalc ? itemBestCalc.coupon.type || null : null;

    return {
      ...item,
      isOfferAvailable,
      couponCode,
      couponDiscount,
      couponOfferDiscount,
      couponType,
      coupons: itemCoupons,
      availableCoupons: itemCoupons,
    };
  });

  const totalAmt = Math.max(Math.round(totalPrice - discount), 0);

  return {
    data,
    couponsProduct: data.filter((item) => item.isOfferAvailable),
    totalSalesPrice: totalPrice,
    couponCode: best ? best.coupon.code : (activeScheme ? activeScheme.coupon.code : null),
    couponFor: best ? best.coupon.couponFor : (activeScheme ? activeScheme.coupon.couponFor : null),
    couponAmount: best ? best.threshold : (activeScheme ? activeScheme.threshold : 0),
    type: best ? best.coupon.type : (activeScheme ? activeScheme.coupon.type : null),
    discountvalue:
      best && best.coupon.type === 'percentage'
        ? best.percent
        : (activeScheme ? activeScheme.percent : 0),
    discountAmount: discount,
    isDiscountApplicable,
    finalAmount: totalAmt,
    minusValue: discount,
    gst: 0,
    coupons: cartApplicableCoupons,
    availableCoupons: cartApplicableCoupons,
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
