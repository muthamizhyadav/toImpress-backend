const express = require('express');
const router = express.Router();
const PageImpressionController = require('../../controllers/page.impress.controller');

router.route('/').post(PageImpressionController.createPageImpression).get(PageImpressionController.impressPageData);

module.exports = router;