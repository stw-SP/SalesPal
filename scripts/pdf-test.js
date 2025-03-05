// PDF Testing Script for SalesPal
// This script allows testing the PDF parsing feature directly
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_URL = 'http://localhost:5001/api/sales/upload';

// Process command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node pdf-test.js <pdf-file-path>');
  process.exit(1);
}

const filePath = path.resolve(args[0]);
if (!fs.existsSync(filePath)) {
  console.error(`Error: File not found: ${filePath}`);
  process.exit(1);
}

// Check if the file is a PDF
if (!filePath.toLowerCase().endsWith('.pdf') && !filePath.toLowerCase().match(/\.(jpe?g|png)$/i)) {
  console.error('Error: File must be a PDF, JPEG, or PNG');
  process.exit(1);
}

// Prepare the form data
const formData = new FormData();
const fileContent = fs.readFileSync(filePath);
const fileBlob = new Blob([fileContent], { type: filePath.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg' });
formData.append('file', fileBlob, path.basename(filePath));

// Upload the file
async function testPdfParsing() {
  try {
    console.log(`Testing PDF parsing for file: ${filePath}`);
    console.log('Uploading to API...');

    const response = await axios.post(API_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.status === 200) {
      console.log('\n=== EXTRACTION SUCCESSFUL ===\n');
      
      // Show extracted text
      console.log('--- Extracted Text ---');
      console.log(response.data.extractedText || 'No text extracted');
      console.log('\n--- Parsed Sale Information ---');
      
      const saleInfo = response.data.saleInfo || {};
      console.log(`Customer: ${saleInfo.customerName || 'Not found'}`);
      console.log(`Phone: ${saleInfo.phoneNumber || 'Not found'}`);
      console.log(`Date: ${saleInfo.date ? new Date(saleInfo.date).toLocaleDateString() : 'Not found'}`);
      console.log(`Store: ${saleInfo.storeLocation || 'Not found'}`);
      console.log(`Total: $${(saleInfo.totalAmount || 0).toFixed(2)}`);
      console.log(`Products: ${Array.isArray(saleInfo.products) ? saleInfo.products.length : 0}`);
      
      if (Array.isArray(saleInfo.products)) {
        saleInfo.products.forEach((product, index) => {
          console.log(`  ${index + 1}. ${product.name} - ${product.quantity} x $${product.price.toFixed(2)}`);
        });
      }
      
      // Show confidence levels
      if (response.data.confidence) {
        console.log('\n--- Confidence Levels ---');
        for (const [key, value] of Object.entries(response.data.confidence)) {
          console.log(`${key}: ${value}`);
        }
      }
    } else {
      console.error('Error processing file:', response.data.message || 'Unknown error');
    }
  } catch (error) {
    console.error('API request failed:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
  }
}

// Run the test
testPdfParsing().catch(console.error);