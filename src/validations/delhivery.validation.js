const Joi = require('joi');

const createShipment = {
  body: Joi.object().keys({
    // Add required Delhivery fields here
    shipments: Joi.array().items(Joi.object().required()).min(1).required(),
  }),
};

const trackShipment = {
  query: Joi.object().keys({
    waybill: Joi.string().required(),
  }),
};

module.exports = {
  createShipment,
  trackShipment,
};
