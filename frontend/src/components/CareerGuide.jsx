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
  CircularProgress
} from '@mui/material';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

function CareerGuide({ userId }) {
  const [careerGuides, setCareerGuides] = useState([]);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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
            <Box sx={{ 
              p: 2, 
              bgcolor: 'background.paper', 
              borderRadius: 1,
              maxHeight: '500px',
              overflow: 'auto'
            }}>
              <ReactMarkdown>{selectedGuide.content}</ReactMarkdown>
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
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleViewGuide(guide)}
                      >
                        View
                      </Button>
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