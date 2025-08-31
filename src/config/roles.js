const allRoles = {
  user: ['createOrder', 'createReview', 'manageOwnReviews'],
  admin: ['getUsers', 'manageUsers', 'getOrders', 'manageOrders', 'getReviews', 'manageReviews'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
