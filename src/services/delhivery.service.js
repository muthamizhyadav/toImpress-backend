
const axios = require('axios');
const { DelhiveryOrder } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');


const DELHIVERY_API_KEY = process.env.DELHIVERY_API_KEY;
const DELHIVERY_BASE_URL = 'https://track.delhivery.com';

const createShipment = async (shipmentData, userId) => {
    if (!userId) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'User ID is required to create a shipment');
    }
  try {
    if (!shipmentData || typeof shipmentData !== 'object') {
      throw new Error('Invalid shipment data: must be an object');
    }

    if (!shipmentData.shipments || !Array.isArray(shipmentData.shipments)) {
      throw new Error('Invalid shipment data: shipments must be an array');
    }

    const formattedShipments = shipmentData.shipments.map((shipment, index) => {
      if (!shipment || typeof shipment !== 'object') {
        throw new Error(`Invalid shipment at index ${index}: must be an object`);
      }

      return {
        ...shipment,
        name: shipment.name || 'Customer Name',
        add: shipment.add || 'Customer Address',
        pin: shipment.pin || '123456',
        city: shipment.city || 'Mumbai',
        state: shipment.state || 'Maharashtra',
        country: shipment.country || 'India',
        phone: shipment.phone || '9876543210',
        order: shipment.order || `ORDER${Date.now()}`,
        payment_mode: shipment.payment_mode || 'Prepaid',
        return_pin: shipment.return_pin || '626122',
        return_city: shipment.return_city || 'Rajapalayam',
        return_phone: shipment.return_phone || '9500260077',
        return_add: shipment.return_add || 'Tamil Nadu',
        return_state: shipment.return_state || 'Tamil Nadu',
        return_country: shipment.return_country || 'India',
        products_desc: shipment.products_desc || 'Product Description',
        hsn_code: shipment.hsn_code || '9999.99.99',
        cod_amount: shipment.cod_amount || '0',
        order_date: shipment.order_date || new Date().toISOString().split('T')[0],
        total_amount: shipment.total_amount || '1000',
        seller_add: shipment.seller_add || 'Tamil Nadu',
        seller_name: shipment.seller_name || 'ponpreethatextiles',
        quantity: shipment.quantity || '1',
        shipment_width: shipment.shipment_width || '10',
        shipment_height: shipment.shipment_height || '10',
        shipment_length: shipment.shipment_length || '10',
        weight: shipment.weight || '0.5',
        seller_tin: shipment.seller_tin || '',
        invoice_no: shipment.invoice_no || `INV${Date.now()}`,
        invoice_date: shipment.invoice_date || new Date().toISOString().split('T')[0]
      };
    });

    const apiUrl = `${DELHIVERY_BASE_URL}/api/cmu/create.json`;
    
    const updatedData = {
      format: 'json',
      data: JSON.stringify({
        shipments: formattedShipments,
        pickup_location: {
          name: shipmentData.pickup_location?.name || 'ponpreethatextiles',
          add: shipmentData.pickup_location?.add || 'Tamil Nadu',
          city: shipmentData.pickup_location?.city || 'Rajapalayam',
          pin_code: shipmentData.pickup_location?.pin_code || '626122',
          country: shipmentData.pickup_location?.country || 'India',
          phone: shipmentData.pickup_location?.phone || '9500260077'
        }
      })
    };

    console.log('✅ Using PRODUCTION API:', apiUrl);
    console.log('📦 Creating shipment with payload:', JSON.stringify(formattedShipments, null, 2));

    const response = await axios.post(
      apiUrl,
      new URLSearchParams(updatedData),
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Token ${DELHIVERY_API_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000
      }
    );


    if (response.data.success) {
      if (response.data.packages && response.data.packages.length > 0) {        
        const ordersToInsert = response.data.packages.map((pkg, index) => ({
          waybill: pkg.waybill,
          orderId: shipmentData.shipments[index]?.orderId || `ORDER${Date.now()}`,
          refnum: pkg.refnum || '',
          status: pkg.status || response.data.status || '',
          client: pkg.client || '',
          sort_code: pkg.sort_code || '',
          remarks: pkg.remarks ? Array.isArray(pkg.remarks) ? pkg.remarks : [pkg.remarks] : [],
          cod_amount: pkg.cod_amount || 0,
          isOnlinePayment: parseInt(pkg.cod_amount) === 0,
          payment: pkg.payment || '',
          serviceable: pkg.serviceable || false,
          shipmentPayload: shipmentData,
          responsePayload: pkg,
          userId: userId || null,
        }));
        try {
          await DelhiveryOrder.insertMany(ordersToInsert);
        } catch (err) {
          console.error('❌ Error saving DelhiveryOrders:', err.message);
          throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to save shipment data to database');
        }
      }
    }

    return response.data;
  } catch (error) {
    console.error('❌ Error in createShipment:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response error:', error.response.data);
    }
    throw error;
  }
};


const trackShipment = async (waybill, ref_ids) => {
  const params = {};
  if (waybill) params.waybill = waybill;
  if (ref_ids) params.ref_ids = ref_ids;

  const response = await axios.get(
    `${DELHIVERY_BASE_URL}/api/v1/packages/json`,
    {
      params,
      headers: {
        Authorization: `Token ${DELHIVERY_API_KEY}`,
      },
    }
  );
  return response.data;
};

const getRegisteredWarehouses = async () => {
  try {
    const response = await axios.get(
      `${DELHIVERY_BASE_URL}/api/backend/clientwarehouse/all/`,
      {
        headers: {
          Authorization: `Token ${DELHIVERY_API_KEY}`,
        },
      }
    );
    
    console.log('📋 Registered Warehouses:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching warehouses:', error.message);
    if (error.response) {
      console.error('Response error:', error.response.data);
    }
    throw error;
  }
};

module.exports = {
  createShipment,
  trackShipment,
  getRegisteredWarehouses,
};
