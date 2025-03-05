import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Form, Button, 
  Table, Alert, Tabs, Tab, Modal, Spinner, Badge,
  ListGroup
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useCommissionStore } from '../stores/commission-store';

const CommissionManagement = () => {
  const navigate = useNavigate();
  const { 
    commissionStructures, 
    selectedStructureId,
    fetchCommissionStructures,
    saveCommissionStructure,
    deleteCommissionStructure,
    setSelectedStructure,
    isLoading,
    error
  } = useCommissionStore();
  
  // Local state
  const [activeStructure, setActiveStructure] = useState(null);
  const [activeTier, setActiveTier] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  const [showTierModal, setShowTierModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [structureToDelete, setStructureToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('tiers'); // 'tiers' or 'events'
  const [localError, setLocalError] = useState('');
  
  // Load all commission structures on mount
  useEffect(() => {
    fetchCommissionStructures();
  }, []);
  
  // When structures are loaded or selection changes, update active structure
  useEffect(() => {
    if (commissionStructures.length > 0) {
      // If we have a selected ID, use that structure
      if (selectedStructureId) {
        const selected = commissionStructures.find(s => s._id === selectedStructureId);
        if (selected) {
          setActiveStructure({...selected});
          return;
        }
      }
      
      // Otherwise use the first one
      setActiveStructure({...commissionStructures[0]});
      setSelectedStructure(commissionStructures[0]._id);
    }
  }, [commissionStructures, selectedStructureId]);
  
  // Function to handle structure selection
  const handleStructureSelect = (structureId) => {
    const selected = commissionStructures.find(s => s._id === structureId);
    if (selected) {
      setActiveStructure({...selected});
      setSelectedStructure(structureId);
    }
  };
  
  // Function to handle creating a new structure
  const handleCreateStructure = () => {
    const newStructure = {
      name: 'New Commission Structure',
      role: 'employee',
      tiers: [
        {
          id: 1,
          name: 'Tier 1',
          accessoryTarget: 500,
          accessoryRate: 0.08,
          activationRates: {
            type30: 10,
            type40: 15,
            type55: 20,
            type60: 25
          },
          upgradeRate: 10,
          cpRate: 15,
          apoRate: 0.10
        }
      ],
      events: [
        {
          id: Date.now().toString(),
          name: 'New Customer Activation',
          description: 'Commission for activating a new customer',
          active: true,
          category: 'activation',
          value: 10,
          type: 'flat'
        }
      ]
    };
    
    setActiveStructure(newStructure);
    setSelectedStructure(null);
  };
  
  // Function to handle structure changes
  const handleStructureChange = (field, value) => {
    setActiveStructure({
      ...activeStructure,
      [field]: value
    });
  };
  
  // Function to handle editing a tier
  const handleEditTier = (tier) => {
    setActiveTier({...tier});
    setShowTierModal(true);
  };
  
  // Function to add a new tier
  const handleAddTier = () => {
    const maxId = activeStructure.tiers.reduce(
      (max, tier) => Math.max(max, tier.id), 0
    );
    
    setActiveTier({
      id: maxId + 1,
      name: `Tier ${maxId + 1}`,
      accessoryTarget: 500,
      accessoryRate: 0.08,
      activationRates: {
        type30: 10,
        type40: 15,
        type55: 20,
        type60: 25
      },
      upgradeRate: 10,
      cpRate: 15,
      apoRate: 0.10
    });
    
    setShowTierModal(true);
  };
  
  // Function to save a tier
  const handleSaveTier = () => {
    if (!activeTier) return;
    
    const tierIndex = activeStructure.tiers.findIndex(t => t.id === activeTier.id);
    const updatedTiers = [...activeStructure.tiers];
    
    if (tierIndex >= 0) {
      // Update existing tier
      updatedTiers[tierIndex] = activeTier;
    } else {
      // Add new tier
      updatedTiers.push(activeTier);
    }
    
    setActiveStructure({
      ...activeStructure,
      tiers: updatedTiers
    });
    
    setShowTierModal(false);
  };
  
  // Function to handle tier changes
  const handleTierChange = (field, value) => {
    let parsedValue = value;
    
    // Handle numeric fields
    if (field === 'accessoryTarget' || 
        field === 'upgradeRate' || 
        field === 'cpRate') {
      parsedValue = parseFloat(value);
    } else if (field === 'accessoryRate' || field === 'apoRate') {
      parsedValue = parseFloat(value) / 100; // Convert percentage to decimal
    }
    
    setActiveTier({
      ...activeTier,
      [field]: parsedValue
    });
  };
  
  // Function to handle activation rate changes
  const handleActivationRateChange = (type, value) => {
    setActiveTier({
      ...activeTier,
      activationRates: {
        ...activeTier.activationRates,
        [type]: parseFloat(value)
      }
    });
  };
  
  // Function to delete a tier
  const handleDeleteTier = (tierId) => {
    if (activeStructure.tiers.length <= 1) {
      setLocalError('Commission structure must have at least one tier');
      return;
    }
    
    const updatedTiers = activeStructure.tiers.filter(t => t.id !== tierId);
    
    setActiveStructure({
      ...activeStructure,
      tiers: updatedTiers
    });
  };
  
  // Function to handle adding a new event
  const handleAddEvent = () => {
    const newEvent = {
      id: Date.now().toString(),
      name: 'New Commission Event',
      description: 'Description of the new event',
      active: true,
      category: 'other',
      value: 10,
      type: 'flat'
    };
    
    setActiveEvent(newEvent);
    setShowEventModal(true);
  };
  
  // Function to handle editing an event
  const handleEditEvent = (event) => {
    setActiveEvent({...event});
    setShowEventModal(true);
  };
  
  // Function to save an event
  const handleSaveEvent = () => {
    if (!activeEvent) return;
    
    const eventIndex = activeStructure.events.findIndex(e => e.id === activeEvent.id);
    const updatedEvents = [...(activeStructure.events || [])];
    
    if (eventIndex >= 0) {
      // Update existing event
      updatedEvents[eventIndex] = activeEvent;
    } else {
      // Add new event
      updatedEvents.push(activeEvent);
    }
    
    setActiveStructure({
      ...activeStructure,
      events: updatedEvents
    });
    
    setShowEventModal(false);
  };
  
  // Function to handle event changes
  const handleEventChange = (field, value) => {
    let parsedValue = value;
    
    // Handle numeric fields
    if (field === 'value' && activeEvent.type === 'percentage') {
      // Convert percentage to decimal
      if (value > 1) {
        parsedValue = parseFloat(value) / 100;
      } else {
        parsedValue = parseFloat(value);
      }
    } else if (field === 'value' && activeEvent.type === 'flat') {
      parsedValue = parseFloat(value);
    } else if (field === 'active') {
      parsedValue = value === 'true' || value === true;
    }
    
    setActiveEvent({
      ...activeEvent,
      [field]: parsedValue
    });
  };
  
  // Function to delete an event
  const handleDeleteEvent = (eventId) => {
    if (!activeStructure.events || activeStructure.events.length <= 1) {
      setLocalError('Commission structure must have at least one event');
      return;
    }
    
    const updatedEvents = activeStructure.events.filter(e => e.id !== eventId);
    
    setActiveStructure({
      ...activeStructure,
      events: updatedEvents
    });
  };
  
  // Function to toggle event active status
  const handleToggleEventActive = (eventId) => {
    const eventIndex = activeStructure.events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) return;
    
    const updatedEvents = [...activeStructure.events];
    updatedEvents[eventIndex] = {
      ...updatedEvents[eventIndex],
      active: !updatedEvents[eventIndex].active
    };
    
    setActiveStructure({
      ...activeStructure,
      events: updatedEvents
    });
  };
  
  // Function to save the entire structure
  const handleSaveStructure = async () => {
    try {
      setLocalError('');
      
      // Basic validation
      if (!activeStructure.name || !activeStructure.role) {
        setLocalError('Name and role are required fields');
        return;
      }
      
      if (!activeStructure.tiers || activeStructure.tiers.length === 0) {
        setLocalError('At least one tier is required');
        return;
      }
      
      if (!activeStructure.events || activeStructure.events.length === 0) {
        setLocalError('At least one commission event is required');
        return;
      }
      
      await saveCommissionStructure(activeStructure);
      
    } catch (err) {
      setLocalError(err.message || 'Failed to save commission structure');
    }
  };
  
  // Function to confirm deletion
  const handleConfirmDelete = (structure) => {
    setStructureToDelete(structure);
    setShowDeleteModal(true);
  };
  
  // Function to delete a structure
  const handleDeleteStructure = async () => {
    try {
      if (!structureToDelete?._id) {
        setShowDeleteModal(false);
        return;
      }
      
      await deleteCommissionStructure(structureToDelete._id);
      setShowDeleteModal(false);
    } catch (err) {
      setLocalError(err.message || 'Failed to delete commission structure');
      setShowDeleteModal(false);
    }
  };
  
  // Function to cancel editing and return to commission page
  const handleCancel = () => {
    navigate('/commission');
  };
  
  return (
    <Container>
      <h1 className="mb-4">
        <i className="fa-solid fa-gear me-2"></i> Commission Structure Management
      </h1>
      
      {(error || localError) && (
        <Alert variant="danger" onClose={() => setLocalError('')} dismissible>
          {error || localError}
        </Alert>
      )}
      
      <Row>
        <Col md={3}>
          <Card className="mb-4">
            <Card.Header>Commission Structures</Card.Header>
            <Card.Body>
              {isLoading ? (
                <div className="text-center p-3">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : (
                <>
                  <ul className="structure-list">
                    {commissionStructures.map(structure => (
                      <li 
                        key={structure._id} 
                        className={selectedStructureId === structure._id ? 'active' : ''}
                        onClick={() => handleStructureSelect(structure._id)}
                      >
                        <div className="d-flex justify-content-between">
                          <span>
                            {structure.name} ({structure.role})
                          </span>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="text-danger p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmDelete(structure);
                            }}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    variant="primary" 
                    className="w-100 mt-3"
                    onClick={handleCreateStructure}
                  >
                    <i className="fa-solid fa-plus me-2"></i> New Structure
                  </Button>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={9}>
          {activeStructure && (
            <Card>
              <Card.Header>Edit Commission Structure</Card.Header>
              <Card.Body>
                <Form>
                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Structure Name</Form.Label>
                        <Form.Control 
                          type="text" 
                          value={activeStructure.name}
                          onChange={(e) => handleStructureChange('name', e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Role</Form.Label>
                        <Form.Select
                          value={activeStructure.role}
                          onChange={(e) => handleStructureChange('role', e.target.value)}
                        >
                          <option value="employee">Employee</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Tabs
                    activeKey={activeTab}
                    onSelect={(k) => setActiveTab(k)}
                    className="mb-3"
                  >
                    <Tab eventKey="tiers" title="Commission Tiers">
                      <Table striped bordered responsive>
                        <thead>
                          <tr>
                            <th>Tier</th>
                            <th>Accessory Target</th>
                            <th>Accessory Rate</th>
                            <th>Upgrade Rate</th>
                            <th>CP Rate</th>
                            <th>APO Rate</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeStructure.tiers.map(tier => (
                            <tr key={tier.id}>
                              <td>{tier.name}</td>
                              <td>${tier.accessoryTarget.toFixed(2)}</td>
                              <td>{(tier.accessoryRate * 100).toFixed(0)}%</td>
                              <td>${tier.upgradeRate.toFixed(2)}</td>
                              <td>${tier.cpRate.toFixed(2)}</td>
                              <td>{(tier.apoRate * 100).toFixed(0)}%</td>
                              <td>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleEditTier(tier)}
                                  className="me-2"
                                >
                                  <i className="fa-solid fa-edit"></i>
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDeleteTier(tier.id)}
                                >
                                  <i className="fa-solid fa-trash"></i>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      
                      <Button 
                        variant="outline-primary" 
                        onClick={handleAddTier}
                        className="mt-2"
                      >
                        <i className="fa-solid fa-plus me-2"></i> Add Tier
                      </Button>
                    </Tab>
                    
                    <Tab eventKey="events" title="Commission Events">
                      <p className="text-muted mb-3">
                        Manage commission events - these are specific actions that trigger commission payments.
                      </p>
                      
                      <ListGroup className="mb-3">
                        {activeStructure.events && activeStructure.events.map(event => (
                          <ListGroup.Item 
                            key={event.id}
                            className="d-flex justify-content-between align-items-center"
                          >
                            <div>
                              <div className="d-flex align-items-center">
                                <span className="fw-medium">{event.name}</span>
                                {event.active ? (
                                  <Badge bg="success" className="ms-2">Active</Badge>
                                ) : (
                                  <Badge bg="secondary" className="ms-2">Inactive</Badge>
                                )}
                              </div>
                              <div className="text-muted small">{event.description}</div>
                              <div className="mt-1">
                                <Badge bg="info" text="white">
                                  {event.type === 'flat' ? 
                                    `$${event.value.toFixed(2)}` : 
                                    `${(event.value * 100).toFixed(0)}%`}
                                </Badge>
                                <Badge bg="light" text="black" className="ms-2">
                                  {event.category}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <Button
                                variant={event.active ? "outline-secondary" : "outline-success"}
                                size="sm"
                                onClick={() => handleToggleEventActive(event.id)}
                                className="me-2"
                                title={event.active ? "Deactivate event" : "Activate event"}
                              >
                                <i className={`fa-solid ${event.active ? 'fa-ban' : 'fa-check'}`}></i>
                              </Button>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleEditEvent(event)}
                                className="me-2"
                                title="Edit event"
                              >
                                <i className="fa-solid fa-edit"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeleteEvent(event.id)}
                                title="Delete event"
                              >
                                <i className="fa-solid fa-trash"></i>
                              </Button>
                            </div>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                      
                      <Button 
                        variant="outline-primary" 
                        onClick={handleAddEvent}
                        className="mt-2"
                      >
                        <i className="fa-solid fa-plus me-2"></i> Add Commission Event
                      </Button>
                    </Tab>
                  </Tabs>
                  
                  <div className="d-flex justify-content-end mt-4">
                    <Button 
                      variant="secondary" 
                      onClick={handleCancel}
                      className="me-2"
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="success" 
                      onClick={handleSaveStructure}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save Structure'}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
      
      {/* Tier Edit Modal */}
      <Modal show={showTierModal} onHide={() => setShowTierModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {activeTier?.id ? `Edit ${activeTier.name}` : 'Add New Tier'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {activeTier && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Tier Name</Form.Label>
                <Form.Control
                  type="text"
                  value={activeTier.name}
                  onChange={(e) => handleTierChange('name', e.target.value)}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Accessory Target ($)</Form.Label>
                <Form.Control
                  type="number"
                  value={activeTier.accessoryTarget}
                  onChange={(e) => handleTierChange('accessoryTarget', e.target.value)}
                />
                <Form.Text>
                  Minimum accessory revenue to qualify for this tier
                </Form.Text>
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Accessory Commission Rate (%)</Form.Label>
                <Form.Control
                  type="number"
                  value={(activeTier.accessoryRate * 100).toFixed(0)}
                  onChange={(e) => handleTierChange('accessoryRate', e.target.value)}
                />
              </Form.Group>
              
              <h6 className="mt-4 mb-2">Activation Commissions</h6>
              
              <Row className="mb-3">
                <Col xs={6}>
                  <Form.Group>
                    <Form.Label>$30 Plan ($)</Form.Label>
                    <Form.Control
                      type="number"
                      value={activeTier.activationRates.type30}
                      onChange={(e) => handleActivationRateChange('type30', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col xs={6}>
                  <Form.Group>
                    <Form.Label>$40 Plan ($)</Form.Label>
                    <Form.Control
                      type="number"
                      value={activeTier.activationRates.type40}
                      onChange={(e) => handleActivationRateChange('type40', e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col xs={6}>
                  <Form.Group>
                    <Form.Label>$55 Plan ($)</Form.Label>
                    <Form.Control
                      type="number"
                      value={activeTier.activationRates.type55}
                      onChange={(e) => handleActivationRateChange('type55', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col xs={6}>
                  <Form.Group>
                    <Form.Label>$60+ Plan ($)</Form.Label>
                    <Form.Control
                      type="number"
                      value={activeTier.activationRates.type60}
                      onChange={(e) => handleActivationRateChange('type60', e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col xs={6}>
                  <Form.Group>
                    <Form.Label>Upgrade Commission ($)</Form.Label>
                    <Form.Control
                      type="number"
                      value={activeTier.upgradeRate}
                      onChange={(e) => handleTierChange('upgradeRate', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col xs={6}>
                  <Form.Group>
                    <Form.Label>CP Commission ($)</Form.Label>
                    <Form.Control
                      type="number"
                      value={activeTier.cpRate}
                      onChange={(e) => handleTierChange('cpRate', e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Form.Group className="mb-3">
                <Form.Label>APO Commission Rate for $60+ (%)</Form.Label>
                <Form.Control
                  type="number"
                  value={(activeTier.apoRate * 100).toFixed(0)}
                  onChange={(e) => handleTierChange('apoRate', e.target.value)}
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTierModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveTier}>
            Save Tier
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Event Edit Modal */}
      <Modal show={showEventModal} onHide={() => setShowEventModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {activeEvent?.id ? `Edit ${activeEvent.name}` : 'Add New Commission Event'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {activeEvent && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Event Name</Form.Label>
                <Form.Control
                  type="text"
                  value={activeEvent.name}
                  onChange={(e) => handleEventChange('name', e.target.value)}
                  placeholder="e.g., New Customer Activation"
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={activeEvent.description}
                  onChange={(e) => handleEventChange('description', e.target.value)}
                  placeholder="Describe when this commission applies"
                />
              </Form.Group>
              
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Category</Form.Label>
                    <Form.Select
                      value={activeEvent.category}
                      onChange={(e) => handleEventChange('category', e.target.value)}
                    >
                      <option value="activation">Activation</option>
                      <option value="accessory">Accessory</option>
                      <option value="upgrade">Upgrade</option>
                      <option value="protection">Protection Plan</option>
                      <option value="apo">APO</option>
                      <option value="bonus">Bonus</option>
                      <option value="other">Other</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      value={activeEvent.active}
                      onChange={(e) => handleEventChange('active', e.target.value)}
                    >
                      <option value={true}>Active</option>
                      <option value={false}>Inactive</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Commission Type</Form.Label>
                    <Form.Select
                      value={activeEvent.type}
                      onChange={(e) => handleEventChange('type', e.target.value)}
                    >
                      <option value="flat">Flat Rate ($)</option>
                      <option value="percentage">Percentage (%)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>
                      {activeEvent.type === 'flat' ? 'Amount ($)' : 'Percentage (%)'}
                    </Form.Label>
                    <Form.Control
                      type="number"
                      step={activeEvent.type === 'percentage' ? '0.01' : '1'}
                      value={activeEvent.type === 'percentage' ? 
                        (activeEvent.value * 100).toFixed(0) : 
                        activeEvent.value
                      }
                      onChange={(e) => handleEventChange('value', e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEventModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEvent}>
            Save Event
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete the commission structure: <strong>{structureToDelete?.name}</strong>?</p>
          <p className="text-danger">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteStructure}>
            Delete Structure
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CommissionManagement;