/**
 * Enhanced RegEx-based sales document parser that works with the existing application
 * but adds special handling for bolded section headers.
 */

// Simple logger to avoid circular dependencies
const logger = {
  info: (message, context = {}) => console.log(`INFO: ${message}`, context),
  warn: (message, context = {}) => console.warn(`WARN: ${message}`, context),
  error: (message, error = null, context = {}) => console.error(`ERROR: ${message}`, error, context),
  debug: (message, context = {}) => console.log(`DEBUG: ${message}`, context)
};
const { extractSaleInfo, extractSaleInfoFallback } = require('./sales-parser');

/**
 * Improved implementation of extractSaleInfoWithRegex that uses the new parser module
 * @param {string} text - The raw text extracted from the PDF
 * @return {object} Parsed sale information object
 */
function extractSaleInfoWithRegex(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    logger.warn('Empty or invalid text provided to extractSaleInfoWithRegex');
    return null;
  }
  
  logger.info('Extracting sale info from text with length: ' + text.length);
  
  try {
    // First try the enhanced parser that handles bolded headers
    const result = extractSaleInfo(text);
    
    if (result && (result.customerName || result.products.length > 0 || result.totalAmount > 0)) {
      logger.info('Extraction complete with enhanced parser', {
        customerName: result.customerName,
        productsFound: result.products.length,
        totalAmount: result.totalAmount
      });
      return result;
    }
    
    // If the enhanced parser didn't find anything useful, try the fallback parser
    logger.info('Enhanced parser returned insufficient data, trying fallback parser');
    const fallbackResult = extractSaleInfoFallback(text);
    
    if (fallbackResult) {
      logger.info('Extraction complete with fallback parser', {
        customerName: fallbackResult.customerName,
        productsFound: fallbackResult.products.length,
        totalAmount: fallbackResult.totalAmount
      });
      return fallbackResult;
    }
    
    // If all parsers fail, return a minimal valid result
    logger.warn('All parsers failed to extract meaningful data');
    return {
      customerName: '',
      phoneNumber: '',
      products: [],
      totalAmount: 0,
      date: new Date(),
      storeLocation: '',
      orderNumber: ''
    };
  } catch (error) {
    logger.error('Error extracting sale info with regex', error);
    return {
      customerName: '',
      phoneNumber: '',
      products: [],
      totalAmount: 0,
      date: new Date(),
      storeLocation: '',
      orderNumber: ''
    };
  }
}

module.exports = {
  extractSaleInfoWithRegex
};