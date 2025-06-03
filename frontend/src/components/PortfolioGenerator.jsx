import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import axios from '../utils/axios';

function PortfolioGenerator({ userId }) {
  const [portfolios, setPortfolios] = useState([]);
  const [latestPortfolio, setLatestPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Fetch portfolios on component mount or when userId changes
  useEffect(() => {
    if (!userId) {
      console.error('No userId provided to PortfolioGenerator');
      setError('User ID is required to fetch portfolios');
      setLoading(false);
      return;
    }

    const fetchPortfolios = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching portfolios for user:', userId);
        
        const response = await axios.get(`/api/users/${userId}/portfolios`);
        console.log('Successfully fetched portfolios:', response.data);
        
        if (!Array.isArray(response.data)) {
          throw new Error('Invalid response format: expected array of portfolios');
        }
        
        setPortfolios(response.data);
        
        // Set the latest portfolio
        if (response.data.length > 0) {
          const latest = response.data.reduce((latest, current) => {
            return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
          });
          setLatestPortfolio(latest);
          console.log('Set latest portfolio:', latest.id);
        }
      } catch (error) {
        console.error('Error fetching portfolios:', error);
        const errorMessage = error.response?.data?.detail || 
                           error.response?.data?.error || 
                           error.message || 
                           'Failed to fetch portfolios. Please try again.';
        setError(errorMessage);
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolios();
  }, [userId]);

  const handleViewPortfolio = async (portfolio) => {
    try {
      console.log('Viewing portfolio:', portfolio.id);
      const response = await axios.get(`/api/portfolios/${portfolio.id}/export`);
      const { html, css } = response.data;
      
      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>${css}</style>
          </head>
          <body>${html}</body>
        </html>
      `;
      
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error viewing portfolio:', error);
      setSnackbar({
        open: true,
        message: 'Error viewing portfolio. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleExportPortfolio = async (portfolio) => {
    try {
      console.log('Exporting portfolio:', portfolio.id);
      const response = await axios.get(`/api/portfolios/${portfolio.id}/export`);
      const { html, css } = response.data;
      
      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>${css}</style>
          </head>
          <body>${html}</body>
        </html>
      `;
      
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `portfolio_${portfolio.id}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSnackbar({
        open: true,
        message: 'Portfolio exported successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error exporting portfolio:', error);
      setSnackbar({
        open: true,
        message: 'Error exporting portfolio. Please try again.',
        severity: 'error'
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Typography color="error" variant="h6" gutterBottom>
              Error Loading Portfolios
            </Typography>
            <Typography color="text.secondary">
              {error}
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* View Latest Portfolio Button */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '150px' }}>
          {latestPortfolio ? (
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => handleViewPortfolio(latestPortfolio)}
              disabled={latestPortfolio.status !== 'completed'}
              sx={{ 
                px: 4, 
                py: 2,
                fontSize: '1.1rem',
                textTransform: 'none'
              }}
            >
              {latestPortfolio.status === 'completed' 
                ? 'View AI Portfolio' 
                : 'Portfolio Generation in Progress...'}
            </Button>
          ) : (
            <Typography color="text.secondary" align="center">
              No portfolio available. Please generate a portfolio from the Profile tab.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Portfolio History Table */}
      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Portfolio History
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Created At</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {portfolios.map((portfolio) => (
                  <TableRow key={portfolio.id}>
                    <TableCell>
                      {new Date(portfolio.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{portfolio.title || 'Untitled Portfolio'}</TableCell>
                    <TableCell>{portfolio.status}</TableCell>
                    <TableCell>
                      <Tooltip title="View Portfolio">
                        <IconButton
                          color="primary"
                          onClick={() => handleViewPortfolio(portfolio)}
                          disabled={portfolio.status !== 'completed'}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Export Portfolio">
                        <IconButton
                          color="primary"
                          onClick={() => handleExportPortfolio(portfolio)}
                          disabled={portfolio.status !== 'completed'}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {portfolios.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No portfolios found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default PortfolioGenerator; 