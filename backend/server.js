require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Custom logger function
const logger = {
  info: (message, context = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      level: 'info',
      timestamp,
      message,
      ...context
    };
    console.log(JSON.stringify(logEntry));
    
    // Write to log file if needed
    try {
      const logDir = path.join(__dirname, '../logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(
        path.join(logDir, 'app.log'), 
        JSON.stringify(logEntry) + '\n'
      );
    } catch (e) {
      console.error('Error writing to log file:', e);
    }
  },
  
  error: (message, error = null, context = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      level: 'error',
      timestamp,
      message,
      errorMessage: error?.message,
      stack: error?.stack,
      ...context
    };
    console.error(JSON.stringify(logEntry));
    
    // Write to log file if needed
    try {
      const logDir = path.join(__dirname, '../logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(
        path.join(logDir, 'error.log'), 
        JSON.stringify(logEntry) + '\n'
      );
    } catch (e) {
      console.error('Error writing to log file:', e);
    }
  },
  
  debug: (message, context = {}) => {
    if (process.env.DEBUG_MODE === 'true') {
      const timestamp = new Date().toISOString();
      const logEntry = {
        level: 'debug',
        timestamp,
        message,
        ...context
      };
      console.log(JSON.stringify(logEntry));
      
      // Write to log file if needed
      try {
        const logDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(
          path.join(logDir, 'debug.log'), 
          JSON.stringify(logEntry) + '\n'
        );
      } catch (e) {
        console.error('Error writing to log file:', e);
      }
    }
  },
  
  // Adding missing warn function to fix crashes
  warn: (message, context = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      level: 'warn',
      timestamp,
      message,
      ...context
    };
    console.warn(JSON.stringify(logEntry));
    
    // Write to log file
    try {
      const logDir = path.join(__dirname, '../logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(
        path.join(logDir, 'warn.log'), 
        JSON.stringify(logEntry) + '\n'
      );
    } catch (e) {
      console.error('Error writing to log file:', e);
    }
  }
};

const app = express();
const PORT = process.env.PORT || 5001; // Changed from 5000 to avoid conflicts

// Add health endpoint for testing
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware - Enhanced CORS settings
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5001', '*'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
  exposedHeaders: ['Content-Length', 'Content-Type']
}));

// Add specific OPTIONS handler for preflight requests
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Log when request starts
  logger.info(`Request started: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  // Intercept response to log when finished
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;
    
    // Log completion
    logger.info(`Request completed: ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
    
    return originalSend.call(this, body);
  };
  
  next();
});

logger.info('Server starting up');
logger.info('Using in-memory database for demonstration');

// In-memory database for demo
const inMemoryDB = {
  users: [
    {
      _id: '1',
      name: 'Demo Employee',
      email: 'demo@salespal.com',
      password: '$2b$10$ksMzcZwOhjYANky6xSDsV.eH9WfJWN/FMEGTer8zGNr6Kkmh2p9zG', // hashed 'demo123'
      role: 'employee',
      storeLocation: 'Downtown',
      hireDate: new Date('2021-05-15'),
      commissionRate: 10
    },
    {
      _id: '2',
      name: 'Admin User',
      email: 'admin@salespal.com',
      password: '$2b$10$ksMzcZwOhjYANky6xSDsV.eH9WfJWN/FMEGTer8zGNr6Kkmh2p9zG', // hashed 'demo123'
      role: 'admin',
      storeLocation: 'Main Store',
      hireDate: new Date('2020-01-01'),
      commissionRate: 15
    }
  ],
  sales: []
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 
      'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
    }
  }
});

// Improved PDF parsing function with error handling
async function parsePdf(filePath) {
  try {
    logger.debug('Starting improved PDF parsing', { filePath });
    
    // Check if file exists first
    if (!fs.existsSync(filePath)) {
      logger.error('PDF file does not exist', { filePath });
      return ''; // Return empty string instead of throwing
    }
    
    // Read file with strict error handling
    let dataBuffer;
    try {
      dataBuffer = fs.readFileSync(filePath);
      if (!dataBuffer || dataBuffer.length === 0) {
        logger.error('Empty PDF file', { filePath });
        return ''; // Return empty string for empty files
      }
    } catch (readError) {
      logger.error('Failed to read PDF file', readError, { filePath });
      return ''; // Return empty string instead of throwing
    }
    
    try {
      // Simple approach using basic options to avoid viewport issues
      const data = await pdfParse(dataBuffer);
      
      // Process the text regardless of length - never return null/undefined
      let extractedText = (data && data.text) ? data.text : '';
      
      // Basic cleanup
      extractedText = extractedText
        .replace(/\s+/g, ' ')         // Replace multiple spaces with single space
        .replace(/(\w)\s*\n\s*(\w)/g, '$1 $2') // Join words broken by line breaks
        .replace(/\n{3,}/g, '\n\n')   // Replace excessive line breaks
        .trim();
      
      // Fix doubled characters (a common issue with certain PDFs)
      // Look for patterns like "LLSSPP" (actually "LSP" with doubled chars)
      const doubledCharRegex = /([A-Za-z])(?=\1)/g;
      extractedText = extractedText.replace(doubledCharRegex, '');
      
      // Fix doubled dollar signs and periods (common in PDFs with encoding issues)
      extractedText = extractedText
        .replace(/\$\$/g, '$')       // Replace $$ with $
        .replace(/\.\./g, '.')       // Replace .. with .
        .replace(/--/g, '-');        // Replace -- with -
      
      // Add more space after common sections to help with parsing
      const sectionMarkers = [
        'CUSTOMER', 'INVOICE', 'BILL TO', 'SHIP TO', 'TOTAL',
        'SUBTOTAL', 'TAX', 'ITEMS', 'PRODUCTS', 'ACCESSORIES'
      ];
      
      sectionMarkers.forEach(marker => {
        const regex = new RegExp(`(${marker}:?)`, 'gi');
        extractedText = extractedText.replace(regex, '\n$1\n');
      });
      
      // Log the result but don't use warn (it's not critical if text is short)
      if (extractedText.trim().length < 20) {
        logger.info('PDF parsing returned short text', { 
          filePath,
          textLength: extractedText.length
        });
      } else {
        logger.debug('PDF parsing successful', { 
          textLength: extractedText.length,
          pages: data?.numpages || 0
        });
      }
      
      return extractedText;
      
    } catch (parseError) {
      // Log the error but don't crash
      logger.error('PDF parsing error', parseError, { filePath });
      
      // Try an even simpler approach as fallback (just extract text, no options)
      try {
        logger.info('Attempting simplified PDF parsing fallback');
        const simpleOptions = { max: 5 }; // Limit to 5 pages for performance
        const fallbackData = await pdfParse(dataBuffer, simpleOptions);
        return (fallbackData && fallbackData.text) ? fallbackData.text : '';
      } catch (fallbackError) {
        logger.error('Fallback PDF parsing also failed', fallbackError);
        return ''; // Return empty string on complete failure
      }
    }
  } catch (error) {
    logger.error('PDF parsing outer error', error, { filePath });
    // Return empty string instead of throwing to prevent crashes
    return '';
  }
}

// Improved OCR function for images with better receipt recognition
async function performOcr(filePath) {
  let worker = null;
  try {
    logger.debug('Starting improved OCR processing', { filePath });
    
    // Check if file exists first
    if (!fs.existsSync(filePath)) {
      logger.error('Image file does not exist', { filePath });
      return ''; // Return empty string instead of throwing
    }
    
    try {
      // Create worker with optimized settings for receipt OCR
      worker = await createWorker({
        logger: m => logger.debug('Tesseract:', m),
        errorHandler: e => logger.error('Tesseract error:', e)
      });
      
      // Load English language data
      await worker.loadLanguage('eng');
      
      // Initialize with English and set page segmentation mode to 6 (assume single uniform block of text)
      // This works better for receipts than the default setting
      await worker.initialize('eng');
      
      // Set additional parameters to improve receipt recognition
      await worker.setParameters({
        preserve_interword_spaces: '1',
        tessedit_ocr_engine_mode: '1', // Use combined OCR engine
      });
      
      logger.debug('OCR worker initialized with receipt-optimized settings', { filePath });
      
      // Set a timeout for the OCR operation
      let ocrResult = null;
      const OCR_TIMEOUT = 60000; // 60 seconds (longer timeout for better recognition)
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OCR timed out after 60 seconds')), OCR_TIMEOUT);
      });
      
      const recognizePromise = worker.recognize(filePath).then(result => {
        if (!result || !result.data) {
          throw new Error('OCR returned empty result');
        }
        return result.data.text || '';
      });
      
      // Race the promises
      ocrResult = await Promise.race([recognizePromise, timeoutPromise]);
      
      // Post-process OCR text to improve quality for parsing
      if (ocrResult) {
        // Clean up common OCR errors in receipts
        ocrResult = ocrResult
          .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
          .replace(/(\d)\s+\.\s+(\d)/g, '$1.$2') // Fix decimal points
          .replace(/\$\s+/g, '$') // Fix dollar signs
          .replace(/(\w)\s*\n\s*(\w)/g, '$1 $2') // Join words broken by line breaks
          .replace(/\n{3,}/g, '\n\n') // Replace excessive line breaks
          .trim();
          
        // Add more space around common receipt headers
        const sectionMarkers = [
          'CUSTOMER', 'INVOICE', 'RECEIPT', 'BILL TO', 'SHIP TO', 'TOTAL',
          'SUBTOTAL', 'TAX', 'ITEMS', 'PRODUCTS', 'PHONE', 'DATE', 'PAYMENT'
        ];
        
        sectionMarkers.forEach(marker => {
          const regex = new RegExp(`(${marker}:?)`, 'gi');
          ocrResult = ocrResult.replace(regex, '\n$1\n');
        });
      }
      
      logger.debug('OCR recognition complete', { 
        textLength: ocrResult?.length || 0,
        preview: ocrResult?.substring(0, 50)
      });
      
      return ocrResult || '';
    } catch (ocrError) {
      logger.error('OCR engine error', ocrError, { filePath });
      
      // Try a simplified fallback with fewer options
      try {
        if (worker) {
          logger.info('Attempting OCR fallback with simpler settings');
          
          // Reset worker parameters to default for second attempt
          await worker.setParameters({});
          
          const fallbackResult = await worker.recognize(filePath);
          if (fallbackResult && fallbackResult.data && fallbackResult.data.text) {
            logger.info('OCR fallback successful');
            return fallbackResult.data.text;
          }
        }
      } catch (fallbackError) {
        logger.error('OCR fallback also failed', fallbackError);
      }
      
      // Instead of throwing, return empty string with warning to let the process continue
      logger.warn('Returning empty OCR result due to error');
      return '';
    }
  } catch (error) {
    logger.error('OCR outer error', error, { filePath });
    // Return empty string instead of throwing to prevent crashes
    return '';
  } finally {
    // Always ensure worker is terminated to prevent memory leaks
    if (worker) {
      try {
        await worker.terminate();
        logger.debug('OCR worker terminated', { filePath });
      } catch (terminateError) {
        logger.error('Error terminating OCR worker', terminateError);
        // Continue even if termination fails
      }
    }
  }
}

