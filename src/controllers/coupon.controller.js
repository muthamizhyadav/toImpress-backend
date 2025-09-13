const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { couponService } = require('../services');

const createCoupon = catchAsync(async (req, res) => {
  const coupon = await couponService.createCoupon(req.body);
  res.status(httpStatus.CREATED).send(coupon);
});

const getCoupons = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['code', 'type', 'couponFor', 'isActive']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await couponService.queryCoupons(filter, options);
  res.send(result);
});

const getCoupon = catchAsync(async (req, res) => {
  const coupon = await couponService.getCouponById(req.params.couponId);
  if (!coupon) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found');
  }
  res.send(coupon);
});

const getCouponByCode = catchAsync(async (req, res) => {
  const coupon = await couponService.getCouponByCode(req.params.code);
  if (!coupon) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found');
  }
  res.send(coupon);
});

const updateCoupon = catchAsync(async (req, res) => {
  const coupon = await couponService.updateCouponById(req.params.couponId, req.body);
  res.send(coupon);
});

const deleteCoupon = catchAsync(async (req, res) => {
  await couponService.deleteCouponById(req.params.couponId);
  res.status(httpStatus.NO_CONTENT).send();
});

const validateCoupon = catchAsync(async (req, res) => {
  const { code, cartTotal, productIds } = req.body;
  const result = await couponService.validateCoupon(code, cartTotal, productIds);
  res.send(result);
});

const applyCoupon = catchAsync(async (req, res) => {
  const { code, cartTotal, productIds } = req.body;
  const result = await couponService.applyCoupon(code, cartTotal, productIds);
  res.send(result);
});

const getActiveCouponsForProduct = catchAsync(async (req, res) => {
  const coupons = await couponService.getActiveCouponsForProduct(req.params.productId);
  res.send(coupons);
});

const incrementUsageCount = catchAsync(async (req, res) => {
  const coupon = await couponService.incrementUsageCount(req.body.code);
  res.send({
    message: 'Coupon usage count incremented successfully',
    usageCount: coupon.usageCount
  });
});

module.exports = {
  createCoupon,
  getCoupons,
  getCoupon,
  getCouponByCode,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  applyCoupon,
  getActiveCouponsForProduct,
  incrementUsageCount,
};
