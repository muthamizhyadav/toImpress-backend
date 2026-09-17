const httpStatus = require('http-status');
const { Banner } = require('../models/user.home.model');
const ApiError = require('../utils/ApiError');
const uploadToR2 = require('../utils/fileUpload');

const createBanner = async (req) => {
  let bannerUrl = '';
  if (req.file) {
    const file = req.file;
    bannerUrl = await uploadToR2(file.buffer, file.originalname, file.mimetype, 'banner');
  }
  const creation = await Banner.create({ ...req.body, ...(bannerUrl ? { url: bannerUrl } : {}) });
  return creation;
};

const updateBannerById = async (id, req) => {
  const banner = await Banner.findById(id);
  if (!banner) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Banner not found');
  }
  const updates = { ...req.body };
  if (req.file) {
    const { file } = req;
    updates.url = await uploadToR2(file.buffer, file.originalname, file.mimetype, 'banner');
  }
  delete updates.id;
  Object.assign(banner, updates);
  await banner.save();
  return banner;
};

const fetchAllBanner = async (req) => {
  const getBanners = await Banner.find().sort({ position: -1 });
  return getBanners;
};
const deleteBannerById = async (id) => {
  const banner = await Banner.findById(id);
  if (!banner) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Banner not found');
  }
  await banner.deleteOne();
  return { success: true, message: 'Banner deleted successfully' };
};

module.exports = {
  createBanner,
  updateBannerById,
  fetchAllBanner,
  deleteBannerById,
};
