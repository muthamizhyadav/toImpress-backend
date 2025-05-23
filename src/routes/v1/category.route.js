const express = require('express');
const CategoryController = require('../../controllers/category.controller');
const router = express.Router();
const auth = require('../../middlewares/auth');

const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router
  .route('/')
  .post(upload.single('file'), CategoryController.createCategory)
  .get(auth('manageUsers'), CategoryController.fetchAllCategory);
router.route('/:id').delete(CategoryController.deleteCategory).put(upload.single('file'),CategoryController.updateCategory);
module.exports = router;
