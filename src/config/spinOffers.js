/**
 * Default "Spin & Win" campaign used by the storefront.
 *
 * Keep these labels in sync with the storefront fallback wheel so the slice a
 * customer sees is the same slice the server records as the winner.
 */
const DEFAULT_SPIN_OFFERS = [
  {
    label: 'FLAT 10% OFF',
    rewardType: 'percent_discount',
    value: '10',
    minOrderAmount: 0,
    color: '#122F15',
    probability: 25,
  },
  {
    label: 'FLAT ₹100 OFF',
    rewardType: 'flat_discount',
    value: '100',
    minOrderAmount: 999,
    color: '#92B775',
    probability: 22,
  },
  {
    label: 'EXTRA 5% OFF',
    rewardType: 'percent_discount',
    value: '5',
    minOrderAmount: 0,
    color: '#F3E8D3',
    probability: 20,
  },
  {
    label: '₹150 OFF',
    rewardType: 'flat_discount',
    value: '150',
    minOrderAmount: 1499,
    color: '#1F6B33',
    probability: 15,
  },
  {
    label: 'JACKPOT — 20% OFF',
    rewardType: 'percent_discount',
    value: '20',
    minOrderAmount: 0,
    color: '#FFD700',
    probability: 3,
  },
  {
    label: 'FLAT 15% OFF',
    rewardType: 'percent_discount',
    value: '15',
    minOrderAmount: 0,
    color: '#2E9E4F',
    probability: 15,
  },
];

const DEFAULT_SPINNER = {
  name: 'Spin & Win',
  description: 'Spin the wheel once and unlock an exclusive offer on your order.',
  eventName: 'SPIN & WIN',
  appliesTo: 'all_products',
  categories: [],
  products: [],
  minPurchaseAmount: 0,
  // One spin per customer. The API also enforces this server-side.
  maxSpinsPerUser: 1,
  isActive: true,
  startDate: null,
  endDate: null,
  segments: DEFAULT_SPIN_OFFERS,
};

module.exports = {
  DEFAULT_SPIN_OFFERS,
  DEFAULT_SPINNER,
};
