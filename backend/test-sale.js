// Test script to debug sale saving functionality
const axios = require('axios');

const baseUrl = 'http://localhost:8080/api';

async function testSaveFlow() {
  try {
    console.log('Testing login and sale save flow');
    
    // 1. Login to get token
    console.log(`Attempting to login at ${baseUrl}/auth/login`);
    const loginResponse = await axios.post(`${baseUrl}/auth/login`, {
      email: 'demo@salespal.com',
      password: 'demo123'
    });
    
    console.log('Login successful, received token');
    const token = loginResponse.data.token;
    
    // 2. Create a test sale
    const testSale = {
      customerName: 'Test Customer',
      phoneNumber: '(555) 123-4567',
      products: [
        {
          name: 'Test Phone',
          quantity: 1,
          price: 499.99,
          plan: 'Basic',
          accessories: ['Case', 'Screen Protector']
        }
      ],
      totalAmount: 499.99,
      date: new Date(),
      storeLocation: 'Downtown',
      employee: '1'
    };
    
    console.log(`Test sale data: ${JSON.stringify(testSale, null, 2)}`);
    
    // 3. Test connection to the sales endpoint first
    console.log(`Testing connection to ${baseUrl}/sales endpoint...`);
    try {
      const healthCheck = await axios.get(`${baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Health check successful:', healthCheck.data);
    } catch (healthError) {
      console.log('Health check failed:', healthError.message);
    }
    
    // 4. Now save the sale
    console.log(`Attempting to save sale to ${baseUrl}/sales with token:`, token);
    const saleResponse = await axios.post(
      `${baseUrl}/sales`,
      testSale,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    console.log('Sale saved successfully:');
    console.log(JSON.stringify(saleResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error in test flow:');
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received. Connection issue. Request details:');
      console.error('- URL:', error.config?.url);
      console.error('- Method:', error.config?.method);
      console.error('- Timeout:', error.config?.timeout);
    } else {
      // Something happened in setting up the request
      console.error('Error message:', error.message);
    }
  }
}

// Run the test
testSaveFlow();