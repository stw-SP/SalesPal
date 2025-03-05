// Simple test script to check if the backend is working
const axios = require('axios');

async function testBackend() {
  try {
    console.log('Testing backend health endpoint...');
    const response = await axios.get('http://localhost:5001/api/health');
    console.log('Backend responded with status:', response.status);
    console.log('Response data:', response.data);
    
    console.log('\nTesting login endpoint...');
    try {
      const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
        email: 'admin@salespal.com',
        password: 'demo123'
      });
      console.log('Login successful:', loginResponse.data);
    } catch (loginError) {
      console.error('Login failed:', loginError.message);
      if (loginError.response) {
        console.error('Error response:', loginError.response.data);
      }
    }
    
  } catch (error) {
    console.error('Error connecting to backend:', error.message);
    console.error('Backend is not responding or has an error.');
  }
}

testBackend();