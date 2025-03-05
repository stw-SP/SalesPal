/**
 * Enhanced PDF Sales Document Parser
 * This module provides improved parsing for sales documents with special 
 * attention to bolded headers and field boundaries
 */

const fs = require('fs');
const path = require('path');

/**
 * Enhanced extractSaleInfo function that properly identifies field boundaries
 * by paying special attention to bolded headers and field structure
 * @param {string} text - The raw text extracted from the PDF
 * @return {object} Parsed sale information object
 */
function extractSaleInfo(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    console.warn('Empty or invalid text provided to extractSaleInfo');
    return null;
  }
  
  console.log('Extracting sale info from text with length: ' + text.length);
  
  // Initialize the result object with default values
  const result = {
    customerName: '',
    phoneNumber: '',
    products: [],
    totalAmount: 0,
    date: new Date(),
    storeLocation: '',
    orderNumber: ''
  };
  
  try {
    // Normalize text - clean up double spaces, extra line breaks, etc.
    text = text
      .replace(/\s+/g, ' ')         // Replace multiple spaces with single space
      .replace(/(\d)\s*\.\s*(\d)/g, '$1.$2') // Fix decimal points
      .replace(/\$\s+/g, '$')       // Fix dollar signs
      .trim();
    
    // Split text into lines for better processing
    const lines = text.split(/\n|\r\n/);
    
    // STEP 1: Identify bolded section headers
    // We'll look for common section headers that might be bolded in the PDF
    const headerPatterns = [
      /customer\s*information/i,
      /billing\s*details/i,
      /product\s*information/i,
      /order\s*summary/i,
      /payment\s*details/i,
      /customer\s*details/i,
      /order\s*information/i,
      /invoice\s*details/i,
      /shipping\s*information/i,
      /contact\s*information/i
    ];
    
    // Map to store identified sections
    const sections = new Map();
    let currentSection = "header"; // Default section
    
    // First pass - identify sections by bolded headers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (line.length === 0) continue;
      
      // Check if this line matches any of our header patterns
      for (const pattern of headerPatterns) {
        if (pattern.test(line)) {
          currentSection = line.toLowerCase().replace(/[^a-z0-9]/g, '_');
          sections.set(currentSection, { startLine: i, endLine: -1, content: [] });
          break;
        }
      }
      
      // Add this line to the current section
      if (!sections.has(currentSection)) {
        sections.set(currentSection, { startLine: 0, endLine: -1, content: [] });
      }
      
      sections.get(currentSection).content.push(line);
    }
    
    // Set end lines for sections
    const sectionKeys = Array.from(sections.keys());
    for (let i = 0; i < sectionKeys.length; i++) {
      if (i < sectionKeys.length - 1) {
        sections.get(sectionKeys[i]).endLine = sections.get(sectionKeys[i+1]).startLine - 1;
      } else {
        sections.get(sectionKeys[i]).endLine = lines.length - 1;
      }
    }
    
    // STEP 2: Extract customer information
    const customerSectionKeys = sectionKeys.filter(key => 
      key.includes('customer') || key.includes('contact') || key.includes('billing'));
    
    if (customerSectionKeys.length > 0) {
      const customerSection = sections.get(customerSectionKeys[0]);
      
      // Look for customer name patterns within the customer section
      const customerContent = customerSection.content.join(' ');
      
      // Try to find customer name with more precise patterns
      const customerPatterns = [
        /customer\s*name\s*:\s*([^,\n\.]+)/i,
        /name\s*:\s*([^,\n\.]+)/i,
        /bill\s*to\s*:\s*([^,\n\.]+)/i,
        /sold\s*to\s*:\s*([^,\n\.]+)/i,
        /customer\s*:\s*([^,\n\.]+)/i
      ];
      
      for (const pattern of customerPatterns) {
        const match = customerContent.match(pattern);
        if (match && match[1] && match[1].trim().length > 0) {
          result.customerName = match[1].trim();
          break;
        }
      }
      
      // Try to find phone number in customer section with more precise patterns
      const phonePatterns = [
        /phone\s*(?:number|#)?\s*:\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i,
        /phone\s*:\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i,
        /tel\s*:\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i,
        /mobile\s*:\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i,
        /contact\s*:\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i,
        /(?:^|\s)(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})(?:\s|$)/i  // Standalone phone number
      ];
      
      for (const pattern of phonePatterns) {
        const match = customerContent.match(pattern);
        if (match && match[1] && match[1].trim().length > 0) {
          result.phoneNumber = match[1].trim();
          break;
        }
      }
    }
    
    // STEP 3: Extract store location from appropriate sections
    const storeSectionKeys = sectionKeys.filter(key => 
      key.includes('store') || key.includes('location') || key.includes('branch') || key.includes('header'));
    
    if (storeSectionKeys.length > 0) {
      const storeSection = sections.get(storeSectionKeys[0]);
      const storeContent = storeSection.content.join(' ');
      
      // Look for store location patterns
      const storePatterns = [
        /store\s*(?:location|name)?\s*:\s*([^,\n\.]+)/i,
        /location\s*:\s*([^,\n\.]+)/i,
        /branch\s*:\s*([^,\n\.]+)/i,
        /outlet\s*:\s*([^,\n\.]+)/i,
        /store\s*:\s*([^,\n\.]+)/i
      ];
      
      for (const pattern of storePatterns) {
        const match = storeContent.match(pattern);
        if (match && match[1] && match[1].trim().length > 0) {
          result.storeLocation = match[1].trim();
          break;
        }
      }
    }
    
    // STEP 4: Extract order number
    const orderSectionKeys = sectionKeys.filter(key => 
      key.includes('order') || key.includes('invoice') || key.includes('receipt') || key.includes('header'));
    
    if (orderSectionKeys.length > 0) {
      const orderSection = sections.get(orderSectionKeys[0]);
      const orderContent = orderSection.content.join(' ');
      
      // Look for order number patterns
      const orderPatterns = [
        /order\s*(?:number|#|no|num)\s*:\s*([^,\n\.\s]+)/i,
        /invoice\s*(?:number|#|no|num)\s*:\s*([^,\n\.\s]+)/i,
        /receipt\s*(?:number|#|no|num)\s*:\s*([^,\n\.\s]+)/i,
        /confirmation\s*(?:number|#|no|num)\s*:\s*([^,\n\.\s]+)/i,
        /transaction\s*(?:number|#|no|num)\s*:\s*([^,\n\.\s]+)/i,
        /reference\s*(?:number|#|no|num)\s*:\s*([^,\n\.\s]+)/i,
        /order\s*(?:id)\s*:\s*([^,\n\.\s]+)/i,
        /order\s*:\s*([^,\n\.\s]+)/i,
        /#\s*:\s*([^,\n\.\s]+)/i
      ];
      
      for (const pattern of orderPatterns) {
        const match = orderContent.match(pattern);
        if (match && match[1] && match[1].trim().length > 0) {
          result.orderNumber = match[1].trim();
          break;
        }
      }
    }
    
    // STEP 5: Extract date from appropriate sections
    // Look across all sections for date information
    const datePatterns = [
      /date\s*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /date\s*:\s*(\w+\s+\d{1,2},?\s*\d{2,4})/i, // e.g., March 15, 2023
      /date\s*:\s*(\d{1,2}\s+\w+\s+\d{2,4})/i,   // e.g., 15 March 2023
      /invoice\s*date\s*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /order\s*date\s*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /receipt\s*date\s*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /transaction\s*date\s*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /purchase\s*date\s*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/   // Standalone date format
    ];
    
    for (const sectionKey of sectionKeys) {
      const sectionContent = sections.get(sectionKey).content.join(' ');
      
      for (const pattern of datePatterns) {
        const match = sectionContent.match(pattern);
        if (match && match[1]) {
          try {
            const dateStr = match[1];
            const parsedDate = new Date(dateStr);
            
            // Check if the date is valid
            if (!isNaN(parsedDate.getTime())) {
              result.date = parsedDate;
              break;
            }
          } catch (e) {
            console.error('Error parsing date:', e);
          }
        }
      }
      
      // Break once we've found a valid date
      if (result.date && result.date instanceof Date && !isNaN(result.date.getTime())) {
        break;
      }
    }
    
    // STEP 6: Find product information section and extract product details
    const productSectionKeys = sectionKeys.filter(key => 
      key.includes('product') || key.includes('item') || key.includes('order_summary'));
    
    let products = [];
    
    if (productSectionKeys.length > 0) {
      // Use the first identified product section
      const productSection = sections.get(productSectionKeys[0]);
      const productLines = productSection.content;
      
      // Skip header lines that might contain section titles or column headers
      const startIndex = 1; // Start from second line to skip potential header
      
      // Process each line that might contain product information
      for (let i = startIndex; i < productLines.length; i++) {
        const line = productLines[i].trim();
        
        // Skip empty lines and lines that might be subtotals/totals
        if (line.length < 5 || 
            /total|subtotal|tax|shipping|discount|tax|grand/i.test(line) ||
            /^\s*$/.test(line)) {
          continue;
        }
        
        // Product pattern - looking for: 
        // 1. Product name (possibly with quantity)
        // 2. Optional quantity (if separate)  
        // 3. Price
        const productMatch = line.match(/(.+?)(?:\s+(\d+)\s+)?[\s\t]*[\$]?\s*(\d+[\.,]\d{2})(?:\s*$)/);
        
        if (productMatch) {
          const fullName = productMatch[1].trim();
          const explicitQuantity = productMatch[2] ? parseInt(productMatch[2]) : null;
          const price = parseFloat(productMatch[3].replace(',', '.'));
          
          // Skip obvious non-products
          if (fullName.toLowerCase().includes('total') || 
              fullName.toLowerCase().includes('subtotal') ||
              fullName.toLowerCase().includes('tax')) {
            continue;
          }
          
          // Try to extract quantity if present in the name
          let quantity = explicitQuantity || 1;
          let name = fullName;
          
          if (!explicitQuantity) {
            // Check for quantity in the product name (e.g., "2 x Product Name" or "2 Product Name")
            const qtyMatch = fullName.match(/^(\d+)\s*x\s*(.+)$/) || fullName.match(/^(\d+)\s+(.+)$/);
            if (qtyMatch) {
              quantity = parseInt(qtyMatch[1]);
              name = qtyMatch[2].trim();
            }
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
    } else {
      // If no specific product section found, look for product patterns throughout the document
      // This is a fallback method for documents without clear section headers
      for (const line of lines) {
        const productMatch = line.match(/(.+?)(?:\s+(\d+)\s+)?[\s\t]*[\$]?\s*(\d+[\.,]\d{2})(?:\s*$)/);
        
        if (productMatch && 
            !(/total|subtotal|tax|shipping|discount/i.test(line))) {
          
          const fullName = productMatch[1].trim();
          const explicitQuantity = productMatch[2] ? parseInt(productMatch[2]) : null;
          const price = parseFloat(productMatch[3].replace(',', '.'));
          
          // Skip obvious non-products
          if (fullName.toLowerCase().includes('total') || 
              fullName.toLowerCase().includes('subtotal')) {
            continue;
          }
          
          // Extract quantity if present
          let quantity = explicitQuantity || 1;
          let name = fullName;
          
          if (!explicitQuantity) {
            const qtyMatch = fullName.match(/^(\d+)\s*x\s*(.+)$/) || fullName.match(/^(\d+)\s+(.+)$/);
            if (qtyMatch) {
              quantity = parseInt(qtyMatch[1]);
              name = qtyMatch[2].trim();
            }
          }
          
          // Determine category
          let category = 'accessory';
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
    }
    
    result.products = products;
    
    // STEP 7: Extract total amount
    const totalSectionKeys = sectionKeys.filter(key => 
      key.includes('total') || key.includes('summary') || key.includes('order_summary'));
    
    // Enhanced total extraction - first check in total-specific sections, then check all content if needed
    let totalFound = false;
    
    // First, check in sections likely to contain total
    if (totalSectionKeys.length > 0) {
      for (const key of totalSectionKeys) {
        const sectionContent = sections.get(key).content.join(' ');
        
        const totalPatterns = [
          /total\s*(?:amount|price|cost)?\s*:\s*\$?\s*(\d+[\.,]\d{2})/i,
          /grand\s*total\s*:\s*\$?\s*(\d+[\.,]\d{2})/i,
          /order\s*total\s*:\s*\$?\s*(\d+[\.,]\d{2})/i,
          /amount\s*due\s*:\s*\$?\s*(\d+[\.,]\d{2})/i,
          /balance\s*(?:due)?\s*:\s*\$?\s*(\d+[\.,]\d{2})/i,
          /total\s*\$?\s*(\d+[\.,]\d{2})/i,
          /total\s*\$\s*(\d+[\.,]\d{2})/i,
          /\$\s*(\d+[\.,]\d{2})\s*total/i
        ];
        
        for (const pattern of totalPatterns) {
          const match = sectionContent.match(pattern);
          if (match && match[1]) {
            result.totalAmount = parseFloat(match[1].replace(',', '.'));
            totalFound = true;
            break;
          }
        }
        
        if (totalFound) break;
      }
    }
    
    // If no total found yet, check the entire document
    if (!totalFound) {
      const allContent = text;
      
      const totalPatterns = [
        /total\s*(?:amount|price|cost)?\s*:\s*\$?\s*(\d+[\.,]\d{2})/i,
        /grand\s*total\s*:\s*\$?\s*(\d+[\.,]\d{2})/i,
        /order\s*total\s*:\s*\$?\s*(\d+[\.,]\d{2})/i,
        /amount\s*due\s*:\s*\$?\s*(\d+[\.,]\d{2})/i,
        /balance\s*(?:due)?\s*:\s*\$?\s*(\d+[\.,]\d{2})/i,
        /total\s*\$?\s*(\d+[\.,]\d{2})/i,
        /total\s*\$\s*(\d+[\.,]\d{2})/i,
        /\$\s*(\d+[\.,]\d{2})\s*total/i
      ];
      
      for (const pattern of totalPatterns) {
        const match = allContent.match(pattern);
        if (match && match[1]) {
          result.totalAmount = parseFloat(match[1].replace(',', '.'));
          totalFound = true;
          break;
        }
      }
      
      // If still no total, calculate from products as last resort
      if (!totalFound && products.length > 0) {
        result.totalAmount = products.reduce((sum, product) => 
          sum + (product.price * product.quantity), 0);
      }
    }
    
    console.log('Extraction complete with improved parser', {
      customerName: result.customerName,
      productsFound: result.products.length,
      totalAmount: result.totalAmount
    });
    
    return result;
  } catch (error) {
    console.error('Error extracting sale info with improved parser', error);
    return null;
  }
}

/**
 * Fallback function that uses simpler logic but with enhanced boundary detection
 * @param {string} text - The raw text extracted from the PDF
 * @return {object} Parsed sale information object
 */
function extractSaleInfoFallback(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    console.warn('Empty or invalid text provided to fallback parser');
    return null;
  }
  
  console.log('Using fallback parser for text with length: ' + text.length);
  
  // Initialize the result object with default values
  const result = {
    customerName: '',
    phoneNumber: '',
    products: [],
    totalAmount: 0,
    date: new Date(),
    storeLocation: '',
    orderNumber: ''
  };
  
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
    
    // Extract products using line-by-line parsing
    const lines = text.split('\n');
    let products = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
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
    
    result.products = products;
    
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
    
    // If no total found, calculate from products
    if (result.totalAmount === 0 && products.length > 0) {
      result.totalAmount = products.reduce((sum, product) => 
        sum + (product.price * product.quantity), 0);
    }
    
    return result;
  } catch (error) {
    console.error('Error in fallback parser', error);
    return null;
  }
}

module.exports = {
  extractSaleInfo,
  extractSaleInfoFallback
};