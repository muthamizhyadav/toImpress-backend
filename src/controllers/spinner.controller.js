const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { spinnerService } = require('../services');

const createSpinner = catchAsync(async (req, res) => {
  const spinner = await spinnerService.createSpinner(req.body);
  res.status(httpStatus.CREATED).send(spinner);
});

/**
 * Admin helper: create the 6-offer "Spin & Win" campaign if it does not exist.
 */
const createDefaultSpinner = catchAsync(async (req, res) => {
  const spinner = await spinnerService.createDefaultSpinner();
  res.status(httpStatus.CREATED).send(spinner);
});

const getSpinners = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'eventName', 'appliesTo', 'isActive']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await spinnerService.querySpinners(filter, options);
  res.send(result);
});

const getSpinner = catchAsync(async (req, res) => {
  const spinner = await spinnerService.getSpinnerById(req.params.spinnerId);
  if (!spinner) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Spinner not found');
  }
  res.send(spinner);
});

const updateSpinner = catchAsync(async (req, res) => {
  const spinner = await spinnerService.updateSpinnerById(req.params.spinnerId, req.body);
  res.send(spinner);
});

const deleteSpinner = catchAsync(async (req, res) => {
  await spinnerService.deleteSpinnerById(req.params.spinnerId);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Public: spinners that are live right now (used by the storefront).
 * Optional ?categoryIds= id1,id2 narrows event/category scoped spinners.
 */
const getLiveSpinners = catchAsync(async (req, res) => {
  const categoryIds = req.query.categoryIds
    ? String(req.query.categoryIds)
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    : [];
  const spinners = await spinnerService.getLiveSpinners({ categoryIds });
  res.send(spinners);
});

/**
 * Authenticated: whether the current customer can spin and what they already won.
 */
const getSpinStatus = catchAsync(async (req, res) => {
  const status = await spinnerService.getSpinStatus(req.params.spinnerId, req.user.id);
  res.send(status);
});

/**
 * Admin: all claims for a wheel, with customer name/mobile.
 */
const getSpinnerClaims = catchAsync(async (req, res) => {
  const claims = await spinnerService.getSpinnerClaims(req.params.spinnerId);
  res.send(claims);
});

/**
 * Spin the wheel. The server picks the winning segment (weighted random).
 */
const spinSpinner = catchAsync(async (req, res) => {
  const result = await spinnerService.spinSpinner(req.params.spinnerId, req.user.id, {
    cartTotal: req.body.cartTotal,
    productIds: req.body.productIds,
  });
  res.send(result);
});

module.exports = {
  createSpinner,
  createDefaultSpinner,
  getSpinners,
  getSpinner,
  updateSpinner,
  deleteSpinner,
  getLiveSpinners,
  getSpinStatus,
  getSpinnerClaims,
  spinSpinner,
};
