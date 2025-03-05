import React, { useState } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../services/AuthContext';

const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      email: 'admin@salespal.com', // Pre-fill with admin email
      password: 'demo123', // Pre-fill with password
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      password: Yup.string()
        .required('Password is required'),
    }),
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setError('');
        
        console.log('Attempting login with:', values.email, values.password);
        
        // Add debugging to see the API URL
        console.log('API URL:', `${window.location.protocol}//${window.location.hostname}:5001/api/auth/login`);
        
        const result = await login(values.email, values.password);
        console.log('Login result:', result);
        
        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.message || 'Login failed');
        }
      } catch (err) {
        setError(`Login error: ${err.message || 'Unknown error'}`);
        console.error('Login error:', err);
        
        // Show more detailed error information
        if (err.response) {
          console.log('Response data:', err.response.data);
          console.log('Response status:', err.response.status);
          setError(`Server error: ${err.response.data?.message || err.response.statusText || 'Unknown server error'}`);
        } else if (err.request) {
          console.log('No response received:', err.request);
          setError('No response from server. Please check your connection.');
        }
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 'calc(100vh - 150px)' }}>
      <Card style={{ width: '400px' }}>
        <Card.Body>
          <h2 className="text-center mb-4">Login to SalesPal</h2>
          
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Form onSubmit={formik.handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                isInvalid={formik.touched.email && formik.errors.email}
              />
              <Form.Control.Feedback type="invalid">
                {formik.errors.email}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                isInvalid={formik.touched.password && formik.errors.password}
              />
              <Form.Control.Feedback type="invalid">
                {formik.errors.password}
              </Form.Control.Feedback>
            </Form.Group>

            <Button 
              variant="primary" 
              type="submit" 
              className="w-100 my-3"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </Form>
          
          <div className="text-center mt-3">
            <p>
              Don't have an account? <Link to="/register">Register</Link>
            </p>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Login;