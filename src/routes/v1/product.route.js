const express = require('express');
const router = express.Router();
const { productController } = require('../../controllers');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.route('/').post(productController.createProduct).get(productController.getProducts);
router.route('/multiple/file/upload').post(upload.array('files'), productController.uploadMultipleFiles);
router.route('/:id').get(productController.getProductById).put(productController.updateProductById);

module.exports = router;
