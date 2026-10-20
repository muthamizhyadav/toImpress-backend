const httpStatus = require('http-status');
const { Spinner, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { DEFAULT_SPINNER } = require('../config/spinOffers');

/**
 * Create a spinner
 * @param {Object} spinnerBody
 * @returns {Promise<Spinner>}
 */
const createSpinner = async (spinnerBody) => {
  return Spinner.create(spinnerBody);
};

/**
 * Create the default 6-offer "Spin & Win" campaign once.
 * Safe to call repeatedly: an existing campaign is returned as-is.
 * @returns {Promise<Spinner>}
 */
const createDefaultSpinner = async () => {
  const existing = await Spinner.findOne({
    $or: [{ eventName: DEFAULT_SPINNER.eventName }, { name: DEFAULT_SPINNER.name }],
  });
  if (existing) {
    return existing;
  }
  return Spinner.create(DEFAULT_SPINNER);
};

/**
 * Query for spinners
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const querySpinners = async (filter, options) => {
  return Spinner.paginate(filter, options);
};

/**
 * Get spinner by id
 * @param {string} id
 * @returns {Promise<Spinner>}
 */
const getSpinnerById = async (id) => {
  return Spinner.findById(id);
};

/**
 * Update spinner by id
 * @param {string} spinnerId
 * @param {Object} updateBody
 * @returns {Promise<Spinner>}
 */
const updateSpinnerById = async (spinnerId, updateBody) => {
  const spinner = await getSpinnerById(spinnerId);
  if (!spinner) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Spinner not found');
  }
  Object.assign(spinner, updateBody);
  await spinner.save();
  return spinner;
};

/**
 * Delete spinner by id
 * @param {string} spinnerId
 * @returns {Promise<Spinner>}
 */
const deleteSpinnerById = async (spinnerId) => {
  const spinner = await getSpinnerById(spinnerId);
  if (!spinner) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Spinner not found');
  }
  await spinner.remove();
  return spinner;
};

/**
 * Shape a spinner for the public storefront. Spin logs contain user ids, so
 * they must never be exposed by the public endpoints.
 * @param {Object} spinner
 * @returns {Object}
 */
const toPublicSpinner = (spinner) => ({
  id: String(spinner._id || spinner.id),
  name: spinner.name,
  description: spinner.description,
  eventName: spinner.eventName,
  appliesTo: spinner.appliesTo,
  categories: spinner.categories || [],
  products: spinner.products || [],
  minPurchaseAmount: spinner.minPurchaseAmount || 0,
  maxSpinsPerUser: spinner.maxSpinsPerUser || 1,
  startDate: spinner.startDate,
  endDate: spinner.endDate,
  isActive: spinner.isActive,
  segments: (spinner.segments || []).map((segment) => ({
    label: segment.label,
    rewardType: segment.rewardType,
    value: segment.value,
    minOrderAmount: segment.minOrderAmount || 0,
    color: segment.color,
  })),
});

/**
 * Check whether a spinner is inside its active window.
 * @param {Object} spinner
 * @returns {Object} { ok, reason }
 */
const getAvailability = (spinner) => {
  const now = new Date();

  if (!spinner.isActive) {
    return { ok: false, reason: 'This spinner is not active' };
  }
  if (spinner.startDate && now < new Date(spinner.startDate)) {
    return { ok: false, reason: 'This spinner has not started yet' };
  }
  if (spinner.endDate && now > new Date(spinner.endDate)) {
    return { ok: false, reason: 'This spinner has ended' };
  }
  return { ok: true, reason: '' };
};

/**
 * Get spinners currently live (active + inside the schedule window)
 * Used by the storefront to decide which wheel to show.
 * @param {Object} [scope] - optional product/category scope of the current user
 * @returns {Promise<Spinner[]>}
 */
const getLiveSpinners = async (scope = {}) => {
  const now = new Date();
  const filter = {
    isActive: true,
    $and: [{ $or: [{ startDate: null }, { startDate: { $lte: now } }] }],
    $or: [{ endDate: null }, { endDate: { $gte: now } }],
  };

  if (scope.categoryIds && scope.categoryIds.length) {
    filter.$and.push({
      $or: [
        { appliesTo: 'all_products' },
        { appliesTo: 'specific_categories', categories: { $in: scope.categoryIds } },
        { appliesTo: 'specific_products' },
      ],
    });
  }

  // Never send spin logs (they contain customer ids) to the storefront.
  return Spinner.find(filter).select('-spins').sort('-createdAt');
};

/**
 * Get the current user's spin state for a spinner, including the reward they
 * already won. This is what the storefront calls after login and on reload so
 * the "one spin per customer" rule is visible before the wheel is opened.
 * @param {string} spinnerId
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const getSpinStatus = async (spinnerId, userId) => {
  const spinner = await getSpinnerById(spinnerId);
  if (!spinner) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Spinner not found');
  }

  const ownerId = String(userId);
  const userSpins = (spinner.spins || []).filter((spin) => spin.user === ownerId);
  const usedSpins = userSpins.length;
  const remainingSpins = Math.max((spinner.maxSpinsPerUser || 1) - usedSpins, 0);
  const availability = getAvailability(spinner);
  const lastSpin = usedSpins ? userSpins[userSpins.length - 1] : null;

  let { reason } = availability;
  if (availability.ok && remainingSpins <= 0) {
    reason = 'You have already used your spin';
  }

  return {
    spinner: toPublicSpinner(spinner),
    usedSpins,
    remainingSpins,
    canSpin: availability.ok && remainingSpins > 0,
    reason,
    lastSpin: lastSpin
      ? {
          segmentIndex: lastSpin.segmentIndex || 0,
          segmentLabel: lastSpin.segmentLabel,
          rewardType: lastSpin.rewardType,
          rewardValue: lastSpin.rewardValue,
          spunAt: lastSpin.spunAt,
        }
      : null,
  };
};

/**
 * Admin view of everyone who has spun a wheel. User ids are resolved to the
 * customer's name and mobile so the admin panel can actually act on a claim.
 * @param {string} spinnerId
 * @returns {Promise<Object>}
 */
