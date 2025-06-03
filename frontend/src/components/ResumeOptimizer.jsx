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

function ResumeOptimizer({ userId }) {
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [regenerating, setRegenerating] = useState({});

  // Fetch resumes on component mount
  useEffect(() => {
    fetchResumes();
  }, [userId]);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/resumes/${userId}`);
      setResumes(response.data);
      
      // Set the latest resume as selected by default
      if (response.data.length > 0) {
        setSelectedResume(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching resumes:', error);
      setError('Failed to fetch resumes. Please try again.');
      setSnackbar({
        open: true,
        message: 'Error fetching resumes. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewResume = (resume) => {
    setSelectedResume(resume);
  };

  const handleRegenerateResume = async (resume) => {
    try {
      // Set regenerating state for this specific resume
      setRegenerating(prev => ({ ...prev, [resume.id]: true }));
      
      // Call the optimize endpoint with the same parameters
      const response = await axios.post('/api/resumes/optimize', {
        user_id: userId,
        job_description_id: resume.job_description_id,
        resume_id: resume.original_resume_id
      });

      // Show success message
      setSnackbar({
        open: true,
        message: 'Resume regeneration started. Please wait...',
        severity: 'success'
      });

      // Refresh the resumes list after a short delay
      setTimeout(fetchResumes, 2000);
    } catch (error) {
      console.error('Error regenerating resume:', error);
      setSnackbar({
        open: true,
        message: 'Error regenerating resume. Please try again.',
        severity: 'error'
      });
    } finally {
      // Clear regenerating state for this resume
      setRegenerating(prev => ({ ...prev, [resume.id]: false }));
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
      {/* Latest Resume Display */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Latest Optimized Resume
          </Typography>
          {selectedResume ? (
            <Box sx={{ 
              p: 2, 
              bgcolor: 'background.paper', 
              borderRadius: 1,
              maxHeight: '500px',
              overflow: 'auto'
            }}>
              <ReactMarkdown>{selectedResume.content}</ReactMarkdown>
            </Box>
          ) : (
            <Typography color="text.secondary">
              No resume available. Please optimize a resume from the Profile tab.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Resume History Table */}
      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Resume History
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Created At</TableCell>
                  <TableCell>Job Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resumes.map((resume) => (
                  <TableRow key={resume.id}>
                    <TableCell>
                      {new Date(resume.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {resume.job_description_id ? 'Linked' : 'Not Linked'}
                    </TableCell>
                    <TableCell>
                      {resume.status || 'Completed'}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleViewResume(resume)}
                        >
                          View
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleRegenerateResume(resume)}
                          disabled={regenerating[resume.id]}
                          startIcon={regenerating[resume.id] ? <CircularProgress size={16} /> : null}
                        >
                          {regenerating[resume.id] ? 'Regenerating...' : 'Regenerate'}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {resumes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No resumes found
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

export default ResumeOptimizer; 