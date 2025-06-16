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

const deleteCategory = async (req) => {
  const id = req.params.id;
  const findCategoryById = await Category.findById(id);
  if (!findCategoryById) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Category not found');
  }
  await Category.findByIdAndDelete(id);
  return { message: 'Category deleted successfully' };
};

const updateCategory = async (req) => {
  const { id } = req.params;
  const body = req.body;
  const file = req.file;
  const existingCategory = await Category.findById(id);
  if (!existingCategory) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }
  let updatedData = { ...body };
  console.log(updatedData, 'updatedData');

  if (file) {
    const url = await uploadToR2(file.buffer, file.originalname, file.mimetype, 'category');
    updatedData.imageUrl = url;
  }
  const updatedCategory = await Category.findByIdAndUpdate(id, updatedData, { new: true });
  return updatedCategory;
};

module.exports = { createCategory, fetchAllCategory, deleteCategory, updateCategory };
