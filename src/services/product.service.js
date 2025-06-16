const httpStatus = require('http-status');
const { Category, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const { uploadMultipleToR2 } = require('../utils/multipleUpload');

const uploadMultipleFiles = async (req) => {
  if (req.files) {
    const uploaded = await uploadMultipleToR2(req.files, 'product');
    return uploaded;
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'files required to upload');
  }
};

const createProduct = async (req) => {
  const body = req.body;
  const creation = await Product.create(body);
  return creation;
};

module.exports = {
  uploadMultipleFiles,
  createProduct,
};
