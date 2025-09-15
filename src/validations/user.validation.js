const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

const createUser = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    name: Joi.string().required(),
    role: Joi.string().required().valid('user', 'admin'),
    address: Joi.array(),
  }),
};

const getUsers = {
  query: Joi.object().keys({
    name: Joi.string(),
    role: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      password: Joi.string().custom(password),
      name: Joi.string(),
      address: Joi.array(),
    })
    .min(1),
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const requestOtp = {
  body: Joi.object().keys({
    mobile: Joi.string().required().pattern(/^[6-9]\d{9}$/).message('Mobile number must be a valid 10-digit Indian mobile number'),
  }),
};

const verifyOtp = {
  body: Joi.object().keys({
    mobile: Joi.string().required().pattern(/^[6-9]\d{9}$/).message('Mobile number must be a valid 10-digit Indian mobile number'),
    otp: Joi.string().required().length(6).pattern(/^\d+$/).message('OTP must be a 6-digit number'),
  }),
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  requestOtp,
  verifyOtp,
};
