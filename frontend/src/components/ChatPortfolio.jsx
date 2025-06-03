import React, { useState, useRef, useEffect } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, CircularProgress, Snackbar, Alert, List, ListItem, ListItemText, Paper } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';

// ChatPortfolio component allows users to create a portfolio via chat Q&A
function ChatPortfolio({ onChatComplete }) {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hi! I can help you build your portfolio. What is your full name?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const chatEndRef = useRef(null);

  const questions = [
    'What is your full name?',
    'What is your most recent job title?',
    'List your top skills.',
    'Describe your work experience.',
    'List your projects.',
    'List your education qualifications'
  ];

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
      // Store the answer
      const answers = messages
        .filter(msg => msg.sender === 'user')
        .map(msg => msg.text);
      answers.push(input);

      // If this was the last question, complete the chat
      if (currentQuestion === questions.length - 1) {
        // Add completion message
        setMessages(msgs => [...msgs, { 
          sender: 'ai', 
          text: 'Thanks for your inputs. Saving your profile information.' 
        }]);

        // Parse the chat answers into structured data
        const structuredData = {
          'Name': answers[0] || '',  // Use the name from first answer
          'About Me': answers[0] || '',
          'Work Experience': [],
          'Skills': [],
          'Projects': [],
          'Education': []
        };

        // Parse Work Experience
        if (answers[1]) {
          const workExp = answers[1].split(';').map(item => {
            const parts = item.split('|').map(p => p.trim());
            return {
              'Company': parts[0] || '',
              'Designation': parts[1] || '',
              'Duration': parts[2] || '',
              'Description': parts[3] || ''
            };
          });
          structuredData['Work Experience'] = workExp;
        }

        // Parse Skills
        if (answers[2]) {
          structuredData['Skills'] = answers[2].split(/[,\n]/).map(s => s.trim()).filter(Boolean);
        }

        // Parse Projects
        if (answers[3]) {
          const projects = answers[3].split(';').map(item => {
            const parts = item.split('|').map(p => p.trim());
            return {
              'Name': parts[0] || '',
              'Description': parts[1] || ''
            };
          });
          structuredData['Projects'] = projects;
        }

        // Parse Education
        if (answers[4]) {
          const education = answers[4].split(';').map(item => {
            const parts = item.split('|').map(p => p.trim());
            return {
              'Degree': parts[0] || '',
              'Institution': parts[1] || '',
              'Board': parts[2] || '',
              'Description': parts[3] || ''
            };
          });
          structuredData['Education'] = education;
        }

        onChatComplete(structuredData);
        return;
      }

      // Move to next question
      setCurrentQuestion(prev => prev + 1);
      setMessages(msgs => [...msgs, { 
        sender: 'ai', 
        text: questions[currentQuestion + 1] 
      }]);
    } catch (error) {
      console.error('Error in chat:', error);
      setSnackbar({
        open: true,
        message: 'Error processing your response. Please try again.',
        severity: 'error'
      });
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
    <Box>
      <Card sx={{ p: 2, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Answer a few questions to help us understand your background and skills.
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
              disabled={loading || currentQuestion === questions.length}
              size="small"
            />
            <Button
              variant="contained"
              color="primary"
              endIcon={loading ? <CircularProgress size={18} /> : <ChatIcon />}
              onClick={handleSend}
              disabled={loading || !input.trim() || currentQuestion === questions.length}
            >
              Send
            </Button>
          </Box>
        </CardContent>
      </Card>
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default ChatPortfolio; 