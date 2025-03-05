import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Row, Col, Spinner, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../services/AuthContext';
// This function has been removed in favor of direct API processing

const UploadSale = () => {
  // Upload state
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [pdfName, setPdfName] = useState(null);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  
  // Sale data state
  const [saleData, setSaleData] = useState({
    customerName: '',
    phoneNumber: '',
    products: [],
    totalAmount: 0,
    date: new Date(),
    store: '',
    orderNumber: '',
  });
  const [originalData, setOriginalData] = useState(null);
  const [confidence, setConfidence] = useState({});
  const [hasModifications, setHasModifications] = useState(false);
  
  // Error recovery state
  const [lastError, setLastError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      setFile(null);
      setFilePreview(null);
      setPdfName(null);
      return;
    }
    
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please select a valid file type (JPEG, PNG, or PDF)');
      setFile(null);
      setFilePreview(null);
      setPdfName(null);
      return;
    }
    
    setFile(selectedFile);
    setError('');
    setSuccess(false);
    setExtractedData(null);
    setParsedData(null);
    
    // Create preview for images or set PDF name
    if (selectedFile.type.startsWith('image/')) {
      setPdfName(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
      setPdfName(selectedFile.name);
    }
  };
  
  // Use the real API instead of mock data
  const handleProcessFile = () => {
    if (file) {
      handleUpload();
    } else {
      setError('Please select a file to upload first');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    
    if (droppedFile) {
      // Check file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(droppedFile.type)) {
        setError('Please select a valid file type (JPEG, PNG, or PDF)');
        return;
      }
      
      setFile(droppedFile);
      setError('');
      setSuccess(false);
      setExtractedData(null);
      setParsedData(null);
      
      // Create preview for images or set PDF name
      if (droppedFile.type.startsWith('image/')) {
        setPdfName(null);
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreview(e.target.result);
        };
        reader.readAsDataURL(droppedFile);
      } else {
        setFilePreview(null);
        setPdfName(droppedFile.name);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    try {
      // Reset states
      setIsUploading(true);
      setIsProcessing(true);
      setError('');
      setHasModifications(false);
      setUploadProgress(0);
      setLastError(null);
      setSuccess(false);
      setParsedData(null);
      
      // Validate file size client-side before uploading
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      }
      
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const apiUrl = `${window.location.protocol}//${window.location.hostname}:5001/api/sales/upload`;
        const response = await axios.post(apiUrl, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          // Track upload progress
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
            console.log(`Upload progress: ${percentCompleted}%`);
          },
          // Set a longer timeout for the axios request
          timeout: 120000 // 2 minutes timeout
        });
        setIsUploading(false);
        
        // Reset retry count on success
        setRetryCount(0);
        
        if (response.data) {
          // Safely extract the response data with fallbacks
          try {
            console.log('Response data received:', response.data);
            
            // Process extracted text - handle null, undefined, or invalid type
            if (response.data.extractedText === null || response.data.extractedText === undefined) {
              console.warn('Extracted text is null or undefined');
              setExtractedData('No text could be extracted from this document. Please enter details manually.');
            } else if (typeof response.data.extractedText !== 'string') {
              console.warn('Extracted text is not a string:', typeof response.data.extractedText);
              setExtractedData('Text extraction resulted in invalid format. Please enter details manually.');
            } else {
              setExtractedData(response.data.extractedText);
            }
            
            // Save the original parsed data for comparison (with validation)
            if (response.data.originalData && typeof response.data.originalData === 'object') {
              setOriginalData(response.data.originalData);
            } else {
              console.warn('Invalid or missing originalData in response');
              // Create a default originalData
              const defaultOriginalData = {
                customerName: '',
                phoneNumber: '',
                products: [{ name: 'Unknown Product', quantity: 1, price: 0 }],
                totalAmount: 0,
                date: new Date(),
                store: '',
                orderNumber: ''
              };
              setOriginalData(defaultOriginalData);
            }
            
            // Set confidence levels for highlighting fields
            setConfidence(response.data.confidence || {});
            
            // Safely set the sale data from the parsed information with defaults
            let safeSaleData = {
              customerName: '',
              phoneNumber: '',
              products: [{ name: 'Unknown Product', quantity: 1, price: 0, category: 'accessory' }],
              totalAmount: 0,
              date: new Date(),
              receiptImage: '',
              store: '',
              orderNumber: ''
            };
            
            if (response.data.saleInfo && typeof response.data.saleInfo === 'object') {
              const saleInfo = response.data.saleInfo;
              
              // Define maximum values to prevent data issues
              const MAX_QUANTITY = 1000;
              const MAX_PRICE = 10000;
              const MAX_TOTAL = 100000;
              
              // Create a safe version of the sale data with proper type validation and limits
              safeSaleData = {
                customerName: typeof saleInfo.customerName === 'string' ? saleInfo.customerName.substring(0, 100) : '',
                phoneNumber: typeof saleInfo.phoneNumber === 'string' ? saleInfo.phoneNumber.substring(0, 20) : '',
                store: typeof saleInfo.storeLocation === 'string' ? saleInfo.storeLocation.substring(0, 50) : '',
                orderNumber: typeof saleInfo.orderNumber === 'string' ? saleInfo.orderNumber.substring(0, 30) : '',
                
                // Ensure products is a valid array with proper defaults and value caps
                products: Array.isArray(saleInfo.products) && saleInfo.products.length > 0 ? 
                  // Map each product with type checking and validation
                  saleInfo.products.slice(0, 20).map(p => {
                    // Safely parse quantity with maximum limits
                    let quantity = 1;
                    try {
                      const parsedQty = parseInt(p?.quantity);
                      if (!isNaN(parsedQty) && parsedQty > 0) {
                        quantity = Math.min(parsedQty, MAX_QUANTITY);
                      }
                    } catch (e) {
                      console.error('Error parsing quantity:', e);
                    }
                    
                    // Safely parse price with maximum limits
                    let price = 0;
                    try {
                      const parsedPrice = parseFloat(p?.price);
                      if (!isNaN(parsedPrice) && parsedPrice >= 0) {
                        price = Math.min(parsedPrice, MAX_PRICE);
                      }
                    } catch (e) {
                      console.error('Error parsing price:', e);
                    }
                    
                    return {
                      name: typeof p?.name === 'string' ? p.name.substring(0, 100) : 'Unknown Product',
                      quantity,
                      price,
                      category: typeof p?.category === 'string' ? p.category : 'accessory',
                      id: typeof p?.id === 'string' ? p.id : Date.now().toString() + Math.random().toString(36).substring(2, 7)
                    };
                  }) 
                  : [{ name: 'Unknown Product', quantity: 1, price: 0, category: 'accessory' }],
                
                // Safely parse total amount with maximum limit
                totalAmount: (() => {
                  try {
                    const parsedTotal = parseFloat(saleInfo.totalAmount);
                    if (!isNaN(parsedTotal) && parsedTotal >= 0) {
                      return Math.min(parsedTotal, MAX_TOTAL);
                    }
                    return 0;
                  } catch (e) {
                    console.error('Error parsing total amount:', e);
                    return 0;
                  }
                })(),
                
                // Ensure date is a valid Date object
                date: saleInfo.date && !isNaN(new Date(saleInfo.date).getTime()) ? 
                  new Date(saleInfo.date) : new Date(),
                
                receiptImage: typeof saleInfo.receiptImage === 'string' ? saleInfo.receiptImage : ''
              };
            } else {
              console.warn('Invalid or missing saleInfo in response');
            }
            
            // Always ensure we have at least one product
            if (!Array.isArray(safeSaleData.products) || safeSaleData.products.length === 0) {
              safeSaleData.products = [{ name: 'Unknown Product', quantity: 1, price: 0, category: 'accessory' }];
            }
            
            // Set parsed data flag to show the parsed view
            setParsedData(safeSaleData);
            setSaleData(safeSaleData);
          } catch (parsingError) {
            console.error('Error parsing response data:', parsingError);
            // Still try to show the extracted text even if sale data parsing fails
            if (response.data.extractedText) {
              setExtractedData(response.data.extractedText);
            }
            
            // Set default sale data as fallback
            const defaultSaleData = {
              customerName: '',
              phoneNumber: '',
              products: [{ name: 'Unknown Product', quantity: 1, price: 0, category: 'accessory' }],
              totalAmount: 0,
              date: new Date(),
              receiptImage: '',
              store: '',
              orderNumber: ''
            };
            
            setParsedData(defaultSaleData);
            setSaleData(defaultSaleData);
            
            // Show a warning but don't block the UI
            setError('Warning: Some data could not be automatically extracted. Please review and enter manually.');
          }
        }
      } catch (axiosError) {
        // Store the last error for potential retry
        setLastError(axiosError);
        
        // Increment retry count
        setRetryCount(prev => prev + 1);
        
        // Handle different error types with simplified approach
        if (axiosError.code === 'ECONNABORTED') {
          throw new Error('Request timed out. The file may be too large or the server is busy.');
        } else if (axiosError.response) {
          // Server returned an error response
          const errorMessage = axiosError.response.data?.message || 'Server error processing file.';
          throw new Error(errorMessage);
        } else if (axiosError.request) {
          // No response received
          throw new Error('No response from server. Please check your connection and try again.');
        } else {
          // Something else went wrong
          throw new Error('Error uploading file: ' + (axiosError.message || 'Unknown error'));
        }
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to process file. Please try again.';
      setError(errorMessage);
      console.error('File upload error:', err);
      
      // Reset file if there was a critical error
      if (err.message?.includes('too large') || err.message?.includes('timed out')) {
        setFile(null);
        setFilePreview(null);
        setPdfName(null);
      }
      
      setIsUploading(false);
    } finally {
      setIsProcessing(false);
      setUploadProgress(0); // Reset progress bar
    }
  };
  
  // Add a retry function for user convenience
  const handleRetry = () => {
    if (file) {
      handleUpload();
    } else {
      setError('Please select a file first');
    }
  };
  
  // Handle cancel button click
  const handleCancel = () => {
    setFile(null);
    setFilePreview(null);
    setPdfName(null);
    setExtractedData(null);
    setParsedData(null);
    setError('');
    setSuccess(false);
  };
  
  // Handle confirm button click
  const handleConfirm = () => {
    if (!saleData) return;
    
    // Determine the primary category based on items
    const hasActivation = saleData.products.some(item => item.category === 'activation');
    const hasUpgrade = saleData.products.some(item => item.category === 'upgrade');
    let primaryCategory = 'other';
    
    if (hasActivation) {
      primaryCategory = 'activation';
    } else if (hasUpgrade) {
      primaryCategory = 'upgrade';
    } else if (saleData.products.length > 0) {
      primaryCategory = 'accessory';
    }
    
    // Define limits to prevent data issues
    const MAX_QUANTITY = 1000;
    const MAX_PRICE = 10000;
    const MAX_TOTAL = 100000;
    
    // Prepare sale data with validation and limits
    const formattedSaleData = {
      customerName: String(saleData.customerName || '').substring(0, 100),
      phoneNumber: String(saleData.phoneNumber || '').substring(0, 20),
      employee: String(user?.id || ''),
      date: saleData.date instanceof Date ? saleData.date.toISOString() : new Date().toISOString(),
      storeLocation: String(saleData.store || user?.storeLocation || '').substring(0, 50),
      orderNumber: String(saleData.orderNumber || '').substring(0, 30),
      commission: 0, // Will be calculated on server
      
      // Safely parse and limit totalAmount
      totalAmount: (() => {
        try {
          const parsedTotal = parseFloat(saleData.totalAmount);
          return !isNaN(parsedTotal) && parsedTotal >= 0 ? 
            Math.min(parsedTotal, MAX_TOTAL) : 0;
        } catch (e) {
          console.error('Error parsing total amount in handleConfirm:', e);
          return 0;
        }
      })(),
      
      // Validate and limit product values
      products: Array.isArray(saleData.products) ? saleData.products.slice(0, 20).map(p => {
        // Safely parse quantity with limit
        let quantity = 1;
        try {
          const parsedQty = parseInt(p.quantity, 10);
          quantity = !isNaN(parsedQty) && parsedQty > 0 ? 
            Math.min(parsedQty, MAX_QUANTITY) : 1;
        } catch (e) {
          console.error('Error parsing product quantity in handleConfirm:', e);
        }
        
        // Safely parse price with limit
        let price = 0;
        try {
          const parsedPrice = parseFloat(p.price);
          price = !isNaN(parsedPrice) && parsedPrice >= 0 ? 
            Math.min(parsedPrice, MAX_PRICE) : 0;
        } catch (e) {
          console.error('Error parsing product price in handleConfirm:', e);
        }
        
        return {
          name: String(p.name || '').substring(0, 100),
          quantity,
          price,
          category: String(p.category || 'accessory')
        };
      }) : [],
      
      category: primaryCategory,
      receiptImage: typeof saleData.receiptImage === 'string' ? saleData.receiptImage : ''
    };
    
    // Verify the data before submission
    if (formattedSaleData.products.length === 0) {
      setError('No products found. Cannot create a sale without products.');
      return;
    }
    
    if (formattedSaleData.totalAmount <= 0 && formattedSaleData.products.some(p => p.price > 0)) {
      // Recalculate total if missing but we have product prices
      formattedSaleData.totalAmount = formattedSaleData.products.reduce(
        (sum, p) => sum + (p.price * p.quantity), 0
      );
    }
    
    console.log('Sale data prepared for submission:', formattedSaleData);
    
    // Submit the data directly without setTimeout to avoid race conditions
    handleSaveSale(formattedSaleData);
  };

  const checkForModifications = (updatedData) => {
    if (!originalData || typeof originalData !== 'object') {
      console.log('No valid originalData to compare against, skipping modification check');
      return false;
    }
    
    try {
      // Create a deeply sanitized version of the input data to avoid type errors
      const sanitizedOriginal = {
        customerName: String(originalData.customerName || ''),
        phoneNumber: String(originalData.phoneNumber || ''),
        totalAmount: parseFloat(originalData.totalAmount) || 0,
        date: originalData.date instanceof Date ? originalData.date : 
             (typeof originalData.date === 'string' && !isNaN(new Date(originalData.date).getTime())) ? 
             new Date(originalData.date) : new Date(),
        products: Array.isArray(originalData.products) ? originalData.products.map(p => ({
          name: String(p?.name || ''),
          quantity: parseInt(p?.quantity) || 1,
          price: parseFloat(p?.price) || 0
        })) : []
      };
      
      const sanitizedUpdated = {
        customerName: String(updatedData.customerName || ''),
        phoneNumber: String(updatedData.phoneNumber || ''),
        totalAmount: parseFloat(updatedData.totalAmount) || 0,
        date: updatedData.date instanceof Date ? updatedData.date : 
             (typeof updatedData.date === 'string' && !isNaN(new Date(updatedData.date).getTime())) ? 
             new Date(updatedData.date) : new Date(),
        products: Array.isArray(updatedData.products) ? updatedData.products.map(p => ({
          name: String(p?.name || ''),
          quantity: parseInt(p?.quantity) || 1, 
          price: parseFloat(p?.price) || 0
        })) : []
      };
      
      // Basic fields comparison with safe string comparison
      const basicFieldsChanged = 
        sanitizedOriginal.customerName !== sanitizedUpdated.customerName ||
        sanitizedOriginal.phoneNumber !== sanitizedUpdated.phoneNumber ||
        Math.abs(sanitizedOriginal.totalAmount - sanitizedUpdated.totalAmount) > 0.01; // Account for floating point errors
      
      // Date comparison - compare only the date part, not time
      let dateChanged = false;
      try {
        // Both dates are now guaranteed to be valid
        dateChanged = sanitizedOriginal.date.toDateString() !== sanitizedUpdated.date.toDateString();
      } catch (dateError) {
        console.error('Error comparing dates:', dateError);
        dateChanged = true; // Assume changed if we can't compare
      }
      
      // Products comparison
      let productsChanged = sanitizedOriginal.products.length !== sanitizedUpdated.products.length;
      
      if (!productsChanged && sanitizedUpdated.products.length > 0) {
        // Compare each product if lengths match
        for (let i = 0; i < sanitizedOriginal.products.length; i++) {
          const origProd = sanitizedOriginal.products[i];
          const updatedProd = sanitizedUpdated.products[i];
          
          if (
            origProd.name !== updatedProd.name ||
            origProd.quantity !== updatedProd.quantity ||
            Math.abs(origProd.price - updatedProd.price) > 0.01 // Account for floating point errors
          ) {
            productsChanged = true;
            break;
          }
        }
      }
      
      const isModified = basicFieldsChanged || dateChanged || productsChanged;
      
      // Log the result for debugging purposes
      if (isModified) {
        console.log('Modifications detected:', {
          basicFieldsChanged,
          dateChanged,
          productsChanged,
          original: sanitizedOriginal,
          updated: sanitizedUpdated
        });
      }
      
      return isModified;
    } catch (err) {
      console.error('Error checking for modifications:', err);
      // In case of error, assume modifications to be safe
      return true;
    }
  };

  // Helper functions for text extraction
  const findCustomerName = (text) => {
    if (!text) return '';
    
    const customerPatterns = [
      /customer\s*:\s*([^\n]+)/i,
      /customer\s*name\s*:\s*([^\n]+)/i,
      /bill\s*to\s*:\s*([^\n]+)/i,
      /sold\s*to\s*:\s*([^\n]+)/i,
      /name\s*:\s*([^\n]+)/i
    ];
    
    for (const pattern of customerPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim()) {
        return match[1].trim();
      }
    }
    
    return '';
  };
  
  const findPhoneNumber = (text) => {
    if (!text) return '';
    
    const phonePatterns = [
      /(?:phone|tel|telephone|mobile)\s*:\s*([0-9\(\)\s\-\.]+)/i,
      /(\(\d{3}\)\s*\d{3}[-\s]\d{4})/,
      /(\d{3}[-\.\s]\d{3}[-\.\s]\d{4})/
    ];
    
    for (const pattern of phonePatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim()) {
        return match[1].trim();
      }
    }
    
    return '';
  };
  
  const findStoreName = (text) => {
    if (!text) return '';
    
    const storePatterns = [
      /store\s*:\s*([^\n]+)/i,
      /location\s*:\s*([^\n]+)/i,
      /branch\s*:\s*([^\n]+)/i
    ];
    
    for (const pattern of storePatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim()) {
        return match[1].trim();
      }
    }
    
    // Try to find store name in the first few lines
    const firstLines = text.split('\n').slice(0, 5);
    for (const line of firstLines) {
      if (line.trim() && line.trim().length < 40 && 
          !line.includes('receipt') && 
          !line.includes('invoice') && 
          !line.match(/\d{2}\/\d{2}\/\d{2,4}/)) {
        return line.trim();
      }
    }
    
    return '';
  };
  
  const findPossibleProducts = (text) => {
    if (!text || !saleData || !saleData.products) return;
    
    // Split text into lines
    const lines = text.split('\n');
    const possibleProducts = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip short lines and header lines
      if (line.length < 5 || /total|subtotal|tax|date|customer|phone|^\s*$/i.test(line)) {
        continue;
      }
      
      // Try to find a price pattern
      const priceMatch = line.match(/\$?(\d+\.\d{2})/);
      if (priceMatch && priceMatch[1]) {
        const price = parseFloat(priceMatch[1]);
        const productName = line.replace(priceMatch[0], '').trim();
        
        if (productName && price > 0 && !productName.toLowerCase().includes('total')) {
          possibleProducts.push({
            name: productName,
            price,
            quantity: 1,
            category: 'accessory'
          });
        }
      }
    }
    
    // If we found possible products, add them to the sale data
    if (possibleProducts.length > 0) {
      const updatedSaleData = {
        ...saleData,
        products: [...possibleProducts]
      };
      
      setSaleData(updatedSaleData);
      setHasModifications(true);
    }
  };
  
  const handleInputChange = (field, value) => {
    const updatedSaleData = {
      ...saleData,
      [field]: value,
    };
    
    setSaleData(updatedSaleData);
    setHasModifications(checkForModifications(updatedSaleData));
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...saleData.products];
    updatedProducts[index][field] = field === 'price' || field === 'quantity' 
      ? parseFloat(value) || 0 
      : value;
      
    const updatedSaleData = {
      ...saleData,
      products: updatedProducts,
    };
    
    setSaleData(updatedSaleData);
    setHasModifications(checkForModifications(updatedSaleData));
  };

  const handleAddProduct = () => {
    const updatedSaleData = {
      ...saleData,
      products: [
        ...saleData.products, 
        { name: '', quantity: 1, price: 0 }
      ],
    };
    
    setSaleData(updatedSaleData);
    setHasModifications(true); // Adding a product is always a modification
  };

  const handleRemoveProduct = (index) => {
    const updatedProducts = [...saleData.products];
    updatedProducts.splice(index, 1);
    
    const updatedSaleData = {
      ...saleData,
      products: updatedProducts,
    };
    
    setSaleData(updatedSaleData);
    setHasModifications(true); // Removing a product is always a modification
  };

  const handleSaveSale = async (formattedData) => {
    try {
      setIsProcessing(true);
      setError('');
      
      // Use provided data or validate existing saleData
      const dataToSubmit = formattedData || (() => {
        // Validate the saleData before submission to catch rendering issues
        try {
          if (!saleData) {
            throw new Error('Sale data is missing');
          }
          
          // Check required fields
          if (!saleData.customerName) {
            setError('Customer name is required');
            setIsProcessing(false);
            return null;
          }
          
          // Validate products array
          if (!Array.isArray(saleData.products)) {
            setError('Products data is invalid');
            console.error('Invalid products data:', saleData.products);
            setIsProcessing(false);
            return null;
          }
          
          if (saleData.products.length === 0) {
            setError('At least one product is required');
            setIsProcessing(false);
            return null;
          }
          
          // Validate totalAmount is a number
          if (isNaN(parseFloat(saleData.totalAmount))) {
            setError('Total amount must be a valid number');
            setIsProcessing(false);
            return null;
          }
          
          // Validate date
          if (!(saleData.date instanceof Date) && isNaN(new Date(saleData.date).getTime())) {
            setError('Sale date is invalid');
            console.error('Invalid date:', saleData.date);
            setIsProcessing(false);
            return null;
          }
          
          // Calculate commission based on user's commission rate
          const commissionRate = user?.commissionRate || 10;
          const commission = (parseFloat(saleData.totalAmount) * commissionRate) / 100;
          
          // Format date properly with error handling
          let formattedDate;
          try {
            formattedDate = saleData.date instanceof Date && !isNaN(saleData.date.getTime()) 
              ? saleData.date.toISOString() 
              : new Date().toISOString();
          } catch (e) {
            console.error('Date formatting error:', e);
            formattedDate = new Date().toISOString();
          }
          
          // Prepare sale data for submission with thorough validation
          const formattedSaleData = {
            customerName: String(saleData.customerName || ''),
            phoneNumber: String(saleData.phoneNumber || ''),
            employee: String(user?.id || ''),
            date: formattedDate,
            storeLocation: String(saleData.store || user?.storeLocation || ''),
            orderNumber: String(saleData.orderNumber || ''),
            commission: isNaN(commission) ? 0 : commission,
            totalAmount: parseFloat(saleData.totalAmount) || 0,
            products: Array.isArray(saleData.products) ? saleData.products.map(p => ({
              name: String(p.name || ''),
              quantity: parseInt(p.quantity) || 1,
              price: parseFloat(p.price) || 0,
              category: String(p.category || 'accessory')
            })) : [],
            receiptImage: typeof saleData.receiptImage === 'string' ? saleData.receiptImage : ''
          };
          
          // Include original data for comparison on server if it exists
          if (originalData && typeof originalData === 'object') {
            try {
              // Make a clean copy with only the needed fields and proper type validation
              formattedSaleData.originalData = {
                customerName: String(originalData.customerName || ''),
                phoneNumber: String(originalData.phoneNumber || ''),
                date: originalData.date instanceof Date ? originalData.date.toISOString() : 
                      typeof originalData.date === 'string' ? originalData.date : 
                      new Date().toISOString(),
                totalAmount: parseFloat(originalData.totalAmount) || 0,
                products: Array.isArray(originalData.products) ? 
                  originalData.products.map(p => ({
                    name: String(p.name || ''),
                    quantity: parseInt(p.quantity) || 1,
                    price: parseFloat(p.price) || 0,
                    category: String(p.category || 'accessory')
                  })) : []
              };
            } catch (originalDataErr) {
              console.error('Error preparing original data:', originalDataErr);
              // Don't include originalData if it can't be properly formatted
            }
          }
          
          return formattedSaleData;
        } catch (validationErr) {
          setError(`Data validation error: ${validationErr.message}`);
          console.error('Sale data validation error:', validationErr, saleData);
          setIsProcessing(false);
          return null;
        }
      })();
      
      // If validation failed, return early
      if (!dataToSubmit && !formattedData) {
        return;
      }
      
      const finalData = formattedData || dataToSubmit;
      console.log('Submitting sale data:', finalData);
      
      // Submit the sale data without AbortController to avoid potential issues
      try {
        const apiUrl = `${window.location.protocol}//${window.location.hostname}:5001/api/sales`;
        const response = await axios.post(apiUrl, finalData);
        
        if (response.status === 201) {
          // If the sale requires approval, show a notification
          if (hasModifications && response.data.approvalStatus === 'pending') {
            alert('Your sale has been submitted and is pending approval by a manager.');
          }
          
          navigate('/sales');
        }
      } catch (axiosError) {
        // Handle different error types with simpler approach
        if (axiosError.response) {
          // Server returned an error response
          throw new Error(`Server error: ${axiosError.response.data?.message || axiosError.response.statusText}`);
        } else if (axiosError.request) {
          // No response received
          throw new Error('No response from server. Please check your connection and try again.');
        } else {
          // Something else went wrong
          throw new Error('Error submitting sale: ' + (axiosError.message || 'Unknown error'));
        }
      }
    } catch (err) {
      setError('Failed to save sale. ' + (err.message || 'Please try again.'));
      console.error('Sale save error:', err);
      setSuccess(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Wrap the render in an error boundary
  const [renderError, setRenderError] = useState(null);

  // Check for any issues with the data that might prevent rendering
  useEffect(() => {
    try {
      // Validate extractedData
      if (extractedData !== null && typeof extractedData !== 'string') {
        console.error('Invalid extractedData type:', typeof extractedData);
        setRenderError('Data type error: extractedData is not a string');
      }
      
      // Validate saleData structure for rendering
      if (saleData) {
        // Check date validity
        if (saleData.date && !(saleData.date instanceof Date) && isNaN(new Date(saleData.date).getTime())) {
          console.error('Invalid date in saleData:', saleData.date);
          setRenderError('Invalid date format in sale data');
        }
        
        // Check products array
        if (saleData.products && !Array.isArray(saleData.products)) {
          console.error('Products is not an array:', saleData.products);
          setRenderError('Data structure error: products is not an array');
        }
      }
    } catch (err) {
      console.error('Error validating render data:', err);
      setRenderError(`Render preparation error: ${err.message}`);
    }
  }, [extractedData, saleData]);
  
  // Helper function for getting category colors
  const getCategoryColor = (category, isBackground = false) => {
    const alpha = isBackground ? '20' : '';
    switch (category) {
      case 'accessory': return '#4C9AFF' + alpha; // Primary blue
      case 'activation': return '#36B37E' + alpha; // Green
      case 'upgrade': return '#6554C0' + alpha; // Purple
      default: return '#6B778C' + alpha; // Gray
    }
  };

  return (
    <div>
      <h1 className="page-title">
        <i className="fa-solid fa-file-invoice"></i> 
        Upload Receipt
      </h1>
      
      {renderError && (
        <Alert variant="danger" className="d-flex align-items-center">
          <i className="fa-solid fa-bug me-2"></i>
          <div>
            <strong>Application Error:</strong> {renderError}
            <div className="mt-2">
              <Button 
                variant="outline-danger" 
                size="sm" 
                onClick={() => window.location.reload()}
              >
                <i className="fa-solid fa-arrow-rotate-right me-1"></i> Refresh Page
              </Button>
            </div>
          </div>
        </Alert>
      )}
      
      {error && !renderError && (
        <Alert variant="danger" className="d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2"></i>
          <div>{error}</div>
        </Alert>
      )}
      
      {!filePreview && !pdfName && !parsedData && !success && (
        <Card className="mb-4 cricket-card upload-options-card">
          <Card.Header className="bg-primary text-white">
            <h5 className="mb-0">
              <i className="fa-solid fa-upload me-2"></i> Upload Receipt or Invoice
            </h5>
            <p className="text-white-50 m-0 mt-1 small">
              Upload an image or PDF of a receipt to automatically add a sale
            </p>
          </Card.Header>
          <Card.Body>
            <div className="upload-options">
              <div 
                className="upload-option"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="upload-icon text-primary">
                  <i className="fa-solid fa-camera fa-2x"></i>
                </div>
                <h5 className="mt-3 mb-2">Select Receipt Image</h5>
                <p className="text-muted small mb-3">Upload a photo of your receipt</p>
                <Form.Group>
                  <Button 
                    variant="outline-primary" 
                    className="upload-btn"
                    onClick={() => document.getElementById('image-upload').click()}
                  >
                    <i className="fa-solid fa-file-image me-2"></i>
                    Choose Image
                  </Button>
                  <Form.Control
                    id="image-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </Form.Group>
                
              </div>
              
              <div className="upload-divider d-flex align-items-center my-3">
                <div className="divider-line flex-grow-1"></div>
                <span className="mx-3 text-muted">OR</span>
                <div className="divider-line flex-grow-1"></div>
              </div>
              
              <div className="upload-option">
                <div className="upload-icon text-primary">
                  <i className="fa-solid fa-file-pdf fa-2x"></i>
                </div>
                <h5 className="mt-3 mb-2">Select Receipt PDF</h5>
                <p className="text-muted small mb-3">Upload a PDF version of your receipt</p>
                <Form.Group>
                  <Button 
                    variant="outline-primary" 
                    className="upload-btn"
                    onClick={() => document.getElementById('pdf-upload').click()}
                  >
                    <i className="fa-solid fa-file-pdf me-2"></i>
                    Choose PDF
                  </Button>
                  <Form.Control
                    id="pdf-upload"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </Form.Group>
                
              </div>
            </div>
            
            <div className="mt-3 text-center text-muted small">
              <i className="fa-solid fa-info-circle me-1"></i>
              Supported file types: JPEG, PNG, PDF (max 10MB)
            </div>
          </Card.Body>
        </Card>
      )}
      
      {filePreview && !parsedData && !success && (
        <Card className="mb-4 receipt-preview-card">
          <Card.Header className="bg-primary text-white">
            <h5 className="mb-0">
              <i className="fa-solid fa-image me-2"></i> Receipt Preview
            </h5>
          </Card.Header>
          <Card.Body>
            <div className="text-center mb-4">
              <img 
                src={filePreview} 
                alt="Receipt preview" 
                className="receipt-preview mb-3 shadow-sm"
                style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px' }} 
              />
            </div>
            
            {isUploading || isProcessing ? (
              <div className="text-center py-4">
                <div className="loading-indicator">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-primary">
                    {isUploading ? 'Uploading image...' : 'Parsing receipt data...'}
                  </p>
                </div>
                
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-3" style={{ maxWidth: '300px', margin: '0 auto' }}>
                    <div className="d-flex justify-content-between mb-1">
                      <small>Uploading...</small>
                      <small>{uploadProgress}%</small>
                    </div>
                    <div className="progress">
                      <div 
                        className="progress-bar bg-success" 
                        role="progressbar" 
                        style={{ width: `${uploadProgress}%` }}
                        aria-valuenow={uploadProgress} 
                        aria-valuemin="0" 
                        aria-valuemax="100"
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="button-row">
                <Button 
                  variant="outline-secondary" 
                  onClick={handleCancel}
                  className="action-button cancel-button"
                >
                  <i className="fa-solid fa-times me-2"></i>
                  Cancel
                </Button>
                
                <Button 
                  variant="outline-primary" 
                  onClick={() => handleFileChange({ target: { files: [] } })}
                  className="action-button"
                >
                  <i className="fa-solid fa-image me-2"></i>
                  Try Another
                </Button>
                
                <Button 
                  variant="primary" 
                  onClick={handleProcessFile}
                  className="action-button process-button"
                >
                  <i className="fa-solid fa-magnifying-glass me-2"></i>
                  Process Receipt
                </Button>
              </div>
            )}
          </Card.Body>
        </Card>
      )}
      
      {pdfName && !parsedData && !success && (
        <Card className="mb-4 receipt-preview-card">
          <Card.Header className="bg-primary text-white">
            <h5 className="mb-0">
              <i className="fa-solid fa-file-pdf me-2"></i> PDF Receipt
            </h5>
          </Card.Header>
          <Card.Body>
            <div className="pdf-preview text-center py-4">
              <div className="pdf-icon-container mb-3">
                <i className="fa-solid fa-file-pdf" style={{ fontSize: '64px', color: '#e74c3c' }}></i>
              </div>
              <h5 className="pdf-filename">{pdfName}</h5>
            </div>
            
            {isUploading || isProcessing ? (
              <div className="text-center py-4">
                <div className="loading-indicator">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-primary">
                    {isUploading ? 'Uploading PDF...' : 'Parsing PDF data...'}
                  </p>
                </div>
                
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-3" style={{ maxWidth: '300px', margin: '0 auto' }}>
                    <div className="d-flex justify-content-between mb-1">
                      <small>Uploading...</small>
                      <small>{uploadProgress}%</small>
                    </div>
                    <div className="progress">
                      <div 
                        className="progress-bar bg-success" 
                        role="progressbar" 
                        style={{ width: `${uploadProgress}%` }}
                        aria-valuenow={uploadProgress} 
                        aria-valuemin="0" 
                        aria-valuemax="100"
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="button-row">
                <Button 
                  variant="outline-secondary" 
                  onClick={handleCancel}
                  className="action-button cancel-button"
                >
                  <i className="fa-solid fa-times me-2"></i>
                  Cancel
                </Button>
                
                <Button 
                  variant="outline-primary" 
                  onClick={() => handleFileChange({ target: { files: [] } })}
                  className="action-button"
                >
                  <i className="fa-solid fa-file-pdf me-2"></i>
                  Try Another
                </Button>
                
                <Button 
                  variant="primary" 
                  onClick={handleProcessFile}
                  className="action-button process-button"
                >
                  <i className="fa-solid fa-magnifying-glass me-2"></i>
                  Process PDF
                </Button>
              </div>
            )}
          </Card.Body>
        </Card>
      )}
      
      {parsedData && !success && (
        <Card className="mb-4 parsed-receipt-card">
          <Card.Header className="bg-primary text-white">
            <h5 className="mb-0">
              <i className="fa-solid fa-receipt me-2"></i> 
              Parsed Receipt
            </h5>
            <p className="text-white-50 m-0 mt-1 small">
              Please verify the information below
            </p>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col lg={6} className="mb-4">
                <div className="card shadow-sm receipt-info-card">
                  <div className="card-body">
                    <div className="receipt-info-row">
                      <div className="receipt-info-label">Store:</div>
                      <div className="receipt-info-value d-flex">
                        <Form.Control
                          type="text"
                          value={saleData.store || ''}
                          onChange={(e) => handleInputChange('store', e.target.value)}
                          placeholder="Enter store name"
                          className={hasModifications ? 'border-warning' : ''}
                        />
                      </div>
                    </div>
                    <div className="receipt-info-row">
                      <div className="receipt-info-label">Date:</div>
                      <div className="receipt-info-value d-flex">
                        <Form.Control
                          type="date"
                          value={saleData.date instanceof Date ? saleData.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                          onChange={(e) => handleInputChange('date', new Date(e.target.value))}
                          className={hasModifications ? 'border-warning' : ''}
                        />
                      </div>
                    </div>
                    <div className="receipt-info-row">
                      <div className="receipt-info-label">Customer:</div>
                      <div className="receipt-info-value d-flex">
                        <Form.Control
                          type="text"
                          value={saleData.customerName || ''}
                          onChange={(e) => handleInputChange('customerName', e.target.value)}
                          placeholder="Enter customer name"
                          className={hasModifications ? 'border-warning' : ''}
                        />
                      </div>
                    </div>
                    <div className="receipt-info-row">
                      <div className="receipt-info-label">Phone:</div>
                      <div className="receipt-info-value d-flex">
                        <Form.Control
                          type="text"
                          value={saleData.phoneNumber || ''}
                          onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                          placeholder="Enter phone number"
                          className={hasModifications ? 'border-warning' : ''}
                        />
                      </div>
                    </div>
                    <div className="receipt-info-row">
                      <div className="receipt-info-label">Order #:</div>
                      <div className="receipt-info-value d-flex">
                        <Form.Control
                          type="text"
                          value={saleData.orderNumber || ''}
                          onChange={(e) => handleInputChange('orderNumber', e.target.value)}
                          placeholder="Enter order number"
                          className={hasModifications ? 'border-warning' : ''}
                        />
                      </div>
                    </div>
                    <div className="receipt-info-row">
                      <div className="receipt-info-label">Total:</div>
                      <div className="receipt-info-value d-flex">
                        <Form.Control
                          type="number"
                          step="0.01"
                          value={parseFloat(saleData.totalAmount || 0).toFixed(2)}
                          onChange={(e) => handleInputChange('totalAmount', parseFloat(e.target.value))}
                          className={hasModifications ? 'border-warning fw-bold' : 'fw-bold'}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
              
              <Col lg={6} className="mb-4">
                <div className="card shadow-sm receipt-preview-card h-100">
                  <div className="card-header bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">Raw Extracted Text</h6>
                      <small className="text-muted">Click any text to use it</small>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="extracted-text-container" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                      {extractedData ? (
                        <div className="extracted-text p-2">
                          <div className="mb-3">
                            <div className="text-muted mb-2 small fw-bold">Select text to use:</div>
                            <div className="extraction-actions d-flex flex-wrap gap-1 mb-2">
                              <Button 
                                size="sm" 
                                variant="outline-primary" 
                                onClick={() => handleInputChange('customerName', findCustomerName(extractedData))}
                                className="extraction-action-btn"
                              >
                                <i className="fa-solid fa-user me-1"></i> Find Customer
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline-primary"
                                onClick={() => handleInputChange('phoneNumber', findPhoneNumber(extractedData))}
                                className="extraction-action-btn"
                              >
                                <i className="fa-solid fa-phone me-1"></i> Find Phone
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline-primary"
                                onClick={() => handleInputChange('store', findStoreName(extractedData))}
                                className="extraction-action-btn"
                              >
                                <i className="fa-solid fa-store me-1"></i> Find Store
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline-primary"
                                onClick={() => findPossibleProducts(extractedData)}
                                className="extraction-action-btn"
                              >
                                <i className="fa-solid fa-tag me-1"></i> Find Products
                              </Button>
                            </div>
                          </div>
                          
                          <div className="overflow-auto p-2 bg-light rounded" style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.5' }}>
                            {extractedData.split('\n').map((line, idx) => (
                              line.trim().length > 0 && (
                                <div 
                                  key={idx} 
                                  className="extracted-line"
                                  style={{ 
                                    cursor: 'pointer', 
                                    padding: '3px 6px',
                                    borderRadius: '3px',
                                    marginBottom: '2px',
                                    backgroundColor: 'white',
                                    border: '1px solid #e9ecef'
                                  }}
                                  onClick={() => setSelectedText(line.trim())}
                                  title="Click to select"
                                >
                                  {line}
                                </div>
                              )
                            ))}
                          </div>
                          
                          {selectedText && (
                            <div className="selected-text-actions mt-3 p-2 border rounded bg-light">
                              <div className="fw-bold small mb-2">Selected text:</div>
                              <div className="selected-text-display p-2 mb-2 bg-white border rounded">
                                {selectedText}
                              </div>
                              <div className="d-flex gap-1 flex-wrap">
                                <Button 
                                  size="sm" 
                                  variant="outline-secondary"
                                  onClick={() => navigator.clipboard.writeText(selectedText)}
                                >
                                  <i className="fa-solid fa-copy me-1"></i> Copy
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline-secondary"
                                  onClick={() => handleInputChange('customerName', selectedText)}
                                >
                                  Customer
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline-secondary"
                                  onClick={() => handleInputChange('phoneNumber', selectedText)}
                                >
                                  Phone
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline-secondary"
                                  onClick={() => handleInputChange('store', selectedText)}
                                >
                                  Store
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline-secondary"
                                  onClick={() => handleInputChange('orderNumber', selectedText)}
                                >
                                  Order #
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center p-5">
                          <div className="d-flex flex-column justify-content-center align-items-center text-muted">
                            {filePreview ? (
                              <img 
                                src={filePreview} 
                                alt="Receipt" 
                                className="img-fluid rounded shadow-sm mb-3"
                                style={{ maxHeight: '100px' }} 
                              />
                            ) : pdfName ? (
                              <div className="text-center mb-3">
                                <i className="fa-solid fa-file-pdf" style={{ fontSize: '48px', color: '#e74c3c' }}></i>
                                <p className="mt-2 small">{pdfName}</p>
                              </div>
                            ) : (
                              <i className="fa-solid fa-receipt mb-3" style={{ fontSize: '48px' }}></i>
                            )}
                            <p>No text has been extracted yet</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
            
            <h5 className="items-heading mt-2 mb-3">Items</h5>
            
            <div className="parsed-items">
              {parsedData.products.map((item, index) => (
                <div key={index} className="item-card mb-3">
                  <div className="item-header">
                    <div className="w-100 d-flex">
                      <Form.Control
                        type="text"
                        value={item.name || ''}
                        onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                        placeholder="Product name"
                        className="item-name-input me-2"
                      />
                      <Form.Select
                        value={item.category || 'accessory'}
                        onChange={(e) => handleProductChange(index, 'category', e.target.value)}
                        className="item-category-select"
                        style={{ 
                          backgroundColor: getCategoryColor(item.category, true),
                          color: getCategoryColor(item.category),
                          width: 'auto'
                        }}
                      >
                        <option value="accessory">ACCESSORY</option>
                        <option value="activation">ACTIVATION</option>
                        <option value="upgrade">UPGRADE</option>
                        <option value="protection">PROTECTION</option>
                        <option value="service">SERVICE</option>
                      </Form.Select>
                    </div>
                  </div>
                  <div className="item-details">
                    <div className="d-flex justify-content-between flex-wrap mt-2">
                      <div className="item-quantity pe-2">
                        <small className="text-muted d-block">Quantity: </small>
                        <Form.Control
                          type="number"
                          min="1"
                          value={item.quantity || 1}
                          onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="quantity-input"
                          style={{ width: '80px' }}
                        />
                      </div>
                      <div className="item-price pe-2">
                        <small className="text-muted d-block">Price: </small>
                        <Form.Control
                          type="number"
                          step="0.01"
                          value={parseFloat(item.price || 0).toFixed(2)}
                          onChange={(e) => handleProductChange(index, 'price', parseFloat(e.target.value) || 0)}
                          className="price-input"
                          style={{ width: '100px' }}
                        />
                      </div>
                      <div className="item-total fw-medium pe-2">
                        <small className="text-muted d-block">Total: </small>
                        <div className="total-display">
                          ${((item.quantity || 1) * (parseFloat(item.price) || 0)).toFixed(2)}
                        </div>
                      </div>
                      <div className="item-actions mt-2">
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => handleRemoveProduct(index)}
                          className="remove-item-btn"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="d-flex justify-content-between mt-4">
                <Button 
                  variant="success" 
                  size="sm" 
                  onClick={handleAddProduct}
                  className="add-product-btn"
                >
                  <i className="fa-solid fa-plus me-2"></i> Add Another Product
                </Button>
                
                <div className="total-row text-end">
                  <h5>
                    <span className="text-muted me-3">Total Amount:</span>
                    <span className="total-amount">${parseFloat(saleData.totalAmount || 0).toFixed(2)}</span>
                  </h5>
                </div>
              </div>
            </div>
            
            <div className="button-row mt-4">
              <Button 
                variant="outline-secondary" 
                onClick={handleCancel}
                className="action-button cancel-button"
              >
                <i className="fa-solid fa-times me-2"></i>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleConfirm}
                disabled={isProcessing}
                className="action-button confirm-button"
              >
                {isProcessing ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check me-2"></i>
                    Confirm & Add Sale
                  </>
                )}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}
      
      {success && (
        <Card className="mb-4 success-card text-center">
          <Card.Body className="py-5">
            <div className="success-icon mb-4">
              <i className="fa-solid fa-check-circle" style={{ fontSize: '72px', color: '#36B37E' }}></i>
            </div>
            <h3 className="mb-3">Sale added successfully!</h3>
            <p className="text-muted mb-4">The sale data has been processed and added to your sales records.</p>
            
            <div className="success-button-row">
              <Button 
                variant="outline-primary" 
                className="success-button"
                onClick={() => {
                  setFile(null);
                  setFilePreview(null);
                  setPdfName(null);
                  setParsedData(null);
                  setExtractedData(null);
                  setSuccess(false);
                }}
              >
                <i className="fa-solid fa-upload me-2"></i>
                Upload Another Receipt
              </Button>
              <Button 
                variant="primary" 
                className="success-button"
                onClick={() => navigate('/sales')}
              >
                <i className="fa-solid fa-list me-2"></i>
                View All Sales
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default UploadSale;