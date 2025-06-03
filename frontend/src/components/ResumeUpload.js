import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Button, LinearProgress, Snackbar, Alert } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import axios from 'axios';

// ResumeUpload component allows users to upload a resume and create a portfolio
function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Handle file selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      // Call backend API to create portfolio from resume
      await axios.post('/api/portfolio/resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSnackbar({ open: true, message: 'Portfolio creation started!', severity: 'success' });
      setFile(null);
    } catch (err) {
      setSnackbar({ open: true, message: 'Upload failed. Please try again.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxWidth={500} mx="auto" mt={4}>
      <Card sx={{ p: 2, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Upload Resume
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Upload your PDF or DOCX resume to generate a portfolio.
          </Typography>
          <form onSubmit={handleSubmit}>
            <Button
              variant="contained"
              component="label"
              startIcon={<UploadFileIcon />}
              color="primary"
              sx={{ mb: 2 }}
              fullWidth
              disabled={loading}
            >
              {file ? file.name : 'Select Resume File'}
              <input type="file" accept=".pdf,.doc,.docx" hidden onChange={handleFileChange} />
            </Button>
            {loading && <LinearProgress sx={{ mb: 2 }} />}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={!file || loading}
            >
              Create Portfolio
            </Button>
          </form>
        </CardContent>
      </Card>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default ResumeUpload; 