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
  Stack
} from '@mui/material';
import axios from '../utils/axios';
import ReactMarkdown from 'react-markdown';
import RefreshIcon from '@mui/icons-material/Refresh';

function CareerGuide({ userId }) {
  const [careerGuides, setCareerGuides] = useState([]);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [regenerating, setRegenerating] = useState({});

  // Fetch career guides on component mount
  useEffect(() => {
    fetchCareerGuides();
  }, [userId]);

  const fetchCareerGuides = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/career-guides/${userId}`);
      setCareerGuides(response.data);
      
      // Set the latest guide as selected by default
      if (response.data.length > 0) {
        setSelectedGuide(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching career guides:', error);
      setError('Failed to fetch career guides. Please try again.');
      setSnackbar({
        open: true,
        message: 'Error fetching career guides. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewGuide = (guide) => {
    setSelectedGuide(guide);
  };

  const handleRegenerateGuide = async (guide) => {
    try {
      // Set regenerating state for this specific guide
      setRegenerating(prev => ({ ...prev, [guide.id]: true }));
      
      // Call the generate endpoint with the same parameters
      const response = await axios.post('/api/career-guides/generate', {
        user_id: userId,
        job_description_id: guide.job_description_id,
        resume_id: guide.resume_id
      });

      // Show success message
      setSnackbar({
        open: true,
        message: 'Career guide regeneration started. Please wait...',
        severity: 'success'
      });

      // Refresh the career guides list after a short delay
      setTimeout(fetchCareerGuides, 2000);
    } catch (error) {
      console.error('Error regenerating career guide:', error);
      setSnackbar({
        open: true,
        message: 'Error regenerating career guide. Please try again.',
        severity: 'error'
      });
    } finally {
      // Clear regenerating state for this guide
      setRegenerating(prev => ({ ...prev, [guide.id]: false }));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Latest Career Guide Display */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Latest Career Guide
          </Typography>
          {selectedGuide ? (
            <Box>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'background.paper', 
                borderRadius: 1,
                maxHeight: '500px',
                overflow: 'auto',
                mb: 2
              }}>
                <ReactMarkdown>{selectedGuide.content}</ReactMarkdown>
              </Box>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => handleRegenerateGuide(selectedGuide)}
                disabled={regenerating[selectedGuide.id]}
                startIcon={regenerating[selectedGuide.id] ? <CircularProgress size={20} /> : <RefreshIcon />}
                sx={{ mt: 2 }}
              >
                {regenerating[selectedGuide.id] ? 'Regenerating...' : 'Regenerate Career Guide'}
              </Button>
            </Box>
          ) : (
            <Typography color="text.secondary">
              No career guide available. Please generate a career guide from the Profile tab.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Career Guide History Table */}
      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Career Guide History
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Created At</TableCell>
                  <TableCell>Job Description</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {careerGuides.map((guide) => (
                  <TableRow key={guide.id}>
                    <TableCell>
                      {new Date(guide.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {guide.job_description_id ? 'Linked' : 'Not Linked'}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleViewGuide(guide)}
                        >
                          View
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleRegenerateGuide(guide)}
                          disabled={regenerating[guide.id]}
                          startIcon={regenerating[guide.id] ? <CircularProgress size={16} /> : <RefreshIcon />}
                        >
                          {regenerating[guide.id] ? 'Regenerating...' : 'Regenerate'}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {careerGuides.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      No career guides found
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

export default CareerGuide; 