const getSpinnerClaims = async (spinnerId) => {
  const spinner = await getSpinnerById(spinnerId);
  if (!spinner) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Spinner not found');
  }

  const spins = (spinner.spins || []).map((spin) => ({
    user: spin.user,
    segmentIndex: spin.segmentIndex || 0,
    segmentLabel: spin.segmentLabel,
    rewardType: spin.rewardType,
    rewardValue: spin.rewardValue,
    spunAt: spin.spunAt,
  }));

  const userIds = [...new Set(spins.map((spin) => spin.user).filter(Boolean))];
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } })
        .select('name mobile')
        .lean()
    : [];
  const usersById = new Map(users.map((user) => [String(user._id), user]));

  return {
    id: String(spinner._id || spinner.id),
    name: spinner.name,
    maxSpinsPerUser: spinner.maxSpinsPerUser || 1,
    totalSpins: spins.length,
    uniqueCustomers: userIds.length,
    spins: spins.map((spin) => {
      const customer = usersById.get(spin.user);
      return {
        ...spin,
        customer: {
          id: spin.user,
          name: (customer && customer.name) || '',
          mobile: (customer && customer.mobile) || '',
        },
      };
    }),
  };
};

/**
 * Pick the winning segment index with a weighted random roll on segment.probability.
 * @param {Array} segments
 * @returns {number} index of the winning segment
 */
const pickSegmentIndex = (segments) => {
  const weights = segments.map((segment) => Math.max(Number(segment.probability) || 0, 0));
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  if (total <= 0) {
    return Math.floor(Math.random() * segments.length);
  }

  let roll = Math.random() * total;
  for (let i = 0; i < segments.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) {
      return i;
    }
  }
  return segments.length - 1;
};

/**
 * Spin a spinner on behalf of a user. The server decides the winning segment
 * and uses a single atomic update so two parallel requests cannot both win.
 * @param {string} spinnerId
 * @param {string} userId
 * @param {Object} [context] - optional cart context (cartTotal)
 * @returns {Promise<Object>}
 */
const spinSpinner = async (spinnerId, userId, context = {}) => {
  const spinner = await getSpinnerById(spinnerId);
  if (!spinner) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Spinner not found');
  }

  const availability = getAvailability(spinner);
  if (!availability.ok) {
    throw new ApiError(httpStatus.BAD_REQUEST, availability.reason);
  }

  if (spinner.minPurchaseAmount > 0 && (context.cartTotal || 0) < spinner.minPurchaseAmount) {
    throw new ApiError(httpStatus.BAD_REQUEST, `A minimum purchase of ₹${spinner.minPurchaseAmount} is required to spin`);
  }

  if (!Array.isArray(spinner.segments) || spinner.segments.length < 2) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Spinner is not configured with enough segments');
  }

  const ownerId = String(userId);
  const winningIndex = pickSegmentIndex(spinner.segments);
  const storedSegment = spinner.segments[winningIndex];
  const now = new Date();

  const spinLog = {
    user: ownerId,
    segmentIndex: winningIndex,
    segmentLabel: storedSegment.label,
    rewardType: storedSegment.rewardType,
    rewardValue: storedSegment.value,
    spunAt: now,
  };

  /*
   * Atomic guard: only update when this user has fewer spins than the campaign
   * allows. Because this is one findOneAndUpdate, concurrent requests cannot
   * both pass the check and write a second reward.
   */
  const atomicFilter = {
    _id: spinner._id,
    $expr: {
      $lt: [
        {
          $size: {
            $filter: {
              input: { $ifNull: ['$spins', []] },
              as: 'spin',
              cond: { $eq: ['$$spin.user', ownerId] },
            },
          },
        },
        { $ifNull: ['$maxSpinsPerUser', 1] },
      ],
    },
  };

  const updatedSpinner = await Spinner.findOneAndUpdate(
    atomicFilter,
    {
      $push: { spins: spinLog },
      $inc: {
        spinCount: 1,
        [`segments.${winningIndex}.winCount`]: 1,
      },
    },
    { new: true }
  );

  if (!updatedSpinner) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You have already used all your spins');
  }

  const usedSpins = (updatedSpinner.spins || []).filter((spin) => spin.user === ownerId).length;
  const remainingSpins = Math.max((updatedSpinner.maxSpinsPerUser || 1) - usedSpins, 0);

  return {
    segmentIndex: winningIndex,
    segment: {
      label: storedSegment.label,
      rewardType: storedSegment.rewardType,
      value: storedSegment.value,
      minOrderAmount: storedSegment.minOrderAmount || 0,
      color: storedSegment.color,
    },
    spinCount: updatedSpinner.spinCount,
    usedSpins,
    remainingSpins,
  };
};

module.exports = {
  createSpinner,
  createDefaultSpinner,
  querySpinners,
  getSpinnerById,
  updateSpinnerById,
  deleteSpinnerById,
  getLiveSpinners,
  getSpinStatus,
  getSpinnerClaims,
  toPublicSpinner,
  pickSegmentIndex,
  spinSpinner,
};
