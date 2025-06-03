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

function CoverLetterWriter({ userId }) {
  const [coverLetters, setCoverLetters] = useState([]);
  const [selectedCoverLetter, setSelectedCoverLetter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Fetch cover letters on component mount
  useEffect(() => {
    fetchCoverLetters();
  }, [userId]);

  const fetchCoverLetters = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/cover-letters/${userId}`);
      setCoverLetters(response.data);
      
      // Set the latest cover letter as selected by default
      if (response.data.length > 0) {
        setSelectedCoverLetter(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching cover letters:', error);
      setError('Failed to fetch cover letters. Please try again.');
      setSnackbar({
        open: true,
        message: 'Error fetching cover letters. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewCoverLetter = (coverLetter) => {
    setSelectedCoverLetter(coverLetter);
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
      {/* Latest Cover Letter Display */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Latest Cover Letter
          </Typography>
          {selectedCoverLetter ? (
            <Box sx={{ 
              p: 2, 
              bgcolor: 'background.paper', 
              borderRadius: 1,
              maxHeight: '500px',
              overflow: 'auto'
            }}>
              <ReactMarkdown>{selectedCoverLetter.content}</ReactMarkdown>
            </Box>
          ) : (
            <Typography color="text.secondary">
              No cover letter available. Please generate a cover letter from the Profile tab.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Cover Letter History Table */}
      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Cover Letter History
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
                {coverLetters.map((coverLetter) => (
                  <TableRow key={coverLetter.id}>
                    <TableCell>
                      {new Date(coverLetter.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {coverLetter.job_description_id ? 'Linked' : 'Not Linked'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleViewCoverLetter(coverLetter)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {coverLetters.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      No cover letters found
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

export default CoverLetterWriter; 