// Improved implementation of extractSaleInfoWithRegex that uses the new parser module
function extractSaleInfoWithRegex(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    logger.warn('Empty or invalid text provided to extractSaleInfoWithRegex');
    return null;
  }
  
  logger.info('Extracting sale info from text with length: ' + text.length);
  
  // Try to use our enhanced parser
  
  try {
    // Try to find customer name - look for common customer name patterns
    const customerPatterns = [
      /customer\s*:\s*([^\n]+)/i,
      /customer\s*name\s*:\s*([^\n]+)/i,
      /bill\s*to\s*:\s*([^\n]+)/i,
      /sold\s*to\s*:\s*([^\n]+)/i,
      /name\s*:\s*([^\n]+)/i
    ];
    
    for (const pattern of customerPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        result.customerName = match[1].trim();
        break;
      }
    }
    
    // Try to find phone number
    const phonePattern = /(\(\d{3}\)\s*\d{3}[-\s]\d{4}|\d{3}[-\s]\d{3}[-\s]\d{4})/;
    const phoneMatch = text.match(phonePattern);
    if (phoneMatch) {
      result.phoneNumber = phoneMatch[1];
    }
    
    // Find store location
    const storePatterns = [
      /store\s*:\s*([^\n]+)/i,
      /location\s*:\s*([^\n]+)/i,
      /branch\s*:\s*([^\n]+)/i
    ];
    
    for (const pattern of storePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        result.storeLocation = match[1].trim();
        break;
      }
    }
    
    // Find order number
    const orderPatterns = [
      /order\s*#\s*:\s*([^\s\n]+)/i,
      /order\s*number\s*:\s*([^\s\n]+)/i,
      /invoice\s*#\s*:\s*([^\s\n]+)/i,
      /receipt\s*#\s*:\s*([^\s\n]+)/i,
      /transaction\s*:\s*([^\s\n]+)/i
    ];
    
    for (const pattern of orderPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        result.orderNumber = match[1].trim();
        break;
      }
    }
    
    // Find date
    const datePatterns = [
      /date\s*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const dateStr = match[1];
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          result.date = parsedDate;
          break;
        }
      }
    }
    
    // Try to find total amount
    const totalPatterns = [
      /total\s*:\s*\$?\s*(\d+[\.,]\d{2})/i,
      /total\s*amount\s*:\s*\$?\s*(\d+[\.,]\d{2})/i,
      /amount\s*due\s*:\s*\$?\s*(\d+[\.,]\d{2})/i,
      /grand\s*total\s*:\s*\$?\s*(\d+[\.,]\d{2})/i,
      /\btotal\b.*?\$\s*(\d+[\.,]\d{2})/i
    ];
    
    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        result.totalAmount = parseFloat(match[1].replace(',', '.'));
        break;
      }
    }
    
    // Try to extract products - this is the hardest part with regex
    // Look for patterns of product listings, typically with a product name and price
    const productLines = text.split('\n');
    let products = [];
    
    for (let i = 0; i < productLines.length; i++) {
      const line = productLines[i].trim();
      
      // Skip short lines and header lines
      if (line.length < 5 || /total|subtotal|tax|date|customer|phone|^\s*$/i.test(line)) {
        continue;
      }
      
      // Try to match a product line with price at the end
      const productMatch = line.match(/(.+?)[\s\t]*[\$]?\s*(\d+[\.,]\d{2})(?:\s*$)/);
      if (productMatch) {
        const fullName = productMatch[1].trim();
        const price = parseFloat(productMatch[2].replace(',', '.'));
        
        // Skip obvious non-products
        if (fullName.toLowerCase().includes('total') || fullName.toLowerCase().includes('subtotal')) {
          continue;
        }
        
        // Try to extract quantity if present
        let quantity = 1;
        let name = fullName;
        
        const qtyMatch = fullName.match(/^(\d+)\s*x\s*(.+)$/) || fullName.match(/^(\d+)\s+(.+)$/);
        if (qtyMatch) {
          quantity = parseInt(qtyMatch[1]);
          name = qtyMatch[2].trim();
        }
        
        // Determine product category based on its name
        let category = 'accessory'; // Default category
        
        if (/phone|iphone|samsung|pixel|galaxy|android|apple/i.test(name)) {
          if (/upgrade/i.test(name)) {
            category = 'upgrade';
          } else {
            category = 'activation';
          }
        } else if (/plan|service|contract/i.test(name)) {
          category = 'service';
        } else if (/protection|insurance|warranty|coverage/i.test(name)) {
          category = 'protection';
        }
        
        products.push({
          name,
          quantity,
          price,
          category
        });
      }
    }
    
    // If we didn't find any products but found a total, create a generic product
    if (products.length === 0 && result.totalAmount > 0) {
      products.push({
        name: 'Unspecified Product',
        quantity: 1,
        price: result.totalAmount,
        category: 'accessory'
      });
    }
    
    result.products = products;
    
    // Log the extracted results
    logger.info('Extraction complete with regex', {
      customerName: result.customerName,
      productsFound: result.products.length,
      totalAmount: result.totalAmount
    });
    
    return result;
  } catch (error) {
    logger.error('Error extracting sale info with regex', error);
    return null;
  }
}

// Extract sale information using first the improved regex parser and falling back to Claude if needed
async function extractSaleInfoWithClaude(text) {
  // Define reasonable limits for parsing
  const MAX_PRODUCTS = 20;
  const MAX_QUANTITY = 100;
  const MAX_PRICE = 10000;
  const MAX_TOTAL = 100000;
  
  // First try the improved regex parser that handles bolded headers
  try {
    logger.info('Trying improved regex parser with bolded header detection');
    const regexResults = extractSaleInfoWithRegex(text);
    
    // Check if we got reasonable results to determine if we should use them
    const hasGoodData = regexResults && 
                      Array.isArray(regexResults.products) && 
                      regexResults.products.length > 0 && 
                      regexResults.products.some(p => p.price > 0) &&
                      regexResults.totalAmount > 0;
    
    if (hasGoodData) {
      logger.info('Using enhanced parser results - extraction successful', {
        productsFound: regexResults.products.length,
        totalAmount: regexResults.totalAmount
      });
      return regexResults;
    }
    
    logger.info('Enhanced parser did not produce good results, falling back to Claude');
  } catch (regexError) {
    logger.error('Error in enhanced parser, falling back to Claude', regexError);
  }
  
  // If regex parser didn't produce good results, try Claude
  const prompt = `
You are a receipt and invoice parser for a mobile phone store. Extract the following information from this receipt/invoice text:
1. Customer name
2. Phone number
3. Date of purchase/sale
4. List of products with names, quantities, and prices
5. Total amount
6. Store location (if present)
7. Sales representative name (if present)

IMPORTANT CONSTRAINTS:
- Maximum of 20 products
- Maximum quantity per product: 100
- Maximum price per product: $10,000
- Maximum total amount: $100,000
- If any value exceeds these limits, cap it at the maximum

For mobile phone products, try to identify:
- Phone model name/number
- Plan type (if mentioned)
- Any accessories

Here is the receipt/invoice text:
${text}

Return the information in valid JSON format like this:
{
  "customerName": "...",
  "phoneNumber": "...",
  "date": "YYYY-MM-DD",
  "products": [
    {"name": "...", "quantity": X, "price": X.XX, "plan": "...", "accessories": ["...", "..."]},
    ...
  ],
  "totalAmount": X.XX,
  "storeLocation": "...",
  "salesperson": "..."
}

If some information is not found in the receipt, use null or empty arrays as appropriate.
Use your judgment to interpret unclear text. Work step by step to extract each piece of information.
Your JSON MUST be valid and parseable.
`;

  try {
    const response = await askClaude(prompt);
    
    logger.debug('Claude receipt parsing response received', {
      responseLength: response.length,
      preview: response.substring(0, 50)
    });
    
    // Extract JSON from Claude's response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsedData = JSON.parse(jsonMatch[0]);
        
        // Format to match our expected structure
        return {
          customerName: parsedData.customerName || '',
          phoneNumber: parsedData.phoneNumber || '',
          date: parsedData.date ? new Date(parsedData.date) : new Date(),
          products: Array.isArray(parsedData.products) ? parsedData.products.map(p => ({
            name: p.name || 'Unknown Product',
            quantity: parseInt(p.quantity) || 1,
            price: parseFloat(p.price) || 0,
            plan: p.plan || '',
            accessories: Array.isArray(p.accessories) ? p.accessories : []
          })) : [],
          totalAmount: parseFloat(parsedData.totalAmount) || 0,
          storeLocation: parsedData.storeLocation || '',
          salesperson: parsedData.salesperson || ''
        };
      } catch (parseError) {
        logger.error('Error parsing JSON from Claude response:', parseError, {
          jsonMatch: jsonMatch[0].substring(0, 100)
        });
      }
    }
  } catch (err) {
    logger.error('Error with Claude receipt parsing:', err);
  }
  
  // If Claude parsing also fails, fall back to regex again but return the results regardless
  logger.info('Claude parsing failed, using regex extraction results');
  return extractSaleInfoWithRegex(text);
}

