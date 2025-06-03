import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Button, LinearProgress, Snackbar, Alert, TextField, Stack } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ClearIcon from '@mui/icons-material/Clear';
import axios from 'axios';

// ResumeUpload component allows users to upload a resume
function ResumeUpload({ onResumeUploaded, userId }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [error, setError] = useState(null);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    console.log('File selected:', selectedFile);
    setFile(selectedFile);
  };

  // Handle clear button
  const handleClear = () => {
    console.log('Clearing file and title');
    setFile(null);
    setTitle('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submit attempt - File:', file, 'Title:', title);
    if (!file || !title) {
      console.log('Validation failed - File:', !!file, 'Title:', !!title);
      setSnackbar({ 
        open: true, 
        message: 'Please select a file and enter a name.', 
        severity: 'error' 
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', userId);
      formData.append('title', title);

      // Log the request for debugging
      console.log('Uploading resume with:', {
        userId,
        title,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });

      const response = await axios.post('/api/portfolios/resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        params: {
          user_id: userId,
          title: title
        }
      });

      // Transform the response to match the expected format
      const resumeData = {
        resumeId: response.data.resume_id,
        portfolioId: response.data.portfolio_id,
        status: response.data.status,
        title: title,
        fileName: file.name
      };

      onResumeUploaded(resumeData);
      setSnackbar({ open: true, message: 'Resume uploaded successfully!', severity: 'success' });
      // Don't clear the form after successful upload
    } catch (error) {
      console.error('Error uploading resume:', error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.error || 'Error uploading resume. Please try again.';
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

  return (
    <Box>
      <Card sx={{ p: 2, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Upload your PDF or DOCX resume to get started.
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Name of the candidate"
              value={title}
              onChange={(e) => {
                console.log('Title changed:', e.target.value);
                setTitle(e.target.value);
              }}
              disabled={loading}
              sx={{ mb: 2 }}
              required
            />
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Button
                variant="contained"
                component="label"
                startIcon={<UploadFileIcon />}
                color="primary"
                disabled={loading}
                sx={{ flex: 1 }}
              >
                {file ? `${title} - ${file.name}` : 'Select Resume File'}
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx" 
                  hidden 
                  onChange={handleFileChange}
                  onClick={(e) => {
                    // Clear the input value when clicked to allow selecting the same file again
                    e.target.value = '';
                  }}
                />
              </Button>
              {file && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<ClearIcon />}
                  onClick={handleClear}
                  disabled={loading}
                >
                  Clear
                </Button>
              )}
            </Stack>
            {loading && <LinearProgress sx={{ mb: 2 }} />}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={!file || !title.trim() || loading}
              onClick={() => console.log('Upload button clicked - File:', !!file, 'Title:', !!title.trim(), 'Loading:', loading)}
            >
              Upload Resume
            </Button>
          </form>
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

export default ResumeUpload; 