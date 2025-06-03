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
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import RefreshIcon from '@mui/icons-material/Refresh';

function CoverLetterWriter({ userId }) {
  const [coverLetters, setCoverLetters] = useState([]);
  const [selectedCoverLetter, setSelectedCoverLetter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [regenerating, setRegenerating] = useState({});

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

  const handleRegenerateCoverLetter = async (coverLetter) => {
    try {
      // Set regenerating state for this specific cover letter
      setRegenerating(prev => ({ ...prev, [coverLetter.id]: true }));
      
      // Call the generate endpoint with the same parameters
      const response = await axios.post('/api/cover-letters/generate', {
        user_id: userId,
        job_description_id: coverLetter.job_description_id,
        resume_id: coverLetter.resume_id
      });

      // Show success message
      setSnackbar({
        open: true,
        message: 'Cover letter regeneration started. Please wait...',
        severity: 'success'
      });

      // Refresh the cover letters list after a short delay
      setTimeout(fetchCoverLetters, 2000);
    } catch (error) {
      console.error('Error regenerating cover letter:', error);
      setSnackbar({
        open: true,
        message: 'Error regenerating cover letter. Please try again.',
        severity: 'error'
      });
    } finally {
      // Clear regenerating state for this cover letter
      setRegenerating(prev => ({ ...prev, [coverLetter.id]: false }));
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
      {/* Latest Cover Letter Display */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Latest Cover Letter
          </Typography>
          {selectedCoverLetter ? (
            <Box>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'background.paper', 
                borderRadius: 1,
                maxHeight: '500px',
                overflow: 'auto',
                mb: 2
              }}>
                <ReactMarkdown>{selectedCoverLetter.content}</ReactMarkdown>
              </Box>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => handleRegenerateCoverLetter(selectedCoverLetter)}
                disabled={regenerating[selectedCoverLetter.id]}
                startIcon={regenerating[selectedCoverLetter.id] ? <CircularProgress size={20} /> : <RefreshIcon />}
                sx={{ mt: 2 }}
              >
                {regenerating[selectedCoverLetter.id] ? 'Regenerating...' : 'Regenerate Cover Letter'}
              </Button>
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
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleViewCoverLetter(coverLetter)}
                        >
                          View
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleRegenerateCoverLetter(coverLetter)}
                          disabled={regenerating[coverLetter.id]}
                          startIcon={regenerating[coverLetter.id] ? <CircularProgress size={16} /> : <RefreshIcon />}
                        >
                          {regenerating[coverLetter.id] ? 'Regenerating...' : 'Regenerate'}
                        </Button>
                      </Stack>
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