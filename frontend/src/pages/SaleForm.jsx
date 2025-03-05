import React, { useState } from 'react';
import { Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { useAuth } from '../services/AuthContext';

const SaleForm = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([
    { name: '', quantity: 1, price: '', plan: '', accessories: [] }
  ]);
  const { user } = useAuth();
  const navigate = useNavigate();

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

        const response = await axios.post('/api/sales', saleData);
        
        if (response.status === 201) {
          navigate('/sales');
        }
      } catch (err) {
        setError('Failed to create sale. Please try again.');
        console.error('Sale creation error:', err);
      } finally {
        setLoading(false);
      }
    },
  });

  const handleAddProduct = () => {
    setProducts([...products, { name: '', quantity: 1, price: '', plan: '', accessories: [] }]);
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

  const handleAccessoryChange = (productIndex, accessory, isChecked) => {
    const updatedProducts = [...products];
    const currentAccessories = updatedProducts[productIndex].accessories || [];
    
    if (isChecked) {
      updatedProducts[productIndex].accessories = [...currentAccessories, accessory];
    } else {
      updatedProducts[productIndex].accessories = currentAccessories.filter(a => a !== accessory);
    }
    
    setProducts(updatedProducts);
  };

  // Calculate totals for display
  const totalAmount = products.reduce((sum, product) => 
    sum + ((parseFloat(product.price) || 0) * (parseInt(product.quantity) || 0)), 0);
  
  const commissionRate = user?.commissionRate || 10;
  const estimatedCommission = (totalAmount * commissionRate) / 100;

  return (
    <div>
      <h1 className="mb-4">New Sale</h1>
      
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
                        <Form.Label>Plan</Form.Label>
                        <Form.Select
                          value={product.plan}
                          onChange={(e) => handleProductChange(index, 'plan', e.target.value)}
                        >
                          <option value="">Select a plan (optional)</option>
                          <option value="Basic">Basic</option>
                          <option value="Standard">Standard</option>
                          <option value="Premium">Premium</option>
                          <option value="Unlimited">Unlimited</option>
                          <option value="Family">Family</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Accessories</Form.Label>
                        <div>
                          {['Case', 'Screen Protector', 'Charger', 'Headphones'].map((acc) => (
                            <Form.Check
                              key={acc}
                              type="checkbox"
                              id={`acc-${index}-${acc}`}
                              label={acc}
                              inline
                              checked={product.accessories?.includes(acc) || false}
                              onChange={(e) => handleAccessoryChange(index, acc, e.target.checked)}
                            />
                          ))}
                        </div>
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
                      Remove Product
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
              Add Another Product
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
                variant="secondary" 
                className="me-2"
                onClick={() => navigate('/sales')}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Sale'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default SaleForm;