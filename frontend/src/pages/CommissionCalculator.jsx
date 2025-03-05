import React, { useState, useEffect } from 'react';
import { 
  Card, Form, Button, Row, Col, ProgressBar, 
  InputGroup, Alert, Badge, Spinner, Form as BSForm
} from 'react-bootstrap';
import { useAuth } from '../services/AuthContext';
import { useCommissionStore } from '../stores/commission-store';

const CommissionCalculator = () => {
  const { user } = useAuth();
  const { 
    fetchCommissionData,
    getCommission, 
    calculateWhatIfCommission, 
    isLoading, 
    error,
    commissionStructures,
    fetchCommissionStructures,
    selectedStructureId,
    setSelectedStructure
  } = useCommissionStore();
  
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [accessoryRevenue, setAccessoryRevenue] = useState('');
  const [activations30, setActivations30] = useState('');
  const [activations40, setActivations40] = useState('');
  const [activations55, setActivations55] = useState('');
  const [activations60, setActivations60] = useState('');
  const [upgrades, setUpgrades] = useState('');
  const [cp, setCp] = useState('');
  const [apo, setApo] = useState('');
  const [whatIfResults, setWhatIfResults] = useState([]);
  const [selectedStructureLocal, setSelectedStructureLocal] = useState(null);
  
  // Fetch data on component mount
  useEffect(() => {
    if (user?.id) {
      fetchCommissionData(user.id);
      fetchCommissionStructures();
    }
  }, [user]);
  
  // Current commission calculation
  const currentCommission = getCommission();
  
  // Update selected structure when commissionStructures changes
  useEffect(() => {
    if (commissionStructures.length > 0) {
      setSelectedStructureLocal(commissionStructures[0]._id);
      setSelectedStructure(commissionStructures[0]._id);
    }
  }, [commissionStructures]);

  // Handle "What If" calculation
  const handleCalculateWhatIf = () => {
    const results = calculateWhatIfCommission(
      parseFloat(accessoryRevenue) || 0,
      {
        type30: parseInt(activations30) || 0,
        type40: parseInt(activations40) || 0,
        type55: parseInt(activations55) || 0,
        type60: parseInt(activations60) || 0
      },
      parseInt(upgrades) || 0,
      parseInt(cp) || 0,
      parseFloat(apo) || 0,
      selectedStructureLocal // Pass the selected structure ID
    );
    
    setWhatIfResults(results);
  };
  
  // Reset "What If" form
  const resetWhatIf = () => {
    setAccessoryRevenue('');
    setActivations30('');
    setActivations40('');
    setActivations55('');
    setActivations60('');
    setUpgrades('');
    setCp('');
    setApo('');
    setWhatIfResults([]);
  };
  
  // Loading indicator
  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading commission data...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">
        <i className="fa-solid fa-calculator me-2"></i> Commission Calculator
      </h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <h5 className="m-0">Current Commission</h5>
          <div className="d-flex align-items-center">
            <Badge bg="light" text="dark" className="ms-2">
              Tier {currentCommission.tier}
            </Badge>
          </div>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <h2 className="text-success fw-bold mb-4">
                ${currentCommission.totalCommission.toFixed(2)}
              </h2>
              
              <div className="commission-breakdown">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-secondary">Accessory</span>
                  <span className="fw-medium">${currentCommission.accessoryCommission.toFixed(2)}</span>
                </div>
                
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-secondary">Activations</span>
                  <span className="fw-medium">${currentCommission.activations.commission.toFixed(2)}</span>
                </div>
                
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-secondary">Upgrades</span>
                  <span className="fw-medium">${currentCommission.upgrades.commission.toFixed(2)}</span>
                </div>
                
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-secondary">APO $60+</span>
                  <span className="fw-medium">${currentCommission.apo.commission.toFixed(2)}</span>
                </div>
              </div>
            </Col>
            
            <Col md={6}>
              <h6 className="mb-3">Tier Progress</h6>
              
              {currentCommission.tierDetails ? currentCommission.tierDetails.map((tier) => {
                // Calculate progress percentage
                const progress = Math.min(
                  Math.round((currentCommission.accessoryRevenue / tier.accessoryTarget) * 100),
                  100
                );
                
                // Check if this tier is reached
                const isReached = currentCommission.accessoryRevenue >= tier.accessoryTarget;
                
                // Check if this is the current tier
                const isCurrentTier = tier.id === currentCommission.tier;
                
                return (
                  <div key={tier.id} className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <div>
                        <span className="fw-medium">{tier.name}</span>
                        {isCurrentTier && (
                          <Badge bg="primary" className="ms-2">Current</Badge>
                        )}
                      </div>
                      
                      {isReached && (
                        <Badge bg="success">Reached</Badge>
                      )}
                    </div>
                    
                    <ProgressBar 
                      now={progress} 
                      variant={isReached ? "success" : "primary"}
                      className="mb-1"
                    />
                    
                    <div className="d-flex justify-content-between">
                      <small className="text-secondary">
                        ${currentCommission.accessoryRevenue.toFixed(2)}
                      </small>
                      <small className="text-secondary">
                        ${tier.accessoryTarget.toFixed(2)}
                      </small>
                    </div>
                  </div>
                );
              }) : ''}
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      <div className="d-flex justify-content-center mb-4">
        <Button
          variant={showWhatIf ? "outline-primary" : "primary"}
          onClick={() => setShowWhatIf(!showWhatIf)}
          className="d-flex align-items-center"
        >
          <i className={`fa-solid fa-chevron-${showWhatIf ? 'up' : 'down'} me-2`}></i>
          {showWhatIf ? 'Hide "What If" Calculator' : 'Show "What If" Calculator'}
        </Button>
      </div>
      
      {showWhatIf && (
        <Card className="mb-4">
          <Card.Header>
            <h5 className="m-0">
              <i className="fa-solid fa-calculator me-2"></i> 
              "What If" Commission Calculator
            </h5>
            <small className="text-muted">
              Simulate your commission with different sales numbers
            </small>
          </Card.Header>
          <Card.Body>
            <Form>
              <Row className="mb-3">
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Accessory Revenue ($)</Form.Label>
                    <Form.Control
                      type="number"
                      value={accessoryRevenue}
                      onChange={(e) => setAccessoryRevenue(e.target.value)}
                      placeholder="Enter accessory revenue"
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <h6 className="mb-3">Activations</h6>
              <Row className="mb-3">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>$30 Plan</Form.Label>
                    <Form.Control
                      type="number"
                      value={activations30}
                      onChange={(e) => setActivations30(e.target.value)}
                      placeholder="0"
                    />
                  </Form.Group>
                </Col>
                
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>$40 Plan</Form.Label>
                    <Form.Control
                      type="number"
                      value={activations40}
                      onChange={(e) => setActivations40(e.target.value)}
                      placeholder="0"
                    />
                  </Form.Group>
                </Col>
                
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>$55 Plan</Form.Label>
                    <Form.Control
                      type="number"
                      value={activations55}
                      onChange={(e) => setActivations55(e.target.value)}
                      placeholder="0"
                    />
                  </Form.Group>
                </Col>
                
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>$60 Plan</Form.Label>
                    <Form.Control
                      type="number"
                      value={activations60}
                      onChange={(e) => setActivations60(e.target.value)}
                      placeholder="0"
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Upgrades</Form.Label>
                    <Form.Control
                      type="number"
                      value={upgrades}
                      onChange={(e) => setUpgrades(e.target.value)}
                      placeholder="Enter count"
                    />
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>CP</Form.Label>
                    <Form.Control
                      type="number"
                      value={cp}
                      onChange={(e) => setCp(e.target.value)}
                      placeholder="Enter count"
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Form.Group className="mb-4">
                <Form.Label>APO $60+ Revenue</Form.Label>
                <Form.Control
                  type="number"
                  value={apo}
                  onChange={(e) => setApo(e.target.value)}
                  placeholder="Enter APO revenue"
                />
              </Form.Group>
              
              {commissionStructures.length > 0 && (
                <Form.Group className="mb-4">
                  <Form.Label>Commission Structure</Form.Label>
                  <Form.Select
                    value={selectedStructureLocal || ''}
                    onChange={(e) => setSelectedStructureLocal(e.target.value)}
                  >
                    {commissionStructures.map(structure => (
                      <option key={structure._id} value={structure._id}>
                        {structure.name} ({structure.role})
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Select a commission structure to see how your earnings would change under different plans
                  </Form.Text>
                </Form.Group>
              )}
              
              <div className="d-flex gap-3">
                <Button 
                  variant="outline-secondary"
                  onClick={resetWhatIf}
                  className="w-50"
                >
                  Reset
                </Button>
                
                <Button
                  variant="primary"
                  onClick={handleCalculateWhatIf}
                  className="w-50"
                >
                  <i className="fa-solid fa-calculator me-2"></i>
                  Calculate
                </Button>
              </div>
            </Form>
            
            {whatIfResults.length > 0 && (
              <div className="mt-4">
                <h5 className="mb-3">Results</h5>
                
                <Row>
                  {whatIfResults.map((result) => (
                    <Col md={6} key={result.tier} className="mb-3">
                      <Card 
                        className={
                          result.tier === currentCommission.tier 
                            ? "border-primary" 
                            : result.tier > currentCommission.tier 
                              ? "border-success" 
                              : ""
                        }
                      >
                        <Card.Header className="d-flex justify-content-between align-items-center">
                          <h6 className="m-0">Tier {result.tier}</h6>
                          <span className="fw-bold text-success">${result.totalCommission.toFixed(2)}</span>
                        </Card.Header>
                        <Card.Body>
                          <div className="small">
                            <div className="d-flex justify-content-between mb-1">
                              <span className="text-secondary">Accessory</span>
                              <span>${result.accessoryCommission.toFixed(2)}</span>
                            </div>
                            
                            <div className="d-flex justify-content-between mb-1">
                              <span className="text-secondary">Activations</span>
                              <span>${result.activations.commission.toFixed(2)}</span>
                            </div>
                            
                            <div className="d-flex justify-content-between mb-1">
                              <span className="text-secondary">Upgrades</span>
                              <span>${result.upgrades.commission.toFixed(2)}</span>
                            </div>
                            
                            <div className="d-flex justify-content-between mb-1">
                              <span className="text-secondary">CP</span>
                              <span>${result.cp.commission.toFixed(2)}</span>
                            </div>
                            
                            <div className="d-flex justify-content-between mb-1">
                              <span className="text-secondary">APO $60+</span>
                              <span>${result.apo.commission.toFixed(2)}</span>
                            </div>
                          </div>
                          
                          {result.tier > currentCommission.tier && (
                            <div className="bg-light p-2 mt-2 rounded d-flex align-items-center">
                              <i className="fa-solid fa-arrow-trend-up text-success me-2"></i>
                              <small className="text-success fw-medium">
                                Potential increase: ${(result.totalCommission - currentCommission.totalCommission).toFixed(2)}
                              </small>
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default CommissionCalculator;