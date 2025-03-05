import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Assistant from './components/Assistant';
import ChatBubble from './components/ChatBubble';
import { useAuth } from './services/AuthContext';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import SaleForm from './pages/SaleForm';
import SalesList from './pages/SalesList';
import EditSale from './pages/EditSale';
import UploadSale from './pages/UploadSale';
import Commission from './pages/Commission';
import CommissionCalculator from './pages/CommissionCalculator';
import CommissionManagement from './pages/CommissionManagement';
import NotFound from './pages/NotFound';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Navbar />
      <Container className="page-container">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/sales" element={
            <ProtectedRoute>
              <SalesList />
            </ProtectedRoute>
          } />
          
          <Route path="/sales/new" element={
            <ProtectedRoute>
              <SaleForm />
            </ProtectedRoute>
          } />
          
          <Route path="/sales/upload" element={
            <ProtectedRoute>
              <UploadSale />
            </ProtectedRoute>
          } />
          
          <Route path="/sales/edit/:id" element={
            <ProtectedRoute>
              <EditSale />
            </ProtectedRoute>
          } />
          
          <Route path="/commission" element={
            <ProtectedRoute>
              <Commission />
            </ProtectedRoute>
          } />
          
          <Route path="/commission/calculator" element={
            <ProtectedRoute>
              <CommissionCalculator />
            </ProtectedRoute>
          } />
          
          <Route path="/commission/management" element={
            <AdminRoute>
              <CommissionManagement />
            </AdminRoute>
          } />
          
          <Route path="/assistant" element={
            <ProtectedRoute>
              <Assistant />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Container>
      
      {/* Floating Chat Bubble - only shown when authenticated */}
      {isAuthenticated && <ChatBubble />}
    </>
  );
}

export default App;