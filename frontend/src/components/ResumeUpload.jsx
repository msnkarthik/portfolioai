import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Button, LinearProgress, Snackbar, Alert } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import axios from 'axios';

// ResumeUpload component allows users to upload a resume and create a portfolio
function ResumeUpload({ onPortfolioCreated }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Hardcoded user_id for demo; replace with real user auth in production
  const USER_ID = "test-user-123";

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
      // Backend expects the file field to be named 'file'
      formData.append('file', file);
      // Use the filename (without extension) as the portfolio title
      const title = file.name.replace(/\.[^/.]+$/, "");
      // Call backend API to create portfolio from resume
      // Backend expects user_id and title as query params
      await axios.post(`/api/portfolios/resume?user_id=${USER_ID}&title=${encodeURIComponent(title)}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSnackbar({ open: true, message: 'Portfolio creation started!', severity: 'success' });
      setFile(null);
      // Notify parent to refresh portfolio list
      if (onPortfolioCreated) onPortfolioCreated();
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