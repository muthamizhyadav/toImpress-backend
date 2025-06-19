const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const userHomeService = require('../services/user.home.service');

const createBanner = catchAsync(async (req, res) => {
  const data = await userHomeService.createBanner(req);
  res.send(data);
});

const getAllBanners = catchAsync(async (req, res) => {
  const data = await userHomeService.fetchAllBanner(req);
  res.send(data);
});

module.exports = {
  createBanner,
  getAllBanners,
};
