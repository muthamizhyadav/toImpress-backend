const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const spinnerValidation = require('../../validations/spinner.validation');
const spinnerController = require('../../controllers/spinner.controller');

const router = express.Router();

router
  .route('/')
  .post(auth('manageSpinners'), validate(spinnerValidation.createSpinner), spinnerController.createSpinner)
  .get(auth('getSpinners'), validate(spinnerValidation.getSpinners), spinnerController.getSpinners);

// Public: wheels that are currently live on the storefront
router.route('/live').get(spinnerController.getLiveSpinners);

// Admin: create the standard 6-offer campaign when the store has none
router.route('/defaults').post(auth('manageSpinners'), spinnerController.createDefaultSpinner);

// Public (authenticated user): server decides the winning segment
router.route('/:spinnerId/spin').post(auth(), validate(spinnerValidation.spinSpinner), spinnerController.spinSpinner);

// Authenticated: has this customer already spun, and what did they win?
router.route('/:spinnerId/status').get(auth(), validate(spinnerValidation.getSpinner), spinnerController.getSpinStatus);

// Admin: everyone who has claimed a reward from this wheel
router
  .route('/:spinnerId/claims')
  .get(auth('getSpinners'), validate(spinnerValidation.getSpinner), spinnerController.getSpinnerClaims);

router
  .route('/:spinnerId')
  .get(auth('getSpinners'), validate(spinnerValidation.getSpinner), spinnerController.getSpinner)
  .put(auth('manageSpinners'), validate(spinnerValidation.updateSpinner), spinnerController.updateSpinner)
  .delete(auth('manageSpinners'), validate(spinnerValidation.deleteSpinner), spinnerController.deleteSpinner);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Spinners
 *   description: Spin-the-wheel marketing campaigns (API doc is maintained in this file)
 */

/**
 * @swagger
 * /spinners:
 *   post:
 *     summary: Create a spin-the-wheel campaign
 *     description: Admin only. Reward types include threshold_discount (Buy ₹2000 get ₹30 off), category/product scoped campaigns and event based campaigns via eventName.
 *   get:
 *     summary: List spinners (paginated)
 *     description: Admin only.
 *
 * /spinners/live:
 *   get:
 *     summary: Spinners that are live right now
 *     description: Public. Supports ?categoryIds=id1,id2. Spin logs are never exposed.
 *
 * /spinners/defaults:
 *   post:
 *     summary: Create the standard 6-offer "Spin & Win" campaign
 *     description: Admin only. Idempotent - returns the existing campaign if it already exists.
 *
 * /spinners/{spinnerId}/spin:
 *   post:
 *     summary: Spin the wheel
 *     description: Authenticated user. The server picks the winning segment using segment probability weights and atomically enforces maxSpinsPerUser.
 *
 * /spinners/{spinnerId}/status:
 *   get:
 *     summary: Get the current customer's spin status
 *     description: Authenticated. Returns canSpin, remainingSpins and the reward the customer already won.
 *
 * /spinners/{spinnerId}/claims:
 *   get:
 *     summary: List everyone who claimed a reward
 *     description: Admin only. Resolves customer ids to name and mobile.
 *
 * /spinners/{spinnerId}:
 *   get:
 *     summary: Get a spinner
 *   put:
 *     summary: Update a spinner (partial body allowed, used for status toggles too)
 *   delete:
 *     summary: Delete a spinner
 */
