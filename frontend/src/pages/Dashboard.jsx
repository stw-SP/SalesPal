import React, { useState, useEffect } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';
import { useAuth } from '../services/AuthContext';
import SalesAnalysis from '../components/SalesAnalysis';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalAmount: 0,
    totalCommission: 0,
  });
  const [salesData, setSalesData] = useState({
    labels: [],
    sales: [],
    commission: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Get date range for current month
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        // Format dates for API
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // Fetch commission data
        const commissionResponse = await axios.get(
          `/api/commission/${user.id}?startDate=${startDateStr}&endDate=${endDateStr}`
        );
        
        // Fetch all sales for charts
        const salesResponse = await axios.get(`/api/sales/employee/${user.id}`);
        
        setStats({
          totalSales: commissionResponse.data.totalSales,
          totalAmount: commissionResponse.data.totalAmount,
          totalCommission: commissionResponse.data.totalCommission,
        });

        // Process sales data for charts
        const salesByDate = {};
        salesResponse.data.forEach(sale => {
          const date = new Date(sale.date).toLocaleDateString();
          if (!salesByDate[date]) {
            salesByDate[date] = {
              sales: 0,
              commission: 0,
            };
          }
          salesByDate[date].sales += sale.totalAmount;
          salesByDate[date].commission += sale.commission;
        });

        // Convert to arrays for chart
        const dates = Object.keys(salesByDate).sort((a, b) => new Date(a) - new Date(b));
        const salesValues = dates.map(date => salesByDate[date].sales);
        const commissionValues = dates.map(date => salesByDate[date].commission);

        setSalesData({
          labels: dates,
          sales: salesValues,
          commission: commissionValues,
        });

        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchData();
    }
  }, [user]);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  // Chart configurations
  const salesChartData = {
    labels: salesData.labels,
    datasets: [
      {
        label: 'Sales Amount ($)',
        data: salesData.sales,
        borderColor: 'rgb(25, 118, 210)',
        backgroundColor: 'rgba(25, 118, 210, 0.5)',
        tension: 0.3,
      },
    ],
  };

  const commissionChartData = {
    labels: salesData.labels,
    datasets: [
      {
        label: 'Commission Amount ($)',
        data: salesData.commission,
        backgroundColor: 'rgba(76, 175, 80, 0.7)',
      },
    ],
  };

  return (
    <div>
      <h1 className="page-title">
        <i className="fa-solid fa-chart-line me-2"></i> Dashboard
      </h1>
      
      <Row className="dashboard-row">
        <Col md={4} className="mb-4">
          <div className="stats-card">
            <h3 className="stats-card-title">Total Sales</h3>
            <div className="stats-card-value">{stats.totalSales}</div>
            <div className="text-muted">Transactions this month</div>
            <div className="stats-icon">
              <i className="fa-solid fa-receipt"></i>
            </div>
          </div>
        </Col>
        <Col md={4} className="mb-4">
          <div className="stats-card blue">
            <h3 className="stats-card-title">Total Revenue</h3>
            <div className="stats-card-value">${stats.totalAmount.toFixed(2)}</div>
            <div className="text-muted">Revenue this month</div>
            <div className="stats-icon">
              <i className="fa-solid fa-dollar-sign"></i>
            </div>
          </div>
        </Col>
        <Col md={4} className="mb-4">
          <div className="stats-card yellow">
            <h3 className="stats-card-title">Total Commission</h3>
            <div className="stats-card-value">${stats.totalCommission.toFixed(2)}</div>
            <div className="text-muted">Commission earned this month</div>
            <div className="stats-icon">
              <i className="fa-solid fa-hand-holding-dollar"></i>
            </div>
          </div>
        </Col>
      </Row>
      
      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>Sales Trend</Card.Header>
            <Card.Body>
              <div className="chart-container">
                <Line 
                  data={salesChartData} 
                  options={{ 
                    maintainAspectRatio: true,
                    responsive: true,
                    height: 300
                  }} 
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>Commission Earned</Card.Header>
            <Card.Body>
              <div className="chart-container">
                <Bar 
                  data={commissionChartData} 
                  options={{ 
                    maintainAspectRatio: true,
                    responsive: true,
                    height: 300
                  }} 
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col>
          <SalesAnalysis userId={user.id} />
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;