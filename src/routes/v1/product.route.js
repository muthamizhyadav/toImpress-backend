const express = require('express');
const router = express.Router();
const { productController } = require('../../controllers');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.route('/').post(productController.createProduct);
router.route('/multiple/file/upload').post(upload.array('files'), productController.uploadMultipleFiles);

module.exports = router;
