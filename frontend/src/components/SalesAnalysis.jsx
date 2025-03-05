import React, { useState, useEffect } from 'react';
import { Card, Button, Spinner, Row, Col, Alert } from 'react-bootstrap';
import axios from 'axios';

const SalesAnalysis = ({ userId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [salesData, setSalesData] = useState([]);

  // Fetch sales data when component mounts
  useEffect(() => {
    fetchSalesData();
  }, [userId]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/sales/employee/${userId}`);
      setSalesData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError('Failed to load sales data. Please try again.');
      setLoading(false);
    }
  };

  const generateAnalysis = async () => {
    try {
      setLoading(true);
      setError('');

      // Format the sales data for analysis
      const salesSummary = prepareSalesDataForAnalysis(salesData);
      
      // Send the data to Claude for analysis
      const result = await axios.post('/api/assistant', {
        prompt: `Please analyze my sales performance and provide specific suggestions for improvement. Here's my sales data for the past period: ${JSON.stringify(salesSummary)}. Focus on identifying patterns, strengths, weaknesses, and actionable steps I can take to increase my sales. What products should I focus on? What customer types should I target? What sales techniques could help me?`,
        conversationId: null,
        isAnalysis: true // Special flag for analytics request
      });
      
      setAnalysis(result.data.response);
      setLoading(false);
    } catch (err) {
      console.error('Error generating sales analysis:', err);
      setError('Failed to generate analysis. Please try again.');
      setLoading(false);
    }
  };

  // Helper function to prepare sales data for analysis
  const prepareSalesDataForAnalysis = (sales) => {
    // Calculate high-level metrics
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalCommission = sales.reduce((sum, sale) => sum + sale.commission, 0);
    
    // Calculate product-level metrics
    const productSales = {};
    const productRevenue = {};
    
    // Customer metrics
    const customers = {}; // Track repeat customers
    
    // Time-based metrics
    const salesByDay = {};
    const salesByMonth = {};
    
    // Process each sale
    sales.forEach(sale => {
      // Date processing
      const saleDate = new Date(sale.date);
      const day = saleDate.toLocaleDateString('en-US', { weekday: 'long' });
      const month = saleDate.toLocaleDateString('en-US', { month: 'long' });
      
      // Update day counts
      salesByDay[day] = (salesByDay[day] || 0) + 1;
      salesByMonth[month] = (salesByMonth[month] || 0) + 1;
      
      // Track customer visits
      if (sale.customerName) {
        customers[sale.customerName] = (customers[sale.customerName] || 0) + 1;
      }
      
      // Process products in the sale
      sale.products.forEach(product => {
        // Product count
        productSales[product.name] = (productSales[product.name] || 0) + product.quantity;
        
        // Product revenue
        const revenue = product.price * product.quantity;
        productRevenue[product.name] = (productRevenue[product.name] || 0) + revenue;
      });
    });
    
    // Find top products by sales count
    const topProductsBySales = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    
    // Find top products by revenue
    const topProductsByRevenue = Object.entries(productRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, revenue]) => ({ name, revenue }));
    
    // Find repeat customers
    const repeatCustomers = Object.entries(customers)
      .filter(([_, count]) => count > 1)
      .map(([name, count]) => ({ name, count }));
    
    return {
      totalSales,
      totalRevenue,
      totalCommission,
      averageSaleValue: totalRevenue / totalSales,
      topProductsBySales,
      topProductsByRevenue,
      repeatCustomers,
      salesByDay,
      salesByMonth,
      periodCovered: sales.length > 0 ? {
        start: new Date(Math.min(...sales.map(s => new Date(s.date)))).toLocaleDateString(),
        end: new Date(Math.max(...sales.map(s => new Date(s.date)))).toLocaleDateString()
      } : null
    };
  };

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <i className="fa-solid fa-chart-line me-2"></i> Sales Performance Analysis
        </div>
        <Button 
          variant="outline-primary" 
          size="sm" 
          onClick={generateAnalysis}
          disabled={loading || !salesData.length}
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" /> Analyzing...
            </>
          ) : (
            <>
              <i className="fa-solid fa-wand-magic-sparkles me-1"></i> 
              Generate Analysis
            </>
          )}
        </Button>
      </Card.Header>
      
      <Card.Body>
        {!salesData.length ? (
          <Alert variant="info">
            <i className="fa-solid fa-info-circle me-2"></i>
            You don't have any sales data yet. Start recording sales to unlock performance insights.
          </Alert>
        ) : error ? (
          <Alert variant="danger">
            <i className="fa-solid fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        ) : !analysis ? (
          <div className="text-center py-4">
            <i className="fa-solid fa-chart-bar fa-3x mb-3 text-muted"></i>
            <p>Click the "Generate Analysis" button to get insights on your sales performance.</p>
            <p className="text-muted small">Our AI will analyze your sales patterns and suggest areas for improvement.</p>
          </div>
        ) : (
          <div className="sales-analysis-results">
            <h5 className="mb-3 text-primary">Your Sales Performance Insights</h5>
            <Row>
              <Col xs={12}>
                <div className="sales-analysis-content">
                  {analysis.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}
                </div>
              </Col>
            </Row>
            <div className="mt-3 text-end">
              <Button 
                variant="primary"
                size="sm"
                onClick={() => setAnalysis(null)}
              >
                <i className="fa-solid fa-rotate me-1"></i> Generate New Analysis
              </Button>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default SalesAnalysis;