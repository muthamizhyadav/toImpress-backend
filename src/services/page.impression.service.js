const httpStatus = require('http-status');
const Impression = require('../models/page.impression.model');
const ApiError = require('../utils/ApiError');
const axios = require('axios');

const createPageImpression = async (impressionBody) => {
  const impression = await Impression.create(impressionBody);
  return impression;
};

const getDashBoardWithFaceBookAnalytics = async () => {
  try {
    const AD_ACCOUNT_ID = 'act_1289244908631442';
    const ACCESS_TOKEN =
      'EAAZAsGRRxSKYBQAPNZCKW0YgX9jdYbRYzMuyTB2QjJUe2vSNYJHgJ2P1KrIvKQPHdMQzSMMYc9asbwO3c7YsmU1gm5yX9bdZAWb0kj9vy5fuLdPLDHzgMIM0ZC5ZBNsiKJYBifbaZCwuwIv8bWZBlOEwMhfed72OcRLW7y6ZBk083cuEj9RwtRoxlgk9nZCNs7AZDZD';

    const url = `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/insights`;

    const response = await axios.get(url, {
      params: {
        fields: 'impressions,clicks,spend,ctr,cpc,reach',
        date_preset: 'last_30d',
        access_token: ACCESS_TOKEN,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Facebook Insights Error:', error.response?.data || error.message);
    throw error;
  }
};

const getPageImpressionsByCreatedDate = async (req) => {
  let { fromDate, toDate } = req.query;

  // Default = last 1 month if not passed
  const now = new Date();
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(now.getMonth() - 1);

  const start = fromDate ? new Date(fromDate + 'T00:00:00.000Z') : oneMonthAgo;

  const end = toDate ? new Date(toDate + 'T23:59:59.999Z') : now;

  const dateFilter = {
    createdAt: { $gte: start, $lte: end },
  };

  // -----------------------------
  // 1️⃣  Most 4 Add-to-Cart Products
  // -----------------------------
  const topAddToCart = await Impression.aggregate([
    { $match: { isAddToCartPage: true, ...dateFilter } },
    {
      $group: {
        _id: '$productName',
        total: { $sum: '$impressions' },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 4 },
  ]);

  // -----------------------------
  // 2️⃣  Most 4 Visited Products
  // -----------------------------
  const topProducts = await Impression.aggregate([
    { $match: { isproductPage: true, ...dateFilter } },
    {
      $group: {
        _id: '$productName',
        total: { $sum: '$impressions' },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 4 },
  ]);

  // -----------------------------
  // 3️⃣  Most 4 Visited Categories
  // -----------------------------
  const topCategories = await Impression.aggregate([
    { $match: { iscategoryPage: true, ...dateFilter } },
    {
      $group: {
        _id: '$categoryName',
        total: { $sum: '$impressions' },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 4 },
  ]);

  const Pageimpressions = await Impression.find(dateFilter).sort({ createdAt: -1 });

  const metaDetail = await getDashBoardWithFaceBookAnalytics();

  return {
    Pageimpressions,
    charts: {
      addToCartTop4: topAddToCart,
      productTop4: topProducts,
      categoryTop4: topCategories,
    },
    metaDetail,
  };
};

module.exports = {
  getPageImpressionsByCreatedDate,
  createPageImpression,
};
