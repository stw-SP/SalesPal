import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, Spinner, Tab, Nav, Badge, ButtonGroup, Dropdown } from 'react-bootstrap';
import axios from 'axios';

const Assistant = () => {
  const [prompt, setPrompt] = useState('');
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState({});
  const [activeCategory, setActiveCategory] = useState('sales');
  const [customerType, setCustomerType] = useState('general');
  const [customerPersonas, setCustomerPersonas] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const chatContainerRef = useRef(null);

  // Fetch conversation history and suggested questions on component mount
  useEffect(() => {
    fetchConversations();
    fetchSuggestedQuestions();
  }, []);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [currentConversation]);

  const fetchConversations = async () => {
    try {
      const result = await axios.get('/api/assistant/conversations');
      setConversations(result.data.conversations || []);
      
      // If we have conversations and none is selected, select the most recent one
      if (result.data.conversations?.length > 0 && !currentConversation) {
        await loadConversation(result.data.conversations[0].id);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversation history.');
    }
  };

  const fetchSuggestedQuestions = async () => {
    try {
      const result = await axios.get('/api/assistant/suggested-questions');
      setSuggestedQuestions(result.data.suggestedQuestions || {});
      setCustomerPersonas(result.data.customerPersonas || []);
    } catch (err) {
      console.error('Error fetching suggested questions:', err);
    }
  };

  const loadConversation = async (conversationId) => {
    try {
      setLoading(true);
      const result = await axios.get(`/api/assistant/conversations/${conversationId}`);
      setCurrentConversation(result.data.conversation);
      setError('');
      
      // Set customer type if it exists in the conversation
      if (result.data.conversation.customerType) {
        setCustomerType(result.data.conversation.customerType);
      }
    } catch (err) {
      console.error('Error loading conversation:', err);
      setError('Failed to load conversation.');
    } finally {
      setLoading(false);
    }
  };

  const createNewConversation = () => {
    setCurrentConversation({
      id: null,
      messages: []
    });
    setError('');
  };

  const askAssistant = async (questionText = null) => {
    const messageToSend = questionText || prompt;
    if (!messageToSend.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Add optimistic update for better UX
      const optimisticUpdate = {
        ...currentConversation,
        messages: [
          ...(currentConversation?.messages || []),
          {
            role: 'user',
            content: messageToSend,
            timestamp: new Date().toISOString()
          }
        ]
      };
      setCurrentConversation(optimisticUpdate);
      
      // Clear input if this was from the textarea
      if (!questionText) {
        setPrompt('');
      }
      
      // Minimize suggestions panel after asking a question
      setShowSuggestions(false);
      
      // Call backend endpoint
      const result = await axios.post('/api/assistant', { 
        prompt: messageToSend,
        conversationId: currentConversation?.id,
        customerType: customerType
      });
      
      // Update with actual response
      setCurrentConversation(result.data.conversation);
      
      // If this created a new conversation, refresh the list
      if (!currentConversation?.id) {
        fetchConversations();
      }
    } catch (err) {
      console.error('Error calling assistant API:', err);
      setError('Failed to get response from assistant. Please try again.');
      
      // Remove optimistic update on error
      if (currentConversation?.id) {
        loadConversation(currentConversation.id);
      } else {
        setCurrentConversation(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // Format messages for display
  const renderMessages = () => {
    if (!currentConversation?.messages?.length) {
      return (
        <div className="text-left p-4">
          <div className="message assistant">
            <div className="message-content">
              <div className="message-header">
                <strong>
                  <i className="fa-solid fa-robot me-2"></i>SalesPal
                </strong>
              </div>
              <div className="message-body">
                <p>Hey there! I'm your sales coach for today. What can I help you with?</p>
                <p>Need advice on handling customer questions? Want some tips for closing more sales? Just ask!</p>
                <p>I'm here to help you succeed.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return currentConversation.messages.map((message, index) => (
      <div 
        key={index} 
        className={`message ${message.role === 'assistant' ? 'assistant' : 'user'}`}
      >
        <div className="message-content">
          <div className="message-header">
            <strong>
              {message.role === 'assistant' ? (
                <><i className="fa-solid fa-robot me-2"></i>SalesPal</>
              ) : (
                <><i className="fa-solid fa-user me-2"></i>You</>
              )}
            </strong>
            <small className={`ms-2 ${message.role === 'user' ? '' : 'text-muted'}`}>
              {formatTimestamp(message.timestamp)}
            </small>
          </div>
          <div className="message-body">
            {message.content.split('\n').map((line, i) => {
              // Convert markdown to plain text for more conversational style
              
              // Remove all asterisks (*) from text for a cleaner look
              let cleanLine = line.replace(/\*/g, '');
              
              // Handle bullet points in a conversational way
              if (cleanLine.startsWith('- ')) {
                return (
                  <div key={i} className="mb-2" style={{ paddingLeft: '8px' }}>
                    • {cleanLine.substring(2)}
                  </div>
                );
              } 
              // Handle numbered lists in a conversational way
              else if (cleanLine.match(/^\d+\.\s/)) {
                return (
                  <div key={i} className="mb-2">
                    {cleanLine}
                  </div>
                );
              } 
              // For assistant messages, add more space between paragraphs
              else if (message.role === 'assistant' && cleanLine.length > 0) {
                return <p key={i}>{cleanLine}</p>;
              }
              // For user messages or empty lines
              else {
                return (
                  <React.Fragment key={i}>
                    {cleanLine}
                    {cleanLine.length > 0 && <br />}
                  </React.Fragment>
                );
              }
            })}
          </div>
        </div>
      </div>
    ));
  };

  return (
    <Card className="chat-container mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <div className="me-2" style={{ 
            backgroundColor: 'white',
            color: 'var(--cricket-green)',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="fa-solid fa-robot"></i>
          </div>
          <span style={{ fontWeight: '600' }}>SalesPal Assistant</span>
        </div>
        <div className="d-flex">
          <Dropdown className="me-2">
            <Dropdown.Toggle 
              variant="outline-light" 
              id="customer-type-dropdown" 
              size="sm"
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.15)', 
                border: '1px solid rgba(255,255,255,0.3)',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}
            >
              <i className="fa-solid fa-user-tag me-1"></i>
              {customerType === 'general' ? 'Customer Type' : customerType.replace('_', ' ')}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item 
                onClick={() => setCustomerType('general')}
                active={customerType === 'general'}
              >
                <i className="fa-solid fa-users me-1"></i> General
              </Dropdown.Item>
              {customerPersonas.map(persona => (
                <Dropdown.Item 
                  key={persona.type}
                  onClick={() => setCustomerType(persona.type)}
                  active={customerType === persona.type}
                >
                  <i className={`fa-solid fa-${persona.type === 'tech_enthusiast' ? 'laptop' : 
                                      persona.type === 'senior' ? 'person-cane' :
                                      persona.type === 'budget_conscious' ? 'piggy-bank' :
                                      persona.type === 'business_user' ? 'briefcase' :
                                      persona.type === 'family_manager' ? 'people-roof' : 'user'} me-1`}></i>
                  {persona.type.replace('_', ' ')}
                  <small className="d-block text-muted">{persona.description}</small>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          <Button 
            variant="outline-light" 
            size="sm" 
            onClick={createNewConversation}
            disabled={loading}
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.15)', 
              border: '1px solid rgba(255,255,255,0.3)',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}
          >
            <i className="fa-solid fa-plus me-1"></i> New
          </Button>
        </div>
      </Card.Header>
      
      <div className="chat-layout">
        {/* Conversation Sidebar */}
        <div className="conversation-sidebar">
          <h6 className="px-3 pt-3 pb-2">Conversation History</h6>
          <div className="conversation-list">
            {conversations.length === 0 ? (
              <div className="text-center text-muted p-3">
                <small>No previous conversations</small>
              </div>
            ) : (
              conversations.map(conv => (
                <div 
                  key={conv.id}
                  className={`conversation-item ${currentConversation?.id === conv.id ? 'active' : ''}`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <div className="conversation-preview">
                    {conv.preview}
                  </div>
                  <div className="conversation-meta">
                    <small className="text-muted">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </small>
                    <Badge bg="secondary" pill>
                      {conv.messageCount}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Main Chat Area */}
        <div className="chat-main">
          {/* Messages Container */}
          <div className="messages-container" ref={chatContainerRef}>
            {renderMessages()}
            
            {loading && (
              <div className="text-center p-3">
                <Spinner animation="border" variant="primary" size="sm" /> 
                <span className="ms-2">SalesPal is thinking...</span>
              </div>
            )}
            
            {error && (
              <div className="alert alert-danger mx-3 mt-3">
                <i className="fa-solid fa-triangle-exclamation me-2"></i>
                {error}
              </div>
            )}
          </div>
          
          {/* Suggested Questions - with toggle */}
          <div className="suggested-questions">
            <div 
              className="d-flex justify-content-between align-items-center px-1 pb-2 small" 
              style={{ cursor: 'pointer' }}
              onClick={() => setShowSuggestions(!showSuggestions)}
            >
              <div className="d-flex align-items-center text-dark fw-bold">
                <i className="fa-solid fa-lightbulb me-1" style={{ color: 'var(--cricket-yellow)' }}></i> 
                <span>Need inspiration?</span>
              </div>
              <div>
                <i className={`fa-solid fa-chevron-${showSuggestions ? 'up' : 'down'} text-muted`}></i>
              </div>
            </div>
            
            {showSuggestions && (
              <>
                <Nav variant="pills" className="mb-2 flex-nowrap overflow-auto small">
                  {Object.keys(suggestedQuestions).map(category => (
                    <Nav.Item key={category}>
                      <Nav.Link 
                        active={activeCategory === category}
                        onClick={() => setActiveCategory(category)}
                        className="py-1 px-2"
                        style={{ 
                          backgroundColor: activeCategory === category ? 'var(--cricket-green)' : 'transparent',
                          color: activeCategory === category ? 'white' : 'var(--black)'
                        }}
                      >
                        {category.replace('_', ' ').replace(
                          /\w\S*/g,
                          txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                        )}
                      </Nav.Link>
                    </Nav.Item>
                  ))}
                </Nav>
                
                <div className="question-buttons">
                  {suggestedQuestions[activeCategory]?.map((question, index) => (
                    <Button 
                      key={index}
                      variant={index % 2 === 0 ? "outline-success" : "outline-secondary"}
                      size="sm"
                      className="m-1"
                      onClick={() => askAssistant(question)}
                      disabled={loading}
                      style={{ 
                        borderColor: index % 2 === 0 ? 'var(--cricket-green)' : 'var(--cricket-gray)',
                        color: index % 2 === 0 ? 'var(--cricket-green)' : 'var(--black)'
                      }}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* Input Area */}
          <div className="chat-input-area">
            <Form onSubmit={(e) => { e.preventDefault(); askAssistant(); }}>
              <div className="d-flex">
                <Form.Control
                  placeholder="Type your question here..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={loading}
                  style={{ 
                    borderRadius: '20px',
                    borderColor: 'var(--light-gray)',
                    padding: '10px 15px',
                    fontSize: '0.95rem',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--cricket-green)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--light-gray)'}
                />
                <Button 
                  variant="primary" 
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className="ms-2"
                  style={{ 
                    borderRadius: '50%',
                    width: '38px',
                    height: '38px',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--cricket-green)',
                    border: 'none'
                  }}
                >
                  {loading ? (
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                    />
                  ) : (
                    <i className="fa-solid fa-paper-plane"></i>
                  )}
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Assistant;