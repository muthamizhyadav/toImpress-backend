const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const delhiveryService = require('../services/delhivery.service');

const createShipment = catchAsync(async (req, res) => {
  console.log('Raw request body received');
  console.log('request:', req.user._id);    
  if (!req.body) {
    return res.status(httpStatus.BAD_REQUEST).json({
      error: true,
      message: 'Request body is required'
    });
  }

  if (typeof req.body !== 'object') {
    return res.status(httpStatus.BAD_REQUEST).json({
      error: true,
      message: 'Request body must be a valid JSON object'
    });
  }

  const result = await delhiveryService.createShipment(req.body,req.user._id);
  res.status(httpStatus.OK).json(result);
});

const trackShipment = catchAsync(async (req, res) => {
  const { waybill,ref_ids } = req.query;
  const result = await delhiveryService.trackShipment(waybill,ref_ids);
  res.status(httpStatus.OK).json(result);
});

const getWarehouses = catchAsync(async (req, res) => {
  const result = await delhiveryService.getRegisteredWarehouses();
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Registered warehouses retrieved successfully',
    data: result
  });
});

const testJsonParsing = catchAsync(async (req, res) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: 'JSON parsed successfully',
    bodyType: typeof req.body,
    bodyKeys: req.body ? Object.keys(req.body) : null,
    hasShipments: req.body && req.body.shipments ? true : false
  });
});

const testApiConnectivity = catchAsync(async (req, res) => {  
  const axios = require('axios');
  const DELHIVERY_API_KEY = process.env.DELHIVERY_API_KEY;
  
  const testUrls = [
    'https://track.delhivery.com/api/cmu/create.json'
  ];

  const results = [];

  for (const url of testUrls) {
    try {
      const testPayload = {
        format: 'json',
        data: JSON.stringify({
          shipments: [{
            name: 'Test Customer',
            add: 'Test Address, Mumbai',
            pin: '400001',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            phone: '9876543210',
            order: `TEST${Date.now()}`,
            payment_mode: 'Prepaid',
            products_desc: 'Test Product',
            total_amount: '100',
            weight: '0.5',
            quantity: '1',
            seller_name: 'ponpreethatextiles',
            seller_add: 'Tamil Nadu'
          }],
          pickup_location: {
            name: 'ponpreethatextiles',
            add: 'Tamil Nadu',
            city: 'Rajapalayam',
            pin_code: '626122',
            country: 'India',
            phone: '9500260077'
          }
        })
      };

      console.log(`Testing URL: ${url}`);
      const response = await axios.post(url, new URLSearchParams(testPayload), {
        headers: {
          Accept: 'application/json',
          Authorization: `Token ${DELHIVERY_API_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000
      });

      results.push({
        url,
        status: response.status,
        success: response.data.success || false,
        error: response.data.error || false,
        message: response.data.rmk || 'No message',
        data: response.data
      });

    } catch (error) {
      results.push({
        url,
        status: error.response?.status || 'NETWORK_ERROR',
        success: false,
        error: true,
        message: error.message,
        data: error.response?.data || null
      });
    }
  }

  res.status(httpStatus.OK).json({
    success: true,
    message: 'API connectivity test completed',
    results
  });
});

// Test with minimal shipment - same as our successful connectivity test
const testMinimalShipment = catchAsync(async (req, res) => {
  console.log('=== Testing Minimal Shipment ===');
  
  const result = await delhiveryService.createShipment({
    shipments: [{
      name: 'Test Customer',
      add: 'Test Address, Mumbai',
      pin: '400001',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      phone: '9876543210',
      order: `TEST${Date.now()}`,
      payment_mode: 'Prepaid',
      products_desc: 'Test Product',
      total_amount: '100',
      weight: '0.5',
      quantity: '1',
      seller_name: 'ponpreethatextiles',
      seller_add: 'Tamil Nadu'
    }],
    pickup_location: {
      name: 'ponpreethatextiles',
      add: 'Tamil Nadu',
      city: 'Rajapalayam',
      pin_code: '626122',
      country: 'India',
      phone: '9500260077'
    }
  });
  
  res.status(httpStatus.OK).json(result);
});

const getOrders = catchAsync(async (req, res) => {
  const result = await delhiveryService.getOrders(req);
  res.status(httpStatus.OK).json(result);
});

module.exports = {
  createShipment,
  trackShipment,
  getWarehouses,
  testJsonParsing,
  testApiConnectivity,
  testMinimalShipment,
  getOrders
};
