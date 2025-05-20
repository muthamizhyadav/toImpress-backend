const express = require('express');
const CategoryController = require('../../controllers/category.controller');
const router = express.Router();
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.route('/').post(upload.single('file'), CategoryController.createCategory).get(CategoryController.fetchAllCategory);

module.exports = router;
