const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');
const { sendOtp } = require('../services/otp.service');
const User = require('../models/user.model');
const crypto = require('crypto');

// In-memory store for OTPs (for demo, use Redis in production)
const otpStore = {};

const requestOtp = catchAsync(async (req, res) => {
  const { mobile } = req.body;
  if (!mobile) throw new ApiError(httpStatus.BAD_REQUEST, 'Mobile number required');
  // Find user by mobile, create if not exists
  let user = await User.findOne({ mobile });
  if (!user) {
    user = await User.create({ mobile });
  }
  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[mobile] = { otp, expires: Date.now() + 5 * 60 * 1000 };
  let otpresponse = await sendOtp(mobile, otp);
  res.status(httpStatus.OK).json(otpresponse);
});

const verifyOtp = catchAsync(async (req, res) => {
  const { mobile, otp } = req.body;
  if (!mobile || !otp) throw new ApiError(httpStatus.BAD_REQUEST, 'Mobile and OTP required');
  const record = otpStore[mobile];
  if (!record || record.otp !== otp || record.expires < Date.now()) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');
  }
  // Find user and return JWT tokens
  const user = await User.findOne({ mobile });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  delete otpStore[mobile];
  const { generateAuthTokens } = require('../services/token.service');
  const tokens = await generateAuthTokens(user);
  res.status(httpStatus.OK).json({ success: true, user, tokens });
});

const createUser = catchAsync(async (req, res) => {
  // Only mobile required for Flipkart-style OTP login
  const { mobile, name } = req.body;
  if (!mobile) throw new ApiError(httpStatus.BAD_REQUEST, 'Mobile number required');
  let user = await User.findOne({ mobile });
  if (!user) {
    user = await User.create({ mobile, name });
  }
  res.status(httpStatus.CREATED).send(user);
});

const addUserAddress = catchAsync(async (req, res) => {
  const userId = req.params.userId;
  const address = req.body.address;

  if (!address) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Address is required');
  }

  // Check if the user exists and update or create the address
  const user = await userService.addOrUpdateUserAddress(userId, address);

  res.status(httpStatus.OK).send(user);
});

const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  addUserAddress,
  requestOtp,
  verifyOtp,
};
