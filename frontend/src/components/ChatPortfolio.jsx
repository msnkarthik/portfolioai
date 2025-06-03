import React, { useState, useRef, useEffect } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, CircularProgress, Snackbar, Alert, List, ListItem, ListItemText, Paper } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import axios from 'axios';

// Hardcoded user_id for demo; replace with real user auth in production
const USER_ID = "test-user-123";

// ChatPortfolio component allows users to create a portfolio via chat Q&A
function ChatPortfolio({ onPortfolioCreated }) {
  // Start with a welcome message
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Let me help you generate your portfolio through chat. Are you ready?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const chatEndRef = useRef(null);
  // Store portfolio_id after chat start
  const [portfolioId, setPortfolioId] = useState(null);
  // Store title after first answer
  const [title, setTitle] = useState('');
  // Store chat completion state
  const [chatComplete, setChatComplete] = useState(false);
  // Track if the real chat has started
  const [chatStarted, setChatStarted] = useState(false);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { sender: 'user', text: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput('');
    setLoading(true);
    try {
      // If chat hasn't started, start it after the welcome message
      if (!chatStarted) {
        setChatStarted(true);
        // After the welcome, get the first backend question
        const res = await axios.post('/api/portfolios/chat/start', {
          user_id: USER_ID,
          title: input,
        });
        setPortfolioId(res.data.portfolio_id);
        setTitle(input);
        setMessages((msgs) => [...msgs, { sender: 'ai', text: res.data.next_question }]);
        setLoading(false);
        return;
      }
      let aiReply = '';
      let status = '';
      if (!portfolioId) {
        setTitle(input);
        const res = await axios.post('/api/portfolios/chat/start', {
          user_id: USER_ID,
          title: input,
        });
        setPortfolioId(res.data.portfolio_id);
        console.log('Chat start response:', res.data);
        aiReply = res.data.next_question;
        status = res.data.status;
      } else {
        const res = await axios.post('/api/portfolios/chat/answer', {
          portfolio_id: portfolioId,
          answer: input,
        });
        console.log('Chat answer response:', res.data);
        aiReply = res.data.next_question;
        status = res.data.status;
      }
      // If no next_question or status is completed/processing, mark chat as complete
      if (!aiReply || status === 'completed' || status === 'processing') {
        setChatComplete(true);
        setMessages((msgs) => [
          ...msgs,
          { sender: 'ai', text: 'Portfolio creation is in progress! You can view it in the Portfolio List.' },
        ]);
        setSnackbar({ open: true, message: 'Portfolio creation started! Check the Portfolio List.', severity: 'success' });
        // Notify parent to refresh portfolio list
        if (onPortfolioCreated) onPortfolioCreated();
      } else {
        setMessages((msgs) => [...msgs, { sender: 'ai', text: aiReply }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setSnackbar({ open: true, message: err?.response?.data?.detail || 'Error communicating with AI.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box maxWidth={600} mx="auto" mt={4}>
      <Card sx={{ p: 2, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Chat to Build Portfolio
          </Typography>
          <Paper variant="outlined" sx={{ maxHeight: 300, overflowY: 'auto', mb: 2, p: 1, bgcolor: 'background.paper' }}>
            <List>
              {messages.map((msg, idx) => (
                <ListItem key={idx} alignItems={msg.sender === 'ai' ? 'flex-start' : 'flex-start'}>
                  <ListItemText
                    primary={msg.text}
                    primaryTypographyProps={{
                      align: msg.sender === 'user' ? 'right' : 'left',
                      color: msg.sender === 'user' ? 'primary' : 'text.primary',
                    }}
                  />
                </ListItem>
              ))}
              <div ref={chatEndRef} />
            </List>
          </Paper>
          <Box display="flex" gap={1}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type your answer..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || chatComplete}
              size="small"
            />
            <Button
              variant="contained"
              color="primary"
              endIcon={loading ? <CircularProgress size={18} /> : <ChatIcon />}
              onClick={handleSend}
              disabled={loading || !input.trim() || chatComplete}
            >
              Send
            </Button>
          </Box>
        </CardContent>
      </Card>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default ChatPortfolio; 