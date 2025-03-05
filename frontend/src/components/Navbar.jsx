import React from 'react';
import { Navbar as BootstrapNavbar, Nav, Container, Button, Dropdown } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

const Navbar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <BootstrapNavbar expand="lg" className="navbar">
      <Container>
        <BootstrapNavbar.Brand as={Link} to="/">
          <div className="d-flex align-items-center">
            <i className="fa-solid fa-signal me-2" style={{ color: 'white', fontSize: '1.2rem' }}></i>
            <span className="navbar-brand">Cricket SalesPal</span>
          </div>
        </BootstrapNavbar.Brand>
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" className="nav-toggle">
          <i className="fa-solid fa-bars" style={{ color: 'white' }}></i>
        </BootstrapNavbar.Toggle>
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="mx-auto">
            {isAuthenticated && (
              <>
                <Nav.Link 
                  as={Link} 
                  to="/dashboard" 
                  className={location.pathname === '/dashboard' ? 'active-nav-link' : ''}
                >
                  <i className="fa-solid fa-chart-line me-1"></i> Dashboard
                </Nav.Link>
                
                <Dropdown as={Nav.Item} className="sales-dropdown">
                  <Dropdown.Toggle 
                    as={Nav.Link} 
                    className={location.pathname.includes('/sales') ? 'active-nav-link' : ''}
                  >
                    <i className="fa-solid fa-receipt me-1"></i> Sales
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="dropdown-menu">
                    <Dropdown.Item as={Link} to="/sales">View All Sales</Dropdown.Item>
                    <Dropdown.Item as={Link} to="/sales/new">New Manual Sale</Dropdown.Item>
                    <Dropdown.Item as={Link} to="/sales/upload">Scan Receipt</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
                
                <Nav.Link 
                  as={Link} 
                  to="/commission" 
                  className={location.pathname === '/commission' ? 'active-nav-link' : ''}
                >
                  <i className="fa-solid fa-money-bill-wave me-1"></i> Commissions
                </Nav.Link>
                
                <Nav.Link 
                  as={Link} 
                  to="/assistant" 
                  className={location.pathname === '/assistant' ? 'active-nav-link' : ''}
                >
                  <i className="fa-solid fa-headset me-1"></i> Assistant
                </Nav.Link>
              </>
            )}
          </Nav>
          <Nav>
            {isAuthenticated ? (
              <div className="d-flex align-items-center">
                <Button 
                  variant="link" 
                  className="user-menu-button d-flex align-items-center text-white me-2"
                  onClick={handleLogout}
                >
                  <div className="user-avatar me-2">
                    <span>{user?.name?.charAt(0) || 'U'}</span>
                  </div>
                  <span className="d-none d-md-inline">{user?.name || 'User'}</span>
                  <i className="fa-solid fa-sign-out-alt ms-2"></i>
                </Button>
              </div>
            ) : (
              <>
                <Nav.Link as={Link} to="/login" className="auth-link">
                  <i className="fa-solid fa-sign-in-alt me-1"></i> Login
                </Nav.Link>
                <Nav.Link as={Link} to="/register" className="auth-link ms-3">
                  <i className="fa-solid fa-user-plus me-1"></i> Register
                </Nav.Link>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;