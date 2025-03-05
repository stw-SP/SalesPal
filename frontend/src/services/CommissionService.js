/**
 * Commission Service
 * This file contains functions for calculating and managing commissions.
 * You can paste your commission calculation code here.
 */

import axios from 'axios';

/**
 * Fetches commission data for a user
 * @param {string} userId - The ID of the user
 * @param {object} dateRange - Object containing startDate and endDate
 * @returns {Promise} - Promise that resolves to commission data
 */
export const fetchCommissionData = async (userId, dateRange = {}) => {
  try {
    const { startDate, endDate } = dateRange;
    let url = `/api/commission/${userId}`;
    
    // Add date range as query parameters if provided
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching commission data:', error);
    throw error;
  }
};

/**
 * Calculates commission based on a sale
 * @param {object} sale - The sale object 
 * @param {number} commissionRate - The commission rate percentage
 * @returns {number} - The calculated commission amount
 */
export const calculateCommission = (sale, commissionRate = 10) => {
  if (!sale || typeof sale !== 'object') {
    return 0;
  }
  
  // Basic commission calculation
  const totalAmount = parseFloat(sale.totalAmount) || 0;
  return (totalAmount * commissionRate) / 100;
};

/**
 * Calculates commission with product-specific rates
 * @param {object} sale - The sale object with products array
 * @param {object} productRates - Object mapping product categories to commission rates
 * @returns {number} - The calculated commission amount
 */
export const calculateDetailedCommission = (sale, productRates = {}) => {
  if (!sale || !Array.isArray(sale.products)) {
    return 0;
  }
  
  // Default rates if not provided
  const rates = {
    activation: 15, // 15% for activations
    upgrade: 12,    // 12% for upgrades
    accessory: 20,  // 20% for accessories
    other: 10,      // 10% for other products
    ...productRates // Override with any provided rates
  };
  
  // Calculate commission per product based on category
  return sale.products.reduce((total, product) => {
    const category = product.category || 'other';
    const rate = rates[category] || rates.other;
    const productAmount = (parseFloat(product.price) || 0) * (parseInt(product.quantity) || 1);
    const productCommission = (productAmount * rate) / 100;
    
    return total + productCommission;
  }, 0);
};

/**
 * Formats commission amount as currency
 * @param {number} amount - The commission amount to format
 * @param {string} locale - The locale to use for formatting
 * @param {string} currency - The currency code
 * @returns {string} - Formatted currency string
 */
export const formatCommission = (amount, locale = 'en-US', currency = 'USD') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
};

/**
 * Calculates projected commission for a time period
 * @param {array} sales - Array of sales
 * @param {object} projectionParams - Parameters for projection calculation
 * @returns {object} - Projection data
 */
export const calculateCommissionProjection = (sales, projectionParams = {}) => {
  if (!Array.isArray(sales) || sales.length === 0) {
    return {
      currentTotal: 0,
      projectedTotal: 0,
      projectedRemaining: 0,
      daysRemaining: 0,
      dailyAverage: 0
    };
  }
  
  // Default parameters
  const params = {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), // Last day of current month
    ...projectionParams
  };
  
  // Calculate days in period and days remaining
  const totalDays = Math.ceil((params.endDate - params.startDate) / (1000 * 60 * 60 * 24));
  const today = new Date();
  const daysPassed = Math.ceil((today - params.startDate) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, totalDays - daysPassed);
  
  // Total commission so far
  const currentTotal = sales.reduce((sum, sale) => sum + (parseFloat(sale.commission) || 0), 0);
  
  // Daily average
  const dailyAverage = daysPassed > 0 ? currentTotal / daysPassed : 0;
  
  // Projected total for the period
  const projectedTotal = currentTotal + (dailyAverage * daysRemaining);
  
  // Projected remaining commission
  const projectedRemaining = projectedTotal - currentTotal;
  
  return {
    currentTotal,
    projectedTotal,
    projectedRemaining,
    daysRemaining,
    dailyAverage
  };
};

// Export the service as default
export default {
  fetchCommissionData,
  calculateCommission,
  calculateDetailedCommission,
  formatCommission,
  calculateCommissionProjection
};