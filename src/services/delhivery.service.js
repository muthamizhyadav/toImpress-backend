const axios = require('axios');


const DELHIVERY_API_KEY = process.env.DELHIVERY_API_KEY;
const DELHIVERY_BASE_URL = 'https://staging-express.delhivery.com';

const createShipment = async (shipmentData) => {
  const payload = new URLSearchParams();
  payload.append('format', 'json');
  payload.append('data', JSON.stringify(shipmentData));

  const response = await axios.post(
    `${DELHIVERY_BASE_URL}/api/cmu/create.json`,
    payload,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Token ${DELHIVERY_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  return response.data;
};

const trackShipment = async (waybill) => {
  const response = await axios.get(
    `${DELHIVERY_BASE_URL}/packages/json`,
    {
      params: { waybill },
      headers: {
        Authorization: `Token ${DELHIVERY_API_KEY}`,
      },
    }
  );
  return response.data;
};

module.exports = {
  createShipment,
  trackShipment,
};
