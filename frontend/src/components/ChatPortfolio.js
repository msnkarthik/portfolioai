import React, { useState, useRef, useEffect } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, CircularProgress, Snackbar, Alert, List, ListItem, ListItemText, Paper } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import axios from 'axios';

// ChatPortfolio component allows users to create a portfolio via chat Q&A
function ChatPortfolio() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hi! I can help you build your portfolio. What is your full name?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const chatEndRef = useRef(null);

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
      // Call backend API for chat Q&A
      const res = await axios.post('/api/portfolio/chat', { message: input });
      setMessages((msgs) => [...msgs, { sender: 'ai', text: res.data.reply }]);
    } catch (err) {
      setSnackbar({ open: true, message: 'Error communicating with AI.', severity: 'error' });
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
                <ListItem key={idx} alignItems={msg.sender === 'user' ? 'right' : 'left'}>
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
              disabled={loading}
              size="small"
            />
            <Button
              variant="contained"
              color="primary"
              endIcon={loading ? <CircularProgress size={18} /> : <ChatIcon />}
              onClick={handleSend}
              disabled={loading || !input.trim()}
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