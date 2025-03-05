import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Row, Col, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { useAuth } from '../services/AuthContext';

const EditSale = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [originalSale, setOriginalSale] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const formik = useFormik({
    initialValues: {
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      phoneNumber: '',
      storeLocation: user?.storeLocation || '',
    },
    validationSchema: Yup.object({
      date: Yup.date().required('Date is required'),
      customerName: Yup.string().required('Customer name is required'),
      phoneNumber: Yup.string().matches(
        /^(\+\d{1,3})?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/,
        'Phone number is not valid'
      ),
      storeLocation: Yup.string().required('Store location is required'),
    }),
    onSubmit: async (values) => {
      if (products.some(p => !p.name || !p.price)) {
        setError('Please complete all product information');
        return;
      }

      try {
        setLoading(true);
        setError('');

        // Calculate totals
        const totalAmount = products.reduce((sum, product) => 
          sum + (product.price * product.quantity), 0);
          
        // Calculate commission based on user's commission rate
        const commissionRate = user?.commissionRate || 10; // Default to 10% if not set
        const commission = (totalAmount * commissionRate) / 100;

        const saleData = {
          ...values,
          employee: user.id,
          products,
          totalAmount,
          commission,
        };

        const response = await axios.put(`/api/sales/${id}`, saleData);
        
        if (response.status === 200) {
          navigate('/sales');
        }
      } catch (err) {
        setError('Failed to update sale. Please try again.');
        console.error('Sale update error:', err);
      } finally {
        setLoading(false);
      }
    },
  });

  // Fetch sale data
  useEffect(() => {
    const fetchSale = async () => {
      try {
        setFetchLoading(true);
        const response = await axios.get(`/api/sales/${id}`);
        const sale = response.data;
        
        // Store original sale data
        setOriginalSale(sale);
        
        // Set products
        setProducts(sale.products || []);
        
        // Set form values
        formik.setValues({
          date: new Date(sale.date).toISOString().split('T')[0],
          customerName: sale.customerName || '',
          phoneNumber: sale.phoneNumber || '',
          storeLocation: sale.storeLocation || user?.storeLocation || '',
        });
        
        setFetchLoading(false);
      } catch (err) {
        console.error('Error fetching sale:', err);
        setError('Failed to fetch sale data. Please try again.');
        setFetchLoading(false);
      }
    };

    if (id) {
      fetchSale();
    }
  }, [id, user?.storeLocation]);

  const handleAddProduct = () => {
    setProducts([...products, { name: '', quantity: 1, price: '', category: 'accessory' }]);
  };

  const handleRemoveProduct = (index) => {
    const updatedProducts = [...products];
    updatedProducts.splice(index, 1);
    setProducts(updatedProducts);
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...products];
    updatedProducts[index][field] = field === 'price' || field === 'quantity' 
      ? parseFloat(value) || '' 
      : value;
    setProducts(updatedProducts);
  };

  // Calculate totals for display
  const totalAmount = products.reduce((sum, product) => 
    sum + ((parseFloat(product.price) || 0) * (parseInt(product.quantity) || 0)), 0);
  
  const commissionRate = user?.commissionRate || 10;
  const estimatedCommission = (totalAmount * commissionRate) / 100;

  if (fetchLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading sale data...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-title">
          <i className="fa-solid fa-pen-to-square me-2"></i> Edit Sale
        </h1>
        <Button variant="outline-secondary" onClick={() => navigate('/sales')}>
          <i className="fa-solid fa-arrow-left me-2"></i> Back to Sales
        </Button>
      </div>
      
      <Card className="mb-4">
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Form onSubmit={formik.handleSubmit}>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Date</Form.Label>
                  <Form.Control
                    type="date"
                    id="date"
                    name="date"
                    value={formik.values.date}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    isInvalid={formik.touched.date && formik.errors.date}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formik.errors.date}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Customer Name</Form.Label>
                  <Form.Control
                    type="text"
                    id="customerName"
                    name="customerName"
                    placeholder="Enter customer name"
                    value={formik.values.customerName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    isInvalid={formik.touched.customerName && formik.errors.customerName}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formik.errors.customerName}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone Number</Form.Label>
                  <Form.Control
                    type="text"
                    id="phoneNumber"
                    name="phoneNumber"
                    placeholder="Enter phone number"
                    value={formik.values.phoneNumber}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    isInvalid={formik.touched.phoneNumber && formik.errors.phoneNumber}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formik.errors.phoneNumber}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Store Location</Form.Label>
              <Form.Control
                type="text"
                id="storeLocation"
                name="storeLocation"
                placeholder="Enter store location"
                value={formik.values.storeLocation}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                isInvalid={formik.touched.storeLocation && formik.errors.storeLocation}
              />
              <Form.Control.Feedback type="invalid">
                {formik.errors.storeLocation}
              </Form.Control.Feedback>
            </Form.Group>
            
            <h3 className="mt-4 mb-3">Products</h3>
            
            {products.map((product, index) => (
              <Card className="mb-3" key={index}>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Product Name</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Enter product name"
                          value={product.name}
                          onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                          required
                        />
                      </Form.Group>
                    </Col>
                    
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Quantity</Form.Label>
                        <Form.Control
                          type="number"
                          placeholder="Quantity"
                          value={product.quantity}
                          onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                          min="1"
                          required
                        />
                      </Form.Group>
                    </Col>
                    
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Price ($)</Form.Label>
                        <Form.Control
                          type="number"
                          placeholder="Price"
                          value={product.price}
                          onChange={(e) => handleProductChange(index, 'price', e.target.value)}
                          step="0.01"
                          min="0"
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Category</Form.Label>
                        <Form.Select
                          value={product.category || 'accessory'}
                          onChange={(e) => handleProductChange(index, 'category', e.target.value)}
                        >
                          <option value="accessory">Accessory</option>
                          <option value="activation">Activation</option>
                          <option value="upgrade">Upgrade</option>
                          <option value="other">Other</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  {products.length > 1 && (
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => handleRemoveProduct(index)}
                      className="mt-2"
                    >
                      <i className="fa-solid fa-trash me-2"></i> Remove Product
                    </Button>
                  )}
                </Card.Body>
              </Card>
            ))}
            
            <Button 
              variant="outline-primary" 
              onClick={handleAddProduct} 
              className="mb-4"
            >
              <i className="fa-solid fa-plus me-2"></i> Add Another Product
            </Button>
            
            <Row className="mt-4">
              <Col md={6}>
                <Card bg="light">
                  <Card.Body>
                    <h4>Sale Summary</h4>
                    <p><strong>Total Products:</strong> {products.length}</p>
                    <p><strong>Total Amount:</strong> ${totalAmount.toFixed(2)}</p>
                    <p><strong>Estimated Commission:</strong> ${estimatedCommission.toFixed(2)}</p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
            
            <div className="d-flex justify-content-end mt-4">
              <Button 
                variant="outline-secondary" 
                className="me-2"
                onClick={() => navigate('/sales')}
              >
                <i className="fa-solid fa-xmark me-2"></i> Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check me-2"></i> Save Changes
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default EditSale;