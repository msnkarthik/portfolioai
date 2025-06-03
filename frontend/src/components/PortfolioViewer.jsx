import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Snackbar, Alert } from '@mui/material';
import { useParams } from 'react-router-dom';
import axios from '../utils/axios';

// PortfolioViewer component displays the generated portfolio
function PortfolioViewer() {
  const { id } = useParams();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Fetch portfolio HTML from backend
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        console.log('Fetching portfolio:', id);
        
        // Use consistent endpoint format
        const response = await axios.get(`/api/users/portfolios/${id}`);
        
        // Log successful response
        console.log('Successfully fetched portfolio:', response.data);
        
        // Validate response data
        if (!response.data || !response.data.content) {
          throw new Error('Invalid portfolio data: missing content');
        }
        
        setPortfolio(response.data.content);
      } catch (error) {
        console.error('Error fetching portfolio:', error);
        const errorMessage = error.response?.data?.detail || 
                           error.response?.data?.error || 
                           error.message || 
                           'Failed to load portfolio. Please try again.';
        setSnackbar({ 
          open: true, 
          message: errorMessage, 
          severity: 'error' 
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchPortfolio();
    } else {
      setSnackbar({ 
        open: true, 
        message: 'Invalid portfolio ID', 
        severity: 'error' 
      });
      setLoading(false);
    }
  }, [id]);

  return (
    <Box maxWidth={900} mx="auto" mt={4}>
      <Card sx={{ p: 2, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Portfolio Viewer
          </Typography>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
              <CircularProgress />
            </Box>
          ) : (
            <Box mt={2} sx={{ bgcolor: '#111', borderRadius: 2, p: 2 }}>
              {/* Render the HTML safely */}
              <div dangerouslySetInnerHTML={{ __html: portfolio }} />
            </Box>
          )}
        </CardContent>
      </Card>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default PortfolioViewer; 