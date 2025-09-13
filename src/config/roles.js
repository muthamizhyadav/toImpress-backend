const allRoles = {
  user: ['createOrder', 'createReview', 'manageOwnReviews', 'getCoupons'],
  admin: ['getUsers', 'manageUsers', 'getOrders', 'manageOrders', 'getReviews', 'manageReviews', 'getCoupons', 'manageCoupons'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
