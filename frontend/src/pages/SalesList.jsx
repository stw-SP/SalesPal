import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, Form, Row, Col, 
  Pagination, Badge, Spinner, Alert,
  Modal
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../services/AuthContext';

const SalesList = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState({ startDate: '', endDate: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');
  const { user } = useAuth();
  
  const salesPerPage = 10;
  
  useEffect(() => {
    const fetchSales = async () => {
      try {
        setLoading(true);
        
        // Get date range for current month
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        // Format dates for API
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // Update filter date state
        setFilterDate({
          startDate: startDateStr,
          endDate: endDateStr
        });
        
        // Get sales data for the current month by default
        const response = await axios.get(
          `/api/sales/employee/${user.id}?startDate=${startDateStr}&endDate=${endDateStr}`
        );
        
        setSales(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching sales:', err);
        setError('Failed to load sales data');
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchSales();
    }
  }, [user]);

  // This useEffect is now handled in the main data fetching useEffect

  // Filter sales based on search and date
  const filteredSales = sales.filter(sale => {
    const matchesSearch = searchTerm === '' || 
      sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.phoneNumber && sale.phoneNumber.includes(searchTerm));
      
    const matchesDateFilter = 
      (!filterDate.startDate || new Date(sale.date) >= new Date(filterDate.startDate)) &&
      (!filterDate.endDate || new Date(sale.date) <= new Date(filterDate.endDate));
      
    return matchesSearch && matchesDateFilter;
  });

  // Sort sales by date (newest first)
  const sortedSales = [...filteredSales].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );
  
  // Pagination
  const indexOfLastSale = currentPage * salesPerPage;
  const indexOfFirstSale = indexOfLastSale - salesPerPage;
  const currentSales = sortedSales.slice(indexOfFirstSale, indexOfLastSale);
  const totalPages = Math.ceil(sortedSales.length / salesPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleDateFilterChange = (field, value) => {
    setFilterDate({
      ...filterDate,
      [field]: value,
    });
    setCurrentPage(1); // Reset to first page when changing filters
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    
    // Reset date filter to current month instead of clearing completely
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setFilterDate({
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0]
    });
    
    setCurrentPage(1);
  };

  // Delete sale functions
  const handleDeleteSale = (saleId) => {
    const sale = sales.find(s => s._id === saleId);
    setSaleToDelete(sale);
    setShowDeleteModal(true);
    setDeleteError('');
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;
    
    setDeleteLoading(true);
    setDeleteError('');
    
    try {
      await axios.delete(`/api/sales/${saleToDelete._id}`);
      
      // Remove the deleted sale from the state
      setSales(prevSales => prevSales.filter(sale => sale._id !== saleToDelete._id));
      
      // Show success message
      setDeleteSuccess(`Sale for ${saleToDelete.customerName} deleted successfully`);
      
      // Close the modal
      setShowDeleteModal(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setDeleteSuccess('');
      }, 3000);
      
    } catch (err) {
      console.error('Error deleting sale:', err);
      setDeleteError(err.response?.data?.message || 'Failed to delete sale');
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDeleteSale = () => {
    setShowDeleteModal(false);
    setSaleToDelete(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading sales data...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-title">
          <i className="fa-solid fa-receipt me-2"></i> Sales History
        </h1>
        <div>
          <Button as={Link} to="/sales/new" variant="primary" className="me-2">
            <i className="fa-solid fa-plus me-2"></i> New Sale
          </Button>
          <Button as={Link} to="/sales/upload" variant="outline-primary">
            <i className="fa-solid fa-upload me-2"></i> Upload Receipt
          </Button>
        </div>
      </div>
      
      {deleteSuccess && (
        <Alert variant="success" dismissible onClose={() => setDeleteSuccess('')}>
          <i className="fa-solid fa-check-circle me-2"></i> {deleteSuccess}
        </Alert>
      )}
      
      <Card className="mb-4">
        <Card.Header>
          <i className="fa-solid fa-filter me-2"></i> Filter Sales
        </Card.Header>
        <Card.Body>
          <Row className="mb-3">
            <Col md={4}>
              <Form.Group>
                <Form.Control
                  type="text"
                  placeholder="Search by customer name or phone"
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </Form.Group>
            </Col>
            
            <Col md={3}>
              <Form.Group>
                <Form.Control
                  type="date"
                  placeholder="Start Date"
                  value={filterDate.startDate}
                  onChange={(e) => handleDateFilterChange('startDate', e.target.value)}
                />
              </Form.Group>
            </Col>
            
            <Col md={3}>
              <Form.Group>
                <Form.Control
                  type="date"
                  placeholder="End Date"
                  value={filterDate.endDate}
                  onChange={(e) => handleDateFilterChange('endDate', e.target.value)}
                />
              </Form.Group>
            </Col>
            
            <Col md={2}>
              <Button 
                variant="outline-secondary" 
                onClick={handleClearFilters}
                className="w-100"
              >
                Clear Filters
              </Button>
            </Col>
          </Row>
          
          {filteredSales.length === 0 ? (
            <div className="text-center py-4">
              <p className="mb-0">No sales found matching your criteria.</p>
            </div>
          ) : (
            <>
              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Products</th>
                    <th>Total Amount</th>
                    <th>Commission</th>
                    <th>Store</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSales.map((sale) => (
                    <tr key={sale._id}>
                      <td>{formatDate(sale.date)}</td>
                      <td>
                        <div>{sale.customerName}</div>
                        {sale.phoneNumber && (
                          <small className="text-muted">{sale.phoneNumber}</small>
                        )}
                      </td>
                      <td>
                        {sale.products.map((product, idx) => (
                          <div key={idx} className="mb-1">
                            <Badge bg="light" text="dark" className="me-1">
                              {product.quantity}x
                            </Badge>
                            {product.name}
                            {product.plan && (
                              <Badge bg="info" className="ms-1">{product.plan}</Badge>
                            )}
                          </div>
                        ))}
                      </td>
                      <td>${sale.totalAmount.toFixed(2)}</td>
                      <td>${sale.commission.toFixed(2)}</td>
                      <td>{sale.storeLocation}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Link to={`/sales/edit/${sale._id}`} className="btn btn-sm btn-outline-primary">
                            <i className="fa-solid fa-pen-to-square"></i>
                          </Link>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleDeleteSale(sale._id)}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              
              {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <Pagination>
                    <Pagination.First 
                      onClick={() => handlePageChange(1)} 
                      disabled={currentPage === 1}
                    />
                    <Pagination.Prev 
                      onClick={() => handlePageChange(currentPage - 1)} 
                      disabled={currentPage === 1}
                    />
                    
                    {[...Array(totalPages)].map((_, idx) => {
                      const pageNumber = idx + 1;
                      // Show current page, and up to 2 pages before and after
                      if (
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)
                      ) {
                        return (
                          <Pagination.Item
                            key={pageNumber}
                            active={pageNumber === currentPage}
                            onClick={() => handlePageChange(pageNumber)}
                          >
                            {pageNumber}
                          </Pagination.Item>
                        );
                      } else if (
                        (pageNumber === currentPage - 3 && currentPage > 3) ||
                        (pageNumber === currentPage + 3 && currentPage < totalPages - 2)
                      ) {
                        return <Pagination.Ellipsis key={pageNumber} />;
                      }
                      return null;
                    })}
                    
                    <Pagination.Next 
                      onClick={() => handlePageChange(currentPage + 1)} 
                      disabled={currentPage === totalPages}
                    />
                    <Pagination.Last 
                      onClick={() => handlePageChange(totalPages)} 
                      disabled={currentPage === totalPages}
                    />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
      
      <Card>
        <Card.Header>
          <i className="fa-solid fa-chart-pie me-2"></i> Sales Summary
        </Card.Header>
        <Card.Body>
          <Row className="dashboard-row">
            <Col md={4} className="mb-4">
              <div className="stats-card">
                <h3 className="stats-card-title">Total Sales</h3>
                <div className="stats-card-value">{filteredSales.length}</div>
                <div className="text-muted">Transactions in filtered results</div>
                <div className="stats-icon">
                  <i className="fa-solid fa-tag"></i>
                </div>
              </div>
            </Col>
            <Col md={4} className="mb-4">
              <div className="stats-card blue">
                <h3 className="stats-card-title">Total Revenue</h3>
                <div className="stats-card-value">
                  ${filteredSales
                    .reduce((sum, sale) => sum + sale.totalAmount, 0)
                    .toFixed(2)}
                </div>
                <div className="text-muted">Revenue from filtered results</div>
                <div className="stats-icon">
                  <i className="fa-solid fa-dollar-sign"></i>
                </div>
              </div>
            </Col>
            <Col md={4} className="mb-4">
              <div className="stats-card yellow">
                <h3 className="stats-card-title">Total Commission</h3>
                <div className="stats-card-value">
                  ${filteredSales
                    .reduce((sum, sale) => sum + sale.commission, 0)
                    .toFixed(2)}
                </div>
                <div className="text-muted">Commission earned from filtered results</div>
                <div className="stats-icon">
                  <i className="fa-solid fa-hand-holding-dollar"></i>
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={cancelDeleteSale} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteError && (
            <Alert variant="danger" className="mb-3">
              <i className="fa-solid fa-triangle-exclamation me-2"></i> {deleteError}
            </Alert>
          )}
          
          <p>Are you sure you want to delete this sale?</p>
          
          {saleToDelete && (
            <div className="mb-3 p-3 border rounded bg-light">
              <p className="mb-1"><strong>Customer:</strong> {saleToDelete.customerName}</p>
              <p className="mb-1"><strong>Date:</strong> {formatDate(saleToDelete.date)}</p>
              <p className="mb-1"><strong>Amount:</strong> ${saleToDelete.totalAmount.toFixed(2)}</p>
              <p className="mb-0"><strong>Products:</strong> {saleToDelete.products.length}</p>
            </div>
          )}
          
          <p className="text-danger mb-0">
            <i className="fa-solid fa-exclamation-triangle me-2"></i>
            This action cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={cancelDeleteSale}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmDeleteSale}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Deleting...
              </>
            ) : (
              <>
                <i className="fa-solid fa-trash-alt me-2"></i>
                Delete Sale
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SalesList;