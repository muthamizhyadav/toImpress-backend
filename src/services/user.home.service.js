const httpStatus = require('http-status');
const { Banner } = require('../models/user.home.model');
const ApiError = require('../utils/ApiError');
const uploadToR2 = require('../utils/fileUpload');

const createBanner = async (req) => {
  if (!req.file) {
    throw new ApiError(httpStatus[422], 'Banner Image Required');
  }
  const file = req.file;
  const bannerUrl = await uploadToR2(file.buffer, file.originalname, file.mimetype, 'banner');
  const creation = await Banner.create({ ...req.body, ...{ url: bannerUrl } });
  return creation;
};

const fetchAllBanner = async (req) => {
  const getBanners = await Banner.find().sort({ position: -1 });
  return getBanners;
};

module.exports = {
  createBanner,
  fetchAllBanner,
};
