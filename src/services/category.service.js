const httpStatus = require('http-status');
const { Category } = require('../models');
const ApiError = require('../utils/ApiError');
const uploadToR2 = require('../utils/fileUpload');

const createCategory = async (req) => {
  const body = req.body;
  const file = req.file;
  if (file) {
    const url = await uploadToR2(file.buffer, file.originalname, file.mimetype, 'category');
    const creationData = { ...body, ...{ imageUrl: url } };
    const creation = await Category.create(creationData);
    return creation;
  } else {
    const creation = await Category.create(body);
    return creation;
  }
};

const fetchAllCategory = async (req) => {
  const findAllCategory = await Category.find({ active: true });
  return findAllCategory;
};

module.exports = { createCategory, fetchAllCategory };
