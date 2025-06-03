import React from 'react';
import { Box, Card, CardContent, Typography, Button, Stack } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ChatIcon from '@mui/icons-material/Chat';
import { useNavigate } from 'react-router-dom';

// Home component: welcome and quick actions
function Home() {
  const navigate = useNavigate();
  return (
    <Box maxWidth={600} mx="auto" mt={6}>
      <Card sx={{ p: 3, borderRadius: 3, boxShadow: 4, textAlign: 'center', bgcolor: 'background.paper' }}>
        <CardContent>
          <Typography variant="h3" color="primary" fontWeight={700} gutterBottom>
            PortfolioAI
          </Typography>
          <Typography variant="h6" color="text.secondary" mb={3}>
            Build your modern portfolio with AI. Choose a workflow to get started:
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<UploadFileIcon />}
              onClick={() => navigate('/resume')}
            >
              Upload Resume
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              startIcon={<ChatIcon />}
              onClick={() => navigate('/chat')}
            >
              Chat Q&A
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Home; 