// Import the improved parser modules
const { extractSaleInfoWithRegex: enhancedExtractSaleInfoWithRegex } = require('./parser/enhanced-regex');

// Replace the original function with the enhanced version
function extractSaleInfoWithRegex(text) {
  return enhancedExtractSaleInfoWithRegex(text);
}





// Helper functions moved to the dedicated parser module

// Routes
// Upload sale receipt or invoice
app.post('/api/sales/upload', (req, res) => {
  let filePath = null;
  
  // Use a wrapper to catch synchronous errors in multer middleware
  upload.single('file')(req, res, async (uploadError) => {
    try {
      // First handle any multer upload errors
      if (uploadError) {
        logger.error('Multer upload error', uploadError);
        return res.status(400).json({ 
          message: 'Error uploading file: ' + uploadError.message 
        });
      }
      
      logger.debug('Starting file upload processing');
      
      // Validate request has a file
      if (!req.file) {
        logger.error('No file uploaded in request');
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Validate file size (limit to 15MB for demo)
      const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
      if (req.file.size > MAX_FILE_SIZE) {
        logger.error('File too large', { 
          size: req.file.size, 
          maxSize: MAX_FILE_SIZE 
        });
        
        // Clean up the file
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (cleanupError) {
          logger.error('Error cleaning up oversized file', cleanupError);
        }
        
        return res.status(400).json({ 
          message: 'File too large. Maximum size is 15MB' 
        });
      }

      // Additional file validation
      if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(req.file.mimetype)) {
        logger.error('Invalid file type', { mimetype: req.file.mimetype });
        
        // Clean up the file
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (cleanupError) {
          logger.error('Error cleaning up invalid file', cleanupError);
        }
        
        return res.status(400).json({
          message: 'Invalid file type. Only JPEG, PNG, and PDF are allowed.'
        });
      }

      logger.info('File received for processing', {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        savedPath: req.file.path
      });
      
      filePath = req.file.path;
      let extractedText = '';
      
      // Make sure the file exists on disk
      if (!fs.existsSync(filePath)) {
        logger.error('File does not exist after upload', { filePath });
        return res.status(500).json({
          message: 'File upload failed. The file was not saved correctly.'
        });
      }

      // Store example files in a special folder
      if (req.file.originalname.toLowerCase().includes('example') || 
          req.file.originalname.toLowerCase().includes('sample')) {
        try {
          const exampleDir = path.join(__dirname, '../uploads/Example');
          if (!fs.existsSync(exampleDir)) {
            fs.mkdirSync(exampleDir, { recursive: true });
          }
          
          const destPath = path.join(exampleDir, req.file.originalname);
          fs.copyFileSync(filePath, destPath);
          logger.info('Saved example file', { destPath });
        } catch (copyError) {
          logger.error('Failed to save example file', copyError);
          // Continue processing even if example saving fails
        }
      }

      // Process file based on type
      try {
        if (req.file.mimetype === 'application/pdf') {
          logger.debug('Processing PDF file with improved parser', { filePath });
          try {
            extractedText = await parsePdf(filePath);
            // Double check that we got something back
            if (extractedText === null || extractedText === undefined) {
              extractedText = '';
              logger.warn('PDF parser returned null/undefined', { filePath });
            }
          } catch (pdfError) {
            logger.error('Failed to parse PDF', pdfError, { filePath });
            extractedText = '';
          }
          
          logger.debug('PDF processing complete', { 
            textLength: extractedText?.length || 0,
            previewText: extractedText?.substring(0, 100) + '...' || 'No text extracted'
          });
        } else {
          // Assume it's an image
          logger.debug('Processing image with improved OCR', { filePath, mimetype: req.file.mimetype });
          try {
            extractedText = await performOcr(filePath);
            // Double check that we got something back
            if (extractedText === null || extractedText === undefined) {
              extractedText = '';
              logger.warn('OCR returned null/undefined', { filePath });
            }
          } catch (ocrError) {
            logger.error('Failed to perform OCR', ocrError, { filePath });
            extractedText = '';
          }
          
          logger.debug('OCR processing complete', { 
            textLength: extractedText?.length || 0,
            previewText: extractedText?.substring(0, 100) + '...' || 'No text extracted'
          });
        }
      } catch (processingError) {
        logger.error('Error in file processing block', processingError, { filePath });
        
        // Don't return error, continue with empty text
        extractedText = '';
      }
      
      // Ensure extractedText is a string
      if (typeof extractedText !== 'string') {
        logger.warn('extractedText is not a string, converting', { 
          type: typeof extractedText, 
          value: extractedText 
        });
        extractedText = String(extractedText || '');
      }
      
      // Check if we have at least some meaningful text
      if (extractedText.trim().length < 10) {
        logger.warn('Extracted text too short, might need to retry with different settings', {
          textLength: extractedText.trim().length
        });
      }
      
      // Create a minimal sale information structure as fallback
      const defaultSaleInfo = {
        customerName: '',
        phoneNumber: '',
        products: [{ name: 'Unknown Product', quantity: 1, price: 0 }],
        totalAmount: 0,
        date: new Date(),
        receiptImage: req.file.path,
        storeLocation: '',
        salesperson: ''
      };
      
      // First try extracting with Claude (most accurate)
      logger.debug('Starting sale information extraction using Claude');
      let saleInfo = { ...defaultSaleInfo };
      
      if (extractedText && extractedText.trim().length > 0) {
        try {
          // Try to extract sale info with Claude
          const claudeExtractedInfo = await extractSaleInfoWithClaude(extractedText);
          
          if (claudeExtractedInfo && typeof claudeExtractedInfo === 'object') {
            saleInfo = claudeExtractedInfo;
            logger.info('Successfully extracted sale info with Claude');
          } else {
            logger.warn('Claude extraction failed, falling back to regex', { claudeExtractedInfo });
            
            // Fall back to regex extraction
            const regexExtractedInfo = extractSaleInfoWithRegex(extractedText);
            if (regexExtractedInfo && typeof regexExtractedInfo === 'object') {
              saleInfo = regexExtractedInfo;
              logger.info('Successfully extracted sale info with regex fallback');
            } else {
              logger.warn('Regex extraction also failed, using defaults', { regexExtractedInfo });
            }
          }
            
          // Ensure products array exists
          if (!Array.isArray(saleInfo.products) || saleInfo.products.length === 0) {
            logger.warn('No products in extracted info, using default', { saleInfo });
            saleInfo.products = [{ name: 'Unknown Product', quantity: 1, price: 0 }];
          }
          
          // Ensure date is valid
          if (!saleInfo.date || isNaN(new Date(saleInfo.date).getTime())) {
            logger.warn('Invalid date in extracted info, using default', { 
              date: saleInfo.date 
            });
            saleInfo.date = new Date();
          }
        } catch (extractionError) {
          logger.error('Error in sale info extraction', extractionError, { 
            textLength: extractedText.length 
          });
          // Continue with default sale info
        }
      } else {
        logger.info('No text to extract sale info from, using defaults');
      }
      
      // Store original file reference
      saleInfo.receiptImage = req.file.path;
      
      // Add confidence levels for parsed data
      const confidence = {
        overall: saleInfo.customerName && saleInfo.products.length > 0 && saleInfo.totalAmount > 0 ? 'high' : 'medium',
        customerName: saleInfo.customerName ? 'high' : 'low',
        phoneNumber: saleInfo.phoneNumber ? 'high' : 'low',
        products: Array.isArray(saleInfo.products) && saleInfo.products.length > 0 && 
                  saleInfo.products[0].name !== 'Unknown Product' ? 'high' : 'low',
        totalAmount: saleInfo.totalAmount > 0 ? 'high' : 'low',
        date: saleInfo.date && !isNaN(new Date(saleInfo.date).getTime()) ? 'high' : 'low',
        storeLocation: saleInfo.storeLocation ? 'high' : 'low',
        salesperson: saleInfo.salesperson ? 'high' : 'low'
      };
      
      logger.info('File processing complete', {
        filename: req.file.originalname,
        confidence,
        hasCustomerName: !!saleInfo.customerName,
        productsFound: saleInfo.products?.length || 0
      });
      
      // Create a sanitized version of saleInfo with proper defaults
      const sanitizedSaleInfo = {
        customerName: typeof saleInfo.customerName === 'string' ? saleInfo.customerName : '',
        phoneNumber: typeof saleInfo.phoneNumber === 'string' ? saleInfo.phoneNumber : '',
        products: Array.isArray(saleInfo.products) ? saleInfo.products.map(p => ({
          name: typeof p?.name === 'string' ? p.name : 'Unknown Product',
          quantity: parseInt(p?.quantity) || 1,
          price: parseFloat(p?.price) || 0,
          plan: typeof p?.plan === 'string' ? p.plan : '',
          accessories: Array.isArray(p?.accessories) ? p.accessories : []
        })) : [{ name: 'Unknown Product', quantity: 1, price: 0, plan: '', accessories: [] }],
        totalAmount: parseFloat(saleInfo.totalAmount) || 0,
        date: saleInfo.date && !isNaN(new Date(saleInfo.date).getTime()) ? 
          new Date(saleInfo.date) : new Date(),
        receiptImage: saleInfo.receiptImage,
        storeLocation: typeof saleInfo.storeLocation === 'string' ? saleInfo.storeLocation : '',
        salesperson: typeof saleInfo.salesperson === 'string' ? saleInfo.salesperson : ''
      };
      
      // Send successful response
      return res.json({
        message: 'File processed successfully',
        extractedText,
        saleInfo: sanitizedSaleInfo,
        originalData: { ...sanitizedSaleInfo }, // Make a clean copy of the sanitized data
        confidence,
        filePath: req.file.path
      });
    } catch (error) {
      // Log the comprehensive error
      logger.error('Unhandled error in file upload handler', error, {
        filename: req.file?.originalname,
        mimetype: req.file?.mimetype,
        path: filePath,
        stack: error.stack
      });
      
      // Send a safe error response
      return res.status(500).json({ 
        message: 'Server error processing file. Please try again with a different file.',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    } finally {
      // In this implementation, we keep the uploaded files for potential future reference
      // We don't clean them up on error as we want to keep them for debugging
      if (error && filePath && fs.existsSync(filePath)) {
        try {
          // Instead of deleting, we'll move to an error folder for investigation
          const errorDir = path.join(__dirname, '../uploads/errors');
          if (!fs.existsSync(errorDir)) {
            fs.mkdirSync(errorDir, { recursive: true });
          }
          
          const errorPath = path.join(errorDir, `error_${Date.now()}_${path.basename(filePath)}`);
          fs.renameSync(filePath, errorPath);
          logger.debug('Moved error file for debugging', { 
            originalPath: filePath, 
            errorPath 
          });
        } catch (moveError) {
          logger.error('Error moving error file', moveError, { filePath });
        }
      }
    }
  });
});

// Manual sale entry
app.post('/api/sales', async (req, res) => {
  try {
    logger.info('Sale creation request received', { 
      contentType: req.headers['content-type'],
      bodySize: JSON.stringify(req.body).length
    });
    
    const saleData = req.body;
    console.log('Sale data received:', saleData);
    
    // Validate incoming data
    if (!saleData || typeof saleData !== 'object') {
      logger.warn('Invalid sale data format', { 
        receivedType: typeof saleData 
      });
      return res.status(400).json({ message: 'Invalid sale data provided' });
    }
    
    // Validate products array
    if (!Array.isArray(saleData.products) || saleData.products.length === 0) {
      logger.warn('Missing products in sale data', { 
        productsData: saleData.products
      });
      return res.status(400).json({ message: 'Sale must include at least one product' });
    }
    
    // Validate and sanitize products
    const MAX_QUANTITY = 1000; // Reasonable limit
    const MAX_PRICE = 10000; // $10,000 max price
    const MAX_TOTAL = 1000000; // $1,000,000 max total
    
    // Create a sanitized products array
    const sanitizedProducts = [];
    let calculatedTotal = 0;
    
    for (const product of saleData.products) {
      // Validate product format
      if (!product || typeof product !== 'object') {
        logger.warn('Invalid product data format', { product });
        return res.status(400).json({ message: 'Invalid product data format' });
      }
      
      // Extract and validate quantity
      let quantity = parseInt(product.quantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        logger.warn('Invalid quantity, defaulting to 1', {
          product: product.name,
          receivedQuantity: product.quantity
        });
        quantity = 1; // Default to 1 if invalid
      } else if (quantity > MAX_QUANTITY) {
        logger.warn('Quantity exceeds maximum', {
          product: product.name,
          quantity,
          maxQuantity: MAX_QUANTITY
        });
        return res.status(400).json({ 
          message: `Invalid quantity. Maximum allowed is ${MAX_QUANTITY}`,
          details: { productName: product.name, quantity }
        });
      }
      
      // Extract and validate price
      let price = parseFloat(product.price);
      if (isNaN(price) || price < 0) {
        logger.warn('Invalid price, defaulting to 0', {
          product: product.name,
          receivedPrice: product.price
        });
        price = 0; // Default to 0 if invalid
      } else if (price > MAX_PRICE) {
        logger.warn('Price exceeds maximum', {
          product: product.name,
          price,
          maxPrice: MAX_PRICE
        });
        return res.status(400).json({ 
          message: `Invalid price. Maximum allowed is $${MAX_PRICE}`,
          details: { productName: product.name, price }
        });
      }
      
      // Calculate line total and validate
      const lineTotal = price * quantity;
      if (lineTotal > MAX_TOTAL) {
        logger.warn('Product total exceeds maximum', {
          product: product.name,
          quantity,
          price,
          lineTotal,
          maxTotal: MAX_TOTAL
        });
        return res.status(400).json({ 
          message: `Product total exceeds maximum allowed value of $${MAX_TOTAL}`,
          details: { productName: product.name, quantity, price, lineTotal }
        });
      }
      
      // Add to calculated total
      calculatedTotal += lineTotal;
      
      // Add sanitized product to array
      sanitizedProducts.push({
        name: (product.name || 'Unknown Product').substring(0, 100), // Limit name length
        quantity,
        price,
        category: product.category || 'other',
        plan: (product.plan || '').substring(0, 50), // Limit plan length
        accessories: Array.isArray(product.accessories) 
          ? product.accessories.map(a => a.substring(0, 50)).slice(0, 10) // Limit accessories
          : []
      });
    }
    
    // Validate total amount
    const providedTotal = parseFloat(saleData.totalAmount) || 0;
    
    // If provided total is too large or doesn't match calculated total within 1%
    if (providedTotal > MAX_TOTAL) {
      logger.warn('Total amount exceeds maximum', {
        providedTotal,
        maxTotal: MAX_TOTAL
      });
      return res.status(400).json({ 
        message: `Total amount exceeds maximum allowed value of $${MAX_TOTAL}`,
        details: { providedTotal }
      });
    }
    
    // Allow small discrepancy between calculated and provided total (for rounding, etc.)
    const tolerance = Math.max(calculatedTotal * 0.01, 1); // 1% or $1, whichever is greater
    if (Math.abs(calculatedTotal - providedTotal) > tolerance) {
      logger.warn('Total amount mismatch', {
        calculatedTotal, 
        providedTotal,
        difference: Math.abs(calculatedTotal - providedTotal)
      });
      // Uncomment this to enforce matching totals
      // return res.status(400).json({ 
      //   message: 'Total amount does not match sum of products',
      //   details: { calculatedTotal, providedTotal }
      // });
    }
    
    // Check if this is an invoice/receipt upload with modifications
    let approvalStatus = 'approved'; // Default status
    
    if (saleData.originalData) {
      try {
        // Ensure we have valid data for comparison
        const original = saleData.originalData || {};
        const modified = {
          customerName: saleData.customerName || '',
          phoneNumber: saleData.phoneNumber || '',
          products: sanitizedProducts,
          totalAmount: providedTotal,
          date: saleData.date || new Date()
        };
        
        logger.debug('Comparing original vs modified sale data');
        
        // Check if any fields were modified with proper type handling
        const wasModified = 
          (original.customerName || '') !== (modified.customerName || '') ||
          (original.phoneNumber || '') !== (modified.phoneNumber || '') ||
          (parseFloat(original.totalAmount) || 0) !== providedTotal;
        
        // Date comparison with error handling
        let dateModified = false;
        try {
          if (original.date && modified.date) {
            const origDate = new Date(original.date);
            const modDate = new Date(modified.date);
            
            if (!isNaN(origDate.getTime()) && !isNaN(modDate.getTime())) {
              dateModified = origDate.toDateString() !== modDate.toDateString();
            }
          }
        } catch (e) {
          logger.error('Date comparison error:', e);
        }
        
        // Check if products were modified with proper error handling
        let productsModified = false;
        
        // Ensure products are arrays
        const origProducts = Array.isArray(original.products) ? original.products : [];
        
        if (origProducts.length !== sanitizedProducts.length) {
          productsModified = true;
        } else {
          for (let i = 0; i < origProducts.length; i++) {
            const origProd = origProducts[i] || {};
            const modProd = sanitizedProducts[i];
            
            if (
              (origProd.name || '') !== modProd.name ||
              (parseFloat(origProd.quantity) || 0) !== modProd.quantity ||
              (parseFloat(origProd.price) || 0) !== modProd.price
            ) {
              productsModified = true;
              break;
            }
          }
        }
        
        // Set approval status if modified
        if (wasModified || dateModified || productsModified) {
          approvalStatus = 'pending';
          logger.info('Sale marked as pending approval due to modifications', {
            wasModified,
            dateModified,
            productsModified
          });
        }
      } catch (err) {
        logger.error('Error during data comparison:', err);
        // If there's an error in comparison, default to approved
        approvalStatus = 'approved';
      }
    }
    
    // User ID validation - default to demo employee if auth validation fails
    const userId = req.user?._id || '1';
    logger.debug('Using user ID for sale', { userId, fromAuth: !!req.user });
    
    // Generate a unique ID for the sale (based on timestamp)
    const saleId = Date.now().toString();
    
    // Create the final sale object with all validated/sanitized data
    const newSale = {
      _id: saleId,
      customerName: (saleData.customerName || '').substring(0, 100),
      phoneNumber: (saleData.phoneNumber || '').substring(0, 20),
      products: sanitizedProducts,
      totalAmount: providedTotal,
      date: new Date(saleData.date || new Date()),
      storeLocation: (saleData.storeLocation || '').substring(0, 50),
      employee: saleData.employee || userId,
      commission: saleData.commission || 0,
      approvalStatus,
      createdAt: new Date(),
      modifiedBy: saleData.originalData ? userId : null,
      modifiedAt: saleData.originalData ? new Date() : null,
      approvedBy: null,
      approvedAt: null
    };
    
    // Save to database
    try {
      inMemoryDB.sales.push(newSale);
      logger.info('Sale saved successfully', { 
        saleId: newSale._id,
        customerName: newSale.customerName,
        totalAmount: newSale.totalAmount,
        productCount: newSale.products.length
      });
      
      // Return the created sale
      return res.status(201).json(newSale);
    } catch (dbError) {
      logger.error('Database error while saving sale', dbError);
      return res.status(500).json({ 
        message: 'Error saving sale to database',
        error: dbError.message
      });
    }
  } catch (error) {
    logger.error('Unhandled error in sale creation', error, {
      stack: error.stack
    });
    
    // Return a user-friendly error
    return res.status(500).json({ 
      message: 'Failed to save sale. Please try again or contact support if the issue persists.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all sales
app.get('/api/sales', async (req, res) => {
  try {
    const sales = inMemoryDB.sales.map(sale => {
      const employee = inMemoryDB.users.find(user => user._id === sale.employee);
      return {
        ...sale,
        employee: { name: employee?.name, email: employee?.email }
      };
    });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sales', error: error.message });
  }
});

// Get sales by employee
app.get('/api/sales/employee/:employeeId', async (req, res) => {
  try {
    const sales = inMemoryDB.sales.filter(sale => sale.employee === req.params.employeeId);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employee sales', error: error.message });
  }
});

// Get pending sales requiring approval
app.get('/api/sales/pending', async (req, res) => {
  try {
    // Only admins can view pending sales
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
    }
    
    const pendingSales = inMemoryDB.sales
      .filter(sale => sale.approvalStatus === 'pending')
      .map(sale => {
        const employee = inMemoryDB.users.find(user => user._id === sale.employee);
        return {
          ...sale,
          employee: { name: employee?.name, email: employee?.email }
        };
      });
    
    res.json(pendingSales);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending sales', error: error.message });
  }
});

// Approve or reject a pending sale
app.patch('/api/sales/:id/approval', async (req, res) => {
  try {
    // Only admins can approve sales
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
    }
    
    const { action, notes } = req.body;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be "approve" or "reject".' });
    }
    
    const saleIndex = inMemoryDB.sales.findIndex(sale => sale._id === req.params.id);
    
    if (saleIndex === -1) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    const sale = inMemoryDB.sales[saleIndex];
    
    if (sale.approvalStatus !== 'pending') {
      return res.status(400).json({ message: 'This sale is not pending approval' });
    }
    
    // Update the sale status
    inMemoryDB.sales[saleIndex] = {
      ...sale,
      approvalStatus: action === 'approve' ? 'approved' : 'rejected',
      approvalNotes: notes || '',
      approvedBy: req.user._id,
      approvedAt: new Date()
    };
    
    res.json({
      message: `Sale ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      sale: inMemoryDB.sales[saleIndex]
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating sale approval', error: error.message });
  }
});

// Get a single sale by ID
app.get('/api/sales/:id', async (req, res) => {
  try {
    const sale = inMemoryDB.sales.find(sale => sale._id === req.params.id);
    
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    // Get employee information
    const employee = inMemoryDB.users.find(user => user._id === sale.employee);
    
    // Return sale with employee details
    res.json({
      ...sale,
      employee: employee ? { name: employee.name, email: employee.email } : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sale', error: error.message });
  }
});

// Edit an existing sale
app.put('/api/sales/:id', async (req, res) => {
  try {
    logger.info('Sale update request received', { 
      saleId: req.params.id,
      contentType: req.headers['content-type']
    });
    
    const saleId = req.params.id;
    const updateData = req.body;
    
    // Find the sale in the database
    const saleIndex = inMemoryDB.sales.findIndex(sale => sale._id === saleId);
    
    if (saleIndex === -1) {
      logger.warn('Sale not found for update', { saleId });
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    const existingSale = inMemoryDB.sales[saleIndex];
    const userId = req.user?._id || '1';
    
    // Validate incoming data
    if (!updateData || typeof updateData !== 'object') {
      return res.status(400).json({ message: 'Invalid sale data provided' });
    }
    
    // Validate products array
    if (!Array.isArray(updateData.products) || updateData.products.length === 0) {
      return res.status(400).json({ message: 'Sale must include at least one product' });
    }
    
    // Define validation limits
    const MAX_QUANTITY = 1000;
    const MAX_PRICE = 10000;
    const MAX_TOTAL = 1000000;
    
    // Validate and sanitize products
    const sanitizedProducts = [];
    let calculatedTotal = 0;
    
    for (const product of updateData.products) {
      // Validate product format
      if (!product || typeof product !== 'object') {
        return res.status(400).json({ message: 'Invalid product data format' });
      }
      
      // Extract and validate quantity
      let quantity = parseInt(product.quantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        quantity = 1; // Default to 1 if invalid
      } else if (quantity > MAX_QUANTITY) {
        return res.status(400).json({ 
          message: `Invalid quantity. Maximum allowed is ${MAX_QUANTITY}`,
          details: { productName: product.name, quantity }
        });
      }
      
      // Extract and validate price
      let price = parseFloat(product.price);
      if (isNaN(price) || price < 0) {
        price = 0; // Default to 0 if invalid
      } else if (price > MAX_PRICE) {
        return res.status(400).json({ 
          message: `Invalid price. Maximum allowed is $${MAX_PRICE}`,
          details: { productName: product.name, price }
        });
      }
      
      // Calculate line total and validate
      const lineTotal = price * quantity;
      if (lineTotal > MAX_TOTAL) {
        return res.status(400).json({ 
          message: `Product total exceeds maximum allowed value of $${MAX_TOTAL}`,
          details: { productName: product.name, quantity, price, lineTotal }
        });
      }
      
      // Add to calculated total
      calculatedTotal += lineTotal;
      
      // Add sanitized product to array
      sanitizedProducts.push({
        name: (product.name || 'Unknown Product').substring(0, 100), // Limit name length
        quantity,
        price,
        category: product.category || 'other',
        id: product.id || Date.now().toString() + Math.random().toString(36).substring(2, 7)
      });
    }
    
    // Validate total amount
    const providedTotal = parseFloat(updateData.totalAmount) || calculatedTotal;
    
    // If provided total is too large
    if (providedTotal > MAX_TOTAL) {
      return res.status(400).json({ 
        message: `Total amount exceeds maximum allowed value of $${MAX_TOTAL}`,
        details: { providedTotal }
      });
    }
    
    // Create the updated sale object
    const updatedSale = {
      ...existingSale,
      customerName: (updateData.customerName || '').substring(0, 100),
      phoneNumber: (updateData.phoneNumber || '').substring(0, 20),
      products: sanitizedProducts,
      totalAmount: providedTotal,
      date: new Date(updateData.date || existingSale.date),
      storeLocation: (updateData.storeLocation || '').substring(0, 50),
      modifiedBy: userId,
      modifiedAt: new Date()
    };
    
    // Update the sale in the database
    inMemoryDB.sales[saleIndex] = updatedSale;
    
    logger.info('Sale updated successfully', { 
      saleId,
      customerName: updatedSale.customerName,
      totalAmount: updatedSale.totalAmount,
      productCount: updatedSale.products.length
    });
    
    // Return the updated sale
    res.json({
      message: 'Sale updated successfully',
      sale: updatedSale
    });
  } catch (error) {
    logger.error('Error updating sale', error, { saleId: req.params.id });
    res.status(500).json({ 
      message: 'Failed to update sale. Please try again or contact support if the issue persists.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete a sale
app.delete('/api/sales/:id', async (req, res) => {
  try {
    const saleId = req.params.id;
    logger.info('Sale deletion request received', { saleId });
    
    // Find the sale in the database
    const saleIndex = inMemoryDB.sales.findIndex(sale => sale._id === saleId);
    
    if (saleIndex === -1) {
      logger.warn('Sale not found for deletion', { saleId });
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    // Remove the sale from the database
    const deletedSale = inMemoryDB.sales.splice(saleIndex, 1)[0];
    
    logger.info('Sale deleted successfully', { 
      saleId,
      customerName: deletedSale.customerName,
      totalAmount: deletedSale.totalAmount
    });
    
    // Return success message
    res.json({
      message: 'Sale deleted successfully',
      saleId
    });
  } catch (error) {
    logger.error('Error deleting sale', error, { saleId: req.params.id });
    res.status(500).json({ 
      message: 'Failed to delete sale. Please try again or contact support if the issue persists.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Calculate commission
app.get('/api/commission/:employeeId', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    logger.info('Commission calculation request received', { 
      employeeId: req.params.employeeId, 
      startDate, 
      endDate 
    });
    
    // Get the employee to determine their role
    const employee = inMemoryDB.users.find(user => user._id === req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Get all sales for this employee
    let filteredSales = inMemoryDB.sales.filter(sale => sale.employee === req.params.employeeId);
    logger.debug('Found sales for employee', { count: filteredSales.length });
    
    // Apply date filter if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // Adjust end date to include the entire day
      end.setHours(23, 59, 59, 999);
      
      filteredSales = filteredSales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= start && saleDate <= end;
      });
      
      logger.debug('Sales after date filtering', { 
        count: filteredSales.length,
        startDate: start.toISOString(),
        endDate: end.toISOString()
      });
    }
    
    // Get the appropriate commission structure based on employee role
    let commissionStructure;
    if (inMemoryDB.commissionStructures) {
      // Find structure matching employee role or default to employee
      commissionStructure = inMemoryDB.commissionStructures.find(
        s => s.role === (employee.role || 'employee')
      );
    }
    
    // If no structure found, use the default employee structure
    if (!commissionStructure) {
      commissionStructure = {
        name: 'Default Employee Structure',
        role: 'employee',
        tiers: [
          {
            id: 1,
            name: 'Tier 1',
            accessoryTarget: 500,
            accessoryRate: 0.08,
            activationRates: {
              type30: 10,
              type40: 15, 
              type55: 20,
              type60: 25
            },
            upgradeRate: 10,
            cpRate: 15,
            apoRate: 0.10
          },
          {
            id: 2,
            name: 'Tier 2',
            accessoryTarget: 750,
            accessoryRate: 0.10,
            activationRates: {
              type30: 12,
              type40: 18,
              type55: 25,
              type60: 30
            },
            upgradeRate: 12,
            cpRate: 18,
            apoRate: 0.12
          },
          {
            id: 3,
            name: 'Tier 3',
            accessoryTarget: 1000,
            accessoryRate: 0.10,
            activationRates: {
              type30: 15,
              type40: 22,
              type55: 30,
              type60: 35
            },
            upgradeRate: 15,
            cpRate: 20,
            apoRate: 0.15
          },
          {
            id: 4,
            name: 'Tier 4',
            accessoryTarget: 1750,
            accessoryRate: 0.1,
            activationRates: {
              type30: 18,
              type40: 25,
              type55: 35,
              type60: 40
            },
            upgradeRate: 18,
            cpRate: 25,
            apoRate: 0.18
          }
        ]
      };
    }
    
    // Process each sale to calculate metrics
    let accessoryRevenue = 0;
    let activations = { type30: 0, type40: 0, type55: 0, type60: 0, total: 0 };
    let upgradeCount = 0;
    let cpCount = 0;
    let apoRevenue = 0;
    
    // Process each sale
    filteredSales.forEach(sale => {
      if (!sale.products || !Array.isArray(sale.products)) {
        logger.warn('Sale has no products array', { saleId: sale._id });
        return;
      }
      
      // Process each product in the sale
      sale.products.forEach(product => {
        const price = parseFloat(product.price) || 0;
        const quantity = parseInt(product.quantity) || 1;
        const totalProductValue = price * quantity;
        
        // Categorize products
        switch (product.category) {
          case 'accessory':
            accessoryRevenue += totalProductValue;
            break;
          case 'activation':
            // Determine activation type based on price
            if (price <= 30) {
              activations.type30 += quantity;
            } else if (price <= 40) {
              activations.type40 += quantity;
            } else if (price <= 55) {
              activations.type55 += quantity;
            } else {
              activations.type60 += quantity;
            }
            activations.total += quantity;
            break;
          case 'upgrade':
            upgradeCount += quantity;
            break;
          default:
            // Check if it's CP or APO based on name
            if (product.name.toLowerCase().includes('protection') || 
                product.name.toLowerCase().includes('cp')) {
              cpCount += quantity;
            } else if (product.name.toLowerCase().includes('apo') && price >= 60) {
              apoRevenue += totalProductValue;
            }
        }
      });
    });
    
    // Determine tier based on accessory revenue
    let currentTier = 1;
    const tiers = commissionStructure.tiers;
    
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (accessoryRevenue >= tiers[i].accessoryTarget) {
        currentTier = tiers[i].id;
        break;
      }
    }
    
    // Get the tier configuration
    const tier = tiers.find(t => t.id === currentTier) || tiers[0];
    
    // Calculate accessory commission
    const accessoryCommission = accessoryRevenue * tier.accessoryRate;
    
    // Calculate activations commission
    const activationsCommission = 
      (activations.type30 * tier.activationRates.type30) +
      (activations.type40 * tier.activationRates.type40) +
      (activations.type55 * tier.activationRates.type55) +
      (activations.type60 * tier.activationRates.type60);
    
    // Calculate upgrades commission
    const upgradesCommission = upgradeCount * tier.upgradeRate;
    
    // Calculate CP commission
    const cpCommission = cpCount * tier.cpRate;
    
    // Calculate APO commission
    const apoCommission = apoRevenue * tier.apoRate;
    
    // Total commission
    const totalCommission = 
      accessoryCommission + 
      activationsCommission + 
      upgradesCommission + 
      cpCommission + 
      apoCommission;
    
    // Format totals to 2 decimal places
    const formattedTotalCommission = parseFloat(totalCommission.toFixed(2));
    const formattedTotalAmount = parseFloat(filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0).toFixed(2));
    
    // Return detailed commission breakdown
    res.json({
      totalSales: filteredSales.length,
      totalAmount: formattedTotalAmount,
      totalCommission: formattedTotalCommission,
      tier: currentTier,
      tierName: tier.name,
      accessoryRevenue,
      accessoryCommission,
      activations: {
        counts: activations,
        commission: activationsCommission
      },
      upgrades: {
        count: upgradeCount,
        commission: upgradesCommission
      },
      cp: {
        count: cpCount,
        commission: cpCommission
      },
      apo: {
        revenue: apoRevenue,
        commission: apoCommission
      },
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      commissionStructure: {
        name: commissionStructure.name,
        role: commissionStructure.role
      },
      tierDetails: tiers // Include all tier details for progress calculation
    });
  } catch (error) {
    logger.error('Error calculating commission', error, { employeeId: req.params.employeeId });
    res.status(500).json({ 
      message: 'Error calculating commission', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
});

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    // Log authentication attempt for debugging
    logger.debug('Authenticating request', {
      path: req.originalUrl,
      headers: {
        authorization: req.header('Authorization') ? 'Present' : 'Missing',
        ...req.headers
      }
    });
    
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      logger.warn('Authentication failed - No token provided', { path: req.originalUrl });
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = inMemoryDB.users.find(user => user._id === decoded.id);

    if (!user) {
      logger.warn('Authentication failed - User not found', { userId: decoded.id });
      return res.status(401).json({ message: 'Invalid authentication' });
    }

    req.user = user;
    logger.debug('Authentication successful', { userId: user._id, role: user.role });
    next();
  } catch (error) {
    logger.error('Authentication error', error, { path: req.originalUrl });
    
    // Check if token is expired
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Your session has expired. Please log in again.',
        error: 'token_expired'
      });
    }
    
    // Any other jwt errors
    res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};

// Auth routes
// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, storeLocation, commissionRate } = req.body;

    // Check if user already exists
    const existingUser = inMemoryDB.users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = {
      _id: Date.now().toString(),
      name,
      email,
      password: hashedPassword,
      role: 'employee',
      storeLocation,
      commissionRate: parseFloat(commissionRate),
      hireDate: new Date()
    };

    inMemoryDB.users.push(newUser);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = inMemoryDB.users.find(user => user.email === email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      storeLocation: user.storeLocation,
      commissionRate: user.commissionRate
    };

    res.json({ token, user: userResponse });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Get current user
app.get('/api/users/me', auth, async (req, res) => {
  try {
    // Get user by id from auth middleware
    const userResponse = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      storeLocation: req.user.storeLocation,
      commissionRate: req.user.commissionRate
    };

    res.json(userResponse);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Error fetching user data', error: error.message });
  }
});

// Add auth middleware to protected routes
app.use('/api/sales', auth);
app.use('/api/commission', auth);

// Commission structure endpoints
// Get all commission structures
app.get('/api/commission-structures', auth, (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Return commission structures if they exist, otherwise return default structure
    const commissionStructures = inMemoryDB.commissionStructures || [
      {
        _id: '1',
        name: 'Employee Structure',
        role: 'employee',
        events: [
          {
            id: '1',
            name: 'New Customer Activation',
            description: 'Commission for activating a new customer',
            active: true,
            category: 'activation',
            value: 10,
            type: 'flat' // flat rate
          },
          {
            id: '2',
            name: 'Accessory Sale',
            description: 'Commission for accessory sales',
            active: true,
            category: 'accessory',
            value: 0.08,
            type: 'percentage' // percentage of sale
          },
          {
            id: '3',
            name: 'Device Protection Plan',
            description: 'Commission for selling device protection',
            active: true,
            category: 'protection',
            value: 15,
            type: 'flat' // flat rate
          }
        ],
        tiers: [
          {
            id: 1,
            name: 'Tier 1',
            accessoryTarget: 500,
            accessoryRate: 0.08,
            activationRates: {
              type30: 10,
              type40: 15,
              type55: 20,
              type60: 25
            },
            upgradeRate: 10,
            cpRate: 15,
            apoRate: 0.10
          },
          {
            id: 2,
            name: 'Tier 2',
            accessoryTarget: 750,
            accessoryRate: 0.10,
            activationRates: {
              type30: 12,
              type40: 18,
              type55: 25,
              type60: 30
            },
            upgradeRate: 12,
            cpRate: 18,
            apoRate: 0.12
          },
          {
            id: 3,
            name: 'Tier 3',
            accessoryTarget: 1000,
            accessoryRate: 0.10,
            activationRates: {
              type30: 15,
              type40: 22,
              type55: 30,
              type60: 35
            },
            upgradeRate: 15,
            cpRate: 20,
            apoRate: 0.15
          },
          {
            id: 4,
            name: 'Tier 4',
            accessoryTarget: 1750,
            accessoryRate: 0.1,
            activationRates: {
              type30: 18,
              type40: 25,
              type55: 35,
              type60: 40
            },
            upgradeRate: 18,
            cpRate: 25,
            apoRate: 0.18
          }
        ]
      },
      {
        _id: '2',
        name: 'Manager Structure',
        role: 'manager',
        events: [
          {
            id: '1',
            name: 'New Customer Activation',
            description: 'Commission for activating a new customer',
            active: true,
            category: 'activation',
            value: 12,
            type: 'flat' // flat rate
          },
          {
            id: '2',
            name: 'Accessory Sale',
            description: 'Commission for accessory sales',
            active: true,
            category: 'accessory',
            value: 0.1,
            type: 'percentage' // percentage of sale
          },
          {
            id: '3',
            name: 'Device Protection Plan',
            description: 'Commission for selling device protection',
            active: true,
            category: 'protection',
            value: 18,
            type: 'flat' // flat rate
          },
          {
            id: '4',
            name: 'Team Performance Bonus',
            description: 'Bonus based on team performance',
            active: true,
            category: 'bonus',
            value: 0.02,
            type: 'percentage' // percentage of team sales
          }
        ],
        tiers: [
          {
            id: 1,
            name: 'Tier 1',
            accessoryTarget: 750,
            accessoryRate: 0.10,
            activationRates: {
              type30: 12,
              type40: 18,
              type55: 25,
              type60: 30
            },
            upgradeRate: 12,
            cpRate: 18,
            apoRate: 0.12
          },
          {
            id: 2,
            name: 'Tier 2',
            accessoryTarget: 1200,
            accessoryRate: 0.12,
            activationRates: {
              type30: 15,
              type40: 22,
              type55: 30,
              type60: 35
            },
            upgradeRate: 15,
            cpRate: 20,
            apoRate: 0.15
          },
          {
            id: 3,
            name: 'Tier 3',
            accessoryTarget: 2000,
            accessoryRate: 0.15,
            activationRates: {
              type30: 18,
              type40: 25,
              type55: 35,
              type60: 40
            },
            upgradeRate: 18,
            cpRate: 25,
            apoRate: 0.18
          }
        ]
      }
    ];
    
    // Initialize the commissionStructures if it doesn't exist
    if (!inMemoryDB.commissionStructures) {
      inMemoryDB.commissionStructures = commissionStructures;
    }
    
    res.json(commissionStructures);
  } catch (error) {
    logger.error('Error fetching commission structures', error);
    res.status(500).json({ 
      message: 'Failed to fetch commission structures', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
});

// Get a specific commission structure
app.get('/api/commission-structures/:id', auth, (req, res) => {
  try {
    // Create the commission structures if they don't exist
    if (!inMemoryDB.commissionStructures) {
      // Return 404 as the specific structure doesn't exist yet
      return res.status(404).json({ message: 'Commission structure not found' });
    }
    
    const structure = inMemoryDB.commissionStructures.find(s => s._id === req.params.id);
    
    if (!structure) {
      return res.status(404).json({ message: 'Commission structure not found' });
    }
    
    res.json(structure);
  } catch (error) {
    logger.error('Error fetching commission structure', error, { structureId: req.params.id });
    res.status(500).json({ 
      message: 'Failed to fetch commission structure', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
});

// Create a new commission structure
app.post('/api/commission-structures', auth, (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    const { name, role, tiers, events } = req.body;
    
    // Validate required fields
    if (!name || !role || !tiers || !Array.isArray(tiers) || tiers.length === 0) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, role, and tiers (array) are required' 
      });
    }
    
    // Create commission structures array if it doesn't exist
    if (!inMemoryDB.commissionStructures) {
      inMemoryDB.commissionStructures = [];
    }
    
    // Create new structure
    const newStructure = {
      _id: Date.now().toString(),
      name,
      role,
      tiers,
      events: events || [] // Initialize events array, default to empty if not provided
    };
    
    inMemoryDB.commissionStructures.push(newStructure);
    
    res.status(201).json(newStructure);
  } catch (error) {
    logger.error('Error creating commission structure', error);
    res.status(500).json({ 
      message: 'Failed to create commission structure', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
});

// Update an existing commission structure
app.put('/api/commission-structures/:id', auth, (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    // Check if commission structures exist
    if (!inMemoryDB.commissionStructures) {
      return res.status(404).json({ message: 'Commission structure not found' });
    }
    
    const structureIndex = inMemoryDB.commissionStructures.findIndex(s => s._id === req.params.id);
    
    if (structureIndex === -1) {
      return res.status(404).json({ message: 'Commission structure not found' });
    }
    
    const { name, role, tiers, events } = req.body;
    
    // Validate required fields
    if (!name || !role || !tiers || !Array.isArray(tiers) || tiers.length === 0) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, role, and tiers (array) are required' 
      });
    }
    
    // Update structure
    const updatedStructure = {
      _id: req.params.id,
      name,
      role,
      tiers,
      events: events || [] // Keep events array, default to empty if not provided
    };
    
    inMemoryDB.commissionStructures[structureIndex] = updatedStructure;
    
    res.json(updatedStructure);
  } catch (error) {
    logger.error('Error updating commission structure', error, { structureId: req.params.id });
    res.status(500).json({ 
      message: 'Failed to update commission structure', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
});

// Delete a commission structure
app.delete('/api/commission-structures/:id', auth, (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    // Check if commission structures exist
    if (!inMemoryDB.commissionStructures) {
      return res.status(404).json({ message: 'Commission structure not found' });
    }
    
    const structureIndex = inMemoryDB.commissionStructures.findIndex(s => s._id === req.params.id);
    
    if (structureIndex === -1) {
      return res.status(404).json({ message: 'Commission structure not found' });
    }
    
    // Remove the structure
    const deletedStructure = inMemoryDB.commissionStructures.splice(structureIndex, 1)[0];
    
    res.json({ 
      message: 'Commission structure deleted successfully',
      _id: deletedStructure._id
    });
  } catch (error) {
    logger.error('Error deleting commission structure', error, { structureId: req.params.id });
    res.status(500).json({ 
      message: 'Failed to delete commission structure', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
});

// Helper function to format Claude responses to be shorter and more focused
function formatClaudeResponse(text) {
  // Remove any asterisks for cleaner, more conversational text
  text = text.replace(/\*/g, '');
  
  // Add a conversational opener if needed
  if (!text.match(/^(hi|hey|hello|greetings|howdy)/i)) {
    const greetings = [
      "Hey! ",
      "So, ",
      "You know, ",
      "I think ",
      "Well, "
    ];
    text = greetings[Math.floor(Math.random() * greetings.length)] + text;
  }
  
  // Convert any markdown elements to plain text
  text = text.replace(/\n- /g, "\n");
  text = text.replace(/\n\d+\.\s+/g, "\n");
  text = text.replace(/#+\s+/g, "");
  
  // IMPORTANT: Limit response length by taking just the first paragraph or two
  const paragraphs = text.split(/\n\n+/);
  
  // Keep only 1-2 paragraphs for brevity
  let shortened = paragraphs.length > 0 ? paragraphs[0] : text;
  
  // If first paragraph is very short, include second paragraph too
  if (paragraphs.length > 1 && shortened.length < 100) {
    shortened = paragraphs[0] + "\n\n" + paragraphs[1];
  }
  
  // Shorten further if still too long by cutting at a sentence boundary
  if (shortened.length > 250) {
    const sentences = shortened.match(/[^.!?]+[.!?]+/g) || [shortened];
    shortened = sentences.slice(0, 2).join(' ');
  }
  
  // Check if we need a natural follow-up
  if (!shortened.match(/\?$/m) && !shortened.match(/(\?|what do you think|how about).*?$/is)) {
    // Instead of adding a fixed question that might sound condescending,
    // look for natural ways to continue the conversation based on content
    
    // Only sometimes add a follow-up to keep it natural
    if (Math.random() > 0.3) {
      // See if we can extract context for a more natural question
      if (shortened.includes("customer") || shortened.includes("buyer")) {
        shortened += " What types of customers do you typically work with?";
      } else if (shortened.includes("sales")) {
        shortened += " How have your sales been going lately?";
      } else if (shortened.includes("phone") || shortened.includes("device")) {
        shortened += " Which phones seem to be moving fastest for you?";
      } else if (shortened.includes("manager") || shortened.includes("team")) {
        shortened += " How's your team structured at your store?";
      } else {
        // If no context, occasionally add a simple, non-condescending transition
        const transitions = [
          " Tell me more about what you're dealing with.",
          " What's been your experience with that?",
          " I'm curious about your approach there.",
          " What are your thoughts on that?",
          " How's that working out for you so far?"
        ];
        shortened += transitions[Math.floor(Math.random() * transitions.length)];
      }
    }
  }
  
  return shortened;
}

// Claude API integration
async function askClaude(prompt, conversationId = null) {
  try {
    // Handle both string prompts and array of messages
    const isConversation = Array.isArray(prompt);
    
    logger.info('Sending request to Claude API', { 
      promptType: isConversation ? 'conversation' : 'single message',
      promptLength: isConversation ? prompt.length : prompt.length,
      conversationId
    });
    
    // Format the messages for API call
    const messages = isConversation 
      ? prompt  // Already in correct format
      : [{ role: "user", content: prompt }];  // Single message
    
    // System prompt to set context for retail sales assistant
    const systemPrompt = `You are SalesPal, a friendly sales coach for a wireless retail store. Your responses simulate a real face-to-face conversation with brief, focused answers.

EXTREMELY IMPORTANT: Keep all responses very short, like one or two sentences. Answer just one part of a question at a time, as if you're having a back-and-forth conversation where you pause frequently to let the employee respond.

Your personality:
- You're an experienced sales mentor who's worked in wireless retail for years
- Speak casually and naturally, like you're chatting with a colleague on the sales floor
- Be encouraging but direct - get right to the point 
- Focus on one practical tip at a time rather than comprehensive answers

Response style:
- Keep responses extremely brief (1-2 sentences, MAXIMUM 2-3 short paragraphs)
- No lists, no bullet points, no comprehensive explanations - just focused advice
- Don't force questions at the end of every response - it sounds scripted
- Never use condescending phrases like "does that make sense?" or "you know what I mean?"
- Talk like an equal colleague sharing experiences, not like a teacher testing a student
- Keep the tone friendly but professional without sounding overly enthusiastic or fake

Example of good length: "I'd focus on asking better questions about how they use their current phone. Get them talking about their frustrations first before jumping to solutions. What specific objections are you hearing most often?"

Your primary goal is to simulate a real human coaching conversation with brief, focused exchanges rather than comprehensive answers.`;
    
    // Real implementation using Anthropic API
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-7-sonnet-20250219", // Using Claude 3.7
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01' // Can be updated to newer versions as they're released
        }
      }
    );
    
    logger.info('Claude API response received', { 
      responseLength: response.data.content[0].text.length,
      conversationId
    });
    
    // Process the response to ensure good formatting
    const rawResponse = response.data.content[0].text;
    
    // Apply formatting enhancements
    const formattedResponse = formatClaudeResponse(rawResponse);
    
    return formattedResponse;
  } catch (error) {
    logger.error('Claude API error', error, { 
      promptType: Array.isArray(prompt) ? 'conversation' : 'single message',
      conversationId 
    });
    return "I'm sorry, but I'm having trouble connecting to the assistant service right now. Please try again in a moment or contact support if the problem persists.";
  }
}

// In-memory conversations storage
const conversations = {
  // Format:
  // "<conversation_id>": {
  //   id: "<conversation_id>",
  //   userId: "<user_id>",
  //   messages: [
  //     { role: "user", content: "...", timestamp: "..." },
  //     { role: "assistant", content: "...", timestamp: "..." }
  //   ],
  //   createdAt: "...",
  //   updatedAt: "..."
  // }
};

// Helper function to create a new conversation
function createConversation(userId) {
  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const conversation = {
    id: conversationId,
    userId,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  conversations[conversationId] = conversation;
  logger.debug('Created new conversation', { conversationId, userId });
  return conversation;
}

// Common customer personas to help with sales scenarios
const customerPersonas = [
  {
    type: "budget_conscious",
    description: "Looking for the most affordable options, very price sensitive, often comparing deals",
    needs: "Value plans, budget phones, family discounts"
  },
  {
    type: "tech_enthusiast",
    description: "Wants the latest technology, willing to pay premium prices, interested in features",
    needs: "Flagship phones, premium plans with highest data, early upgrades"
  },
  {
    type: "business_user",
    description: "Needs reliability for work, values customer service, concerned with coverage",
    needs: "Reliable devices, unlimited plans, international options, hotspot"
  },
  {
    type: "senior",
    description: "May be less tech-savvy, values simplicity and reliability, calls more than data",
    needs: "Simple interfaces, basic plans, in-person support"
  },
  {
    type: "family_manager",
    description: "Making decisions for family, concerned with controls and costs across multiple lines",
    needs: "Family plans, parental controls, multi-line discounts"
  }
];

// API endpoint to interact with Claude
app.post('/api/assistant', async (req, res) => {
  try {
    const { prompt, conversationId, customerType, isAnalysis } = req.body;
    const userId = req.user?._id || 'anonymous';
    
    if (!prompt) {
      logger.error('Missing prompt in assistant request');
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    logger.debug('Assistant request received', { 
      promptLength: prompt.length,
      conversationId,
      customerType,
      isAnalysis,
      userId
    });
    
    // For sales analysis requests, use a special system prompt
    if (isAnalysis) {
      logger.info('Processing sales analysis request');
      
      // Use a specialized system prompt for analysis
      const analysisSystemPrompt = `You are SalesPal's Sales Analysis expert. Analyze the sales data provided and give specific, actionable advice to help the employee improve their sales performance. Format your response in a friendly, helpful way with:
      
      1. A brief summary of their current performance
      2. 3-5 specific strengths you've identified from the data
      3. 3-5 specific areas for improvement
      4. Clear, concrete action items the employee can take immediately
      
      Use a supportive, encouraging tone. Make your feedback specific and data-driven. Use markdown formatting with headers, bullets, and bold text to make your analysis easy to read.`;
      
      // Call Claude directly with analysis system prompt
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: "claude-3-7-sonnet-20250219",
          max_tokens: 1500,
          system: analysisSystemPrompt,
          messages: [{ role: "user", content: prompt }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          }
        }
      );
      
      // Format the response
      const analysisResponse = formatClaudeResponse(response.data.content[0].text);
      
      return res.json({ 
        response: analysisResponse
      });
    }
    
    // Standard chat conversation flow
    // Get or create conversation
    let conversation;
    if (conversationId && conversations[conversationId]) {
      conversation = conversations[conversationId];
    } else {
      conversation = createConversation(userId);
    }
    
    // Add user message to conversation
    conversation.messages.push({
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString()
    });
    
    // Format messages for Claude API - include conversation history
    // Only send the most recent messages (limit to last 10 to avoid token limits)
    const apiMessages = conversation.messages
      .slice(-10)
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
    
    // Add customer persona context if specified
    let enhancedPrompt = prompt;
    if (customerType && customerType !== 'general') {
      const persona = customerPersonas.find(p => p.type === customerType);
      if (persona) {
        enhancedPrompt = `I'm helping a customer who is ${persona.description}. They typically need ${persona.needs}. Here's my question: ${prompt}`;
      }
    }
    
    // Get response from Claude with conversation history
    const claudePrompt = apiMessages.length > 1 
      ? apiMessages  // Use conversation history
      : enhancedPrompt;  // Use the enhanced prompt for first message
    
    const response = await askClaude(
      claudePrompt, 
      conversation.id
    );
    
    // Add assistant response to conversation
    conversation.messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    });
    
    // Update conversation timestamp
    conversation.updatedAt = new Date().toISOString();
    
    // Track the customer type with the conversation if provided
    if (customerType && !conversation.customerType) {
      conversation.customerType = customerType;
    }
    
    res.json({ 
      response,
      conversation: {
        id: conversation.id,
        messages: conversation.messages,
        customerType: conversation.customerType
      }
    });
  } catch (error) {
    logger.error('Assistant API error', error, { 
      promptOrigin: req.get('origin'),
      userId: req.user?._id || 'anonymous'
    });
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Get conversation history
app.get('/api/assistant/conversations', async (req, res) => {
  try {
    const userId = req.user?._id || 'anonymous';
    
    // Filter conversations by user ID
    const userConversations = Object.values(conversations)
      .filter(conv => conv.userId === userId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    // Return stripped down version with just IDs and preview
    const conversationPreviews = userConversations.map(conv => {
      const lastMessage = conv.messages[conv.messages.length - 1];
      return {
        id: conv.id,
        preview: lastMessage?.content.substring(0, 50) + '...' || 'Empty conversation',
        messageCount: conv.messages.length,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      };
    });
    
    res.json({ conversations: conversationPreviews });
  } catch (error) {
    logger.error('Error fetching conversations', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get specific conversation
app.get('/api/assistant/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || 'anonymous';
    
    if (!conversations[id]) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Check if user owns this conversation
    if (conversations[id].userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ conversation: conversations[id] });
  } catch (error) {
    logger.error('Error fetching conversation', error, { conversationId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Get suggested questions
app.get('/api/assistant/suggested-questions', async (req, res) => {
  try {
    const { customerType } = req.query;
    
    // Base questions that apply to all customer types
    const baseQuestions = {
      "sales": [
        "How can I increase my sales?",
        "What are the best sales techniques for accessories?",
        "How should I handle customer objections?",
        "What's the most effective way to demo a new phone?"
      ],
      "commission": [
        "How is commission calculated?",
        "What's the commission structure for our plans?",
        "How can I maximize my commission earnings?",
        "What promotions offer the best commission?"
      ],
      "products": [
        "What are the key differences between our plans?",
        "How do I compare iPhone vs Android for customers?",
        "What are the best selling accessories?",
        "Which phones offer the best value for customers?"
      ],
      "customer_service": [
        "How do I handle an unhappy customer?",
        "What's the process for handling refunds?",
        "How should I explain activation fees to customers?",
        "What's the best way to convert a browsing customer to a sale?"
      ]
    };
    
    // Customer type specific questions
    const customerTypeQuestions = {
      "budget_conscious": [
        "How can I explain the value in our budget phones?",
        "What's the best way to present our affordable plans?",
        "How do I handle customers who say our prices are too high?",
        "What financing options should I highlight for budget customers?"
      ],
      "tech_enthusiast": [
        "What cutting-edge features should I highlight in our flagship devices?",
        "How can I impress customers who know a lot about technology?",
        "What accessories pair best with high-end phones?",
        "How do I position our premium plans to tech-savvy customers?"
      ],
      "business_user": [
        "What features should I emphasize for business customers?",
        "How do our business plans compare to competitors?",
        "What security features should I highlight for business users?",
        "How can I sell mobile hotspot features to business professionals?"
      ],
      "senior": [
        "What are the best phone options for seniors with limited tech experience?",
        "How can I explain our plans in simple terms?",
        "What accessibility features should I highlight?",
        "What support options can I offer to less tech-savvy customers?"
      ],
      "family_manager": [
        "How do I explain the benefits of our family plans?",
        "What parental control features should I highlight?",
        "How can I help parents choose appropriate phones for children?",
        "What's the best way to explain line discounts for multiple devices?"
      ]
    };
    
    // Combine base questions with customer type questions if a valid type is provided
    let suggestedQuestions = {...baseQuestions};
    
    if (customerType && customerTypeQuestions[customerType]) {
      suggestedQuestions[customerType] = customerTypeQuestions[customerType];
    }
    
    res.json({ 
      suggestedQuestions,
      customerPersonas
    });
  } catch (error) {
    logger.error('Error fetching suggested questions', error);
    res.status(500).json({ error: 'Failed to fetch suggested questions' });
  }
});

// Serve static files if in production
if (process.env.NODE_ENV === 'production') {
  // Serve frontend build files
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
  });
}

// Start server with better error handling
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`Frontend should be running at http://localhost:5173`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use. Please run the fix-ports.sh script first.`);
    console.error(`\x1b[31mERROR: Port ${PORT} is already in use.\x1b[0m`);
    console.error(`\x1b[31mPlease run ./fix-ports.sh before starting the application.\x1b[0m`);
    process.exit(1);
  } else {
    logger.error('Server error:', error);
    console.error('Server error:', error);
  }
});
