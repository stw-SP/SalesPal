import React, { useState, useEffect } from 'react';
import { 
  Card, Form, Button, Row, Col, Table, Alert, 
  Spinner, Badge 
} from 'react-bootstrap';
import { Bar, Pie } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAuth } from '../services/AuthContext';
import { useCommissionStore } from '../stores/commission-store';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Commission = () => {
  const { user } = useAuth();
  const { 
    commissionData, 
    sales,
    isLoading, 
    error, 
    dateRange,
    setDateRange,
    fetchCommissionData 
  } = useCommissionStore();
  
  const [salesByProduct, setSalesByProduct] = useState({});
  const [salesByDay, setSalesByDay] = useState({});
  
  useEffect(() => {
    if (user?.id) {
      // Convert to local state format for date picker
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      
      // Fetch data on mount
      fetchCommissionData(user.id);
    }
  }, [user]);
  
  // Process sales data when it changes
  useEffect(() => {
    if (sales && sales.length > 0) {
      // Process sales by product
      const productSales = {};
      
      sales.forEach(sale => {
        if (!sale.products) return;
        
        sale.products.forEach(product => {
          const productName = product.name;
          if (!productSales[productName]) {
            productSales[productName] = {
              quantity: 0,
              revenue: 0,
            };
          }
          productSales[productName].quantity += parseInt(product.quantity) || 1;
          productSales[productName].revenue += 
            (parseFloat(product.price) || 0) * (parseInt(product.quantity) || 1);
        });
      });
      
      setSalesByProduct(productSales);
      
      // Process sales by day
      const salesByDayMap = {};
      
      sales.forEach(sale => {
        const dateKey = new Date(sale.date).toLocaleDateString();
        
        if (!salesByDayMap[dateKey]) {
          salesByDayMap[dateKey] = {
            sales: 0,
            revenue: 0,
            commission: 0,
          };
        }
        
        salesByDayMap[dateKey].sales += 1;
        salesByDayMap[dateKey].revenue += sale.totalAmount;
        salesByDayMap[dateKey].commission += sale.commission || 0;
      });
      
      setSalesByDay(salesByDayMap);
    }
  }, [sales]);

  const handleDateChange = (field, value) => {
    const newStartDate = field === 'startDate' ? new Date(value) : new Date(dateRange.startDate);
    const newEndDate = field === 'endDate' ? new Date(value) : new Date(dateRange.endDate);
    
    setDateRange(newStartDate, newEndDate);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (user?.id) {
      fetchCommissionData(user.id);
    }
  };

  // Prepare chart data
  const productChartData = {
    labels: Object.keys(salesByProduct),
    datasets: [
      {
        label: 'Revenue by Product',
        data: Object.values(salesByProduct).map(product => product.revenue),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(199, 199, 199, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const dailySalesChartData = {
    labels: Object.keys(salesByDay).sort((a, b) => new Date(a) - new Date(b)),
    datasets: [
      {
        label: 'Revenue',
        data: Object.keys(salesByDay)
          .sort((a, b) => new Date(a) - new Date(b))
          .map(day => salesByDay[day].revenue),
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
      },
      {
        label: 'Commission',
        data: Object.keys(salesByDay)
          .sort((a, b) => new Date(a) - new Date(b))
          .map(day => salesByDay[day].commission),
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
      },
    ],
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-title m-0">
          <i className="fa-solid fa-money-bill-wave me-2"></i> Commission Analytics
        </h1>
        <div>
          {user?.role === 'admin' && (
            <Button as={Link} to="/commission/management" className="me-2" variant="success">
              <i className="fa-solid fa-gear me-2"></i> Manage Commission Structure
            </Button>
          )}
          <Button as={Link} to="/commission/calculator" variant="primary">
            <i className="fa-solid fa-calculator me-2"></i> Commission Calculator
          </Button>
        </div>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Card className="mb-4">
        <Card.Header>
          <i className="fa-solid fa-calendar me-2"></i> Select Date Range
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={5}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={dateRange.startDate instanceof Date 
                      ? dateRange.startDate.toISOString().split('T')[0] 
                      : new Date(dateRange.startDate).toISOString().split('T')[0]
                    }
                    onChange={(e) => handleDateChange('startDate', e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col md={5}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={dateRange.endDate instanceof Date 
                      ? dateRange.endDate.toISOString().split('T')[0] 
                      : new Date(dateRange.endDate).toISOString().split('T')[0]
                    }
                    onChange={(e) => handleDateChange('endDate', e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col md={2} className="d-flex align-items-end">
                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 mb-3"
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Calculate'}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
      
      {isLoading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Calculating commission...</p>
        </div>
      ) : commissionData ? (
        <>
          <Row className="dashboard-row">
            <Col md={4} className="mb-4">
              <div className="stats-card">
                <h3 className="stats-card-title">Total Sales</h3>
                <div className="stats-card-value">{commissionData.totalSales}</div>
                <div className="text-muted">Transactions</div>
                <div className="stats-icon">
                  <i className="fa-solid fa-receipt"></i>
                </div>
              </div>
            </Col>
            
            <Col md={4} className="mb-4">
              <div className="stats-card blue">
                <h3 className="stats-card-title">Total Revenue</h3>
                <div className="stats-card-value">${commissionData.totalAmount.toFixed(2)}</div>
                <div className="text-muted">Revenue for selected period</div>
                <div className="stats-icon">
                  <i className="fa-solid fa-dollar-sign"></i>
                </div>
              </div>
            </Col>
            
            <Col md={4} className="mb-4">
              <div className="stats-card yellow">
                <h3 className="stats-card-title">Total Commission</h3>
                <div className="stats-card-value">${commissionData.totalCommission.toFixed(2)}</div>
                <div className="text-muted">Commission earned for selected period</div>
                <div className="stats-icon">
                  <i className="fa-solid fa-hand-holding-dollar"></i>
                </div>
              </div>
            </Col>
          </Row>
          
          <Row className="mb-4">
            <Col md={6}>
              <Card className="mb-4">
                <Card.Header>
                  <i className="fa-solid fa-chart-pie me-2"></i> Revenue by Product
                </Card.Header>
                <Card.Body>
                  <div className="chart-container">
                    {Object.keys(salesByProduct).length > 0 ? (
                      <Pie 
                        data={productChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: true,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                          },
                        }}
                      />
                    ) : (
                      <p className="text-center">No product data available for this period</p>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6}>
              <Card className="mb-4">
                <Card.Header>
                  <i className="fa-solid fa-chart-bar me-2"></i> Daily Sales and Commission
                </Card.Header>
                <Card.Body>
                  <div className="chart-container">
                    {Object.keys(salesByDay).length > 0 ? (
                      <Bar 
                        data={dailySalesChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: true,
                          plugins: {
                            legend: {
                              position: 'top',
                            },
                          },
                        }}
                      />
                    ) : (
                      <p className="text-center">No daily data available for this period</p>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Card>
            <Card.Header>
              <i className="fa-solid fa-list-check me-2"></i> Product Performance
            </Card.Header>
            <Card.Body>
              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity Sold</th>
                    <th>Revenue</th>
                    <th>% of Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(salesByProduct)
                    .sort(([, a], [, b]) => b.revenue - a.revenue)
                    .map(([productName, data]) => (
                      <tr key={productName}>
                        <td>{productName}</td>
                        <td>{data.quantity}</td>
                        <td>${data.revenue.toFixed(2)}</td>
                        <td>
                          <Badge bg="info">
                            {((data.revenue / commissionData.totalAmount) * 100).toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </>
      ) : (
        <div className="text-center py-5">
          <p>Select a date range and click Calculate to view your commission details.</p>
        </div>
      )}
    </div>
  );
};

export default Commission;