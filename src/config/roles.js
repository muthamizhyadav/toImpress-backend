const allRoles = {
  user: ['createOrder', 'getOrders', 'createReview', 'manageOwnReviews', 'getCoupons'],
  admin: [
    'getUsers',
    'manageUsers',
    'getOrders',
    'manageOrders',
    'getReviews',
    'manageReviews',
    'getCoupons',
    'manageCoupons',
    'getSpinners',
    'manageSpinners',
  ],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
