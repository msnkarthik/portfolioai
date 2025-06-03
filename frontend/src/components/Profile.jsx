import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Snackbar,
  Alert,
  Grid,
  Paper,
  CircularProgress,
  Chip,
  Stack
} from '@mui/material';
import ResumeUpload from './ResumeUpload';
import ChatPortfolio from './ChatPortfolio';
import StatusHeader from './StatusHeader';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ClearIcon from '@mui/icons-material/Clear';

// Constants for localStorage keys
const STORAGE_KEYS = {
  RESUME_DATA: 'profile_resume_data',
  CHAT_DATA: 'profile_chat_data',
  JOB_DESCRIPTION: 'profile_job_description',
  JOB_DESCRIPTION_ID: 'profile_job_description_id',
  LAST_UPDATED: 'profile_last_updated'
};

// Profile component - Main input tab for user profile and job description
function Profile({ userId, onStatusUpdate }) {
  const navigate = useNavigate();
  // Add validation for userId
  if (!userId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          User ID is required. Please ensure you are properly logged in.
        </Alert>
      </Box>
    );
  }

  // State for tabs
  const [activeTab, setActiveTab] = useState(0);
  
  // State for resume/chat data with localStorage persistence
  const [resumeData, setResumeData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RESUME_DATA);
    return saved ? JSON.parse(saved) : null;
  });
  
  const [chatData, setChatData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CHAT_DATA);
    return saved ? JSON.parse(saved) : null;
  });
  
  // State for job description with localStorage persistence
  const [jobDescription, setJobDescription] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.JOB_DESCRIPTION);
    return saved ? JSON.parse(saved) : {
      title: '',
      content: ''
    };
  });
  
  const [jobDescriptionId, setJobDescriptionId] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.JOB_DESCRIPTION_ID);
    return saved || null;
  });

  // State for loading and notifications
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [lastUpdated, setLastUpdated] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LAST_UPDATED);
    return saved ? new Date(saved) : null;
  });

  // Add loading states for each action
  const [actionLoading, setActionLoading] = useState({
    optimize: false,
    portfolio: false,
    coverLetter: false,
    interview: false,
    careerGuide: false
  });

  // Check if profile is complete (has either resume or chat data + job description)
  const isProfileComplete = (resumeData || chatData) && jobDescriptionId;

  // Fetch latest data from Supabase on component mount
  useEffect(() => {
    const fetchLatestData = async () => {
      try {
        // Fetch latest resume
        const resumeResponse = await axios.get(`/api/resumes/${userId}/latest`);
        if (resumeResponse.data) {
          const resumeData = {
            resumeId: resumeResponse.data.id,
            status: 'completed',
            updatedAt: resumeResponse.data.updated_at
          };
          setResumeData(resumeData);
          localStorage.setItem(STORAGE_KEYS.RESUME_DATA, JSON.stringify(resumeData));
        }

        // Fetch latest job description
        const jdResponse = await axios.get(`/api/job-descriptions/${userId}/latest`);
        if (jdResponse.data) {
          const jdData = jdResponse.data;
          setJobDescription({
            title: jdData.title,
            content: jdData.content
          });
          setJobDescriptionId(jdData.id);
          localStorage.setItem(STORAGE_KEYS.JOB_DESCRIPTION, JSON.stringify({
            title: jdData.title,
            content: jdData.content
          }));
          localStorage.setItem(STORAGE_KEYS.JOB_DESCRIPTION_ID, jdData.id);
        }

        // Update last updated timestamp
        const timestamp = new Date();
        setLastUpdated(timestamp);
        localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, timestamp.toISOString());
      } catch (error) {
        console.error('Error fetching latest data:', error);
        // Don't show error to user as this is a background sync
      }
    };

    fetchLatestData();
  }, [userId]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Update status messages based on the latest action
  const updateStatusMessages = () => {
    let profileStatus = null;
    let jobDescriptionStatus = null;

    if (resumeData) {
      profileStatus = 'Profile Updated via Resume';
    } else if (chatData) {
      profileStatus = 'Profile Updated via Chat';
    }

    if (jobDescriptionId) {
      jobDescriptionStatus = 'Job Description Updated';
    }

    // Call the parent component's status update function
    if (onStatusUpdate) {
      onStatusUpdate({
        lastUpdated,
        profileStatus,
        jobDescriptionStatus
      });
    }
  };

  // Update status whenever relevant data changes
  useEffect(() => {
    updateStatusMessages();
  }, [resumeData, chatData, jobDescriptionId, lastUpdated]);

  // Handle resume upload completion with persistence
  const handleResumeUploaded = async (data) => {
    try {
      const updatedData = {
        resumeId: data.resumeId,
        portfolioId: data.portfolioId,
        status: data.status,
        updatedAt: new Date().toISOString()
      };
      
      setResumeData(updatedData);
      localStorage.setItem(STORAGE_KEYS.RESUME_DATA, JSON.stringify(updatedData));
      
      // Update last updated timestamp
      const timestamp = new Date();
      setLastUpdated(timestamp);
      localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, timestamp.toISOString());

      // Clear chat data if it exists since resume is now the source of truth
      if (chatData) {
        setChatData(null);
        localStorage.removeItem(STORAGE_KEYS.CHAT_DATA);
      }

      setSnackbar({ 
        open: true, 
        message: 'Resume uploaded and saved successfully!', 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Error updating resume state:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error updating resume state. Please try refreshing the page.', 
        severity: 'error' 
      });
    }
  };

  // Handle chat completion with persistence
  const handleChatComplete = async (data) => {
    try {
      const response = await axios.post('/api/resumes/chat', {
        user_id: userId,
        content: data.content,
        title: data.title || 'Chat Profile'
      });

      const updatedData = {
        ...data,
        resumeId: response.data.id,
        updatedAt: new Date().toISOString()
      };
      
      setChatData(updatedData);
      localStorage.setItem(STORAGE_KEYS.CHAT_DATA, JSON.stringify(updatedData));
      
      // Update last updated timestamp
      const timestamp = new Date();
      setLastUpdated(timestamp);
      localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, timestamp.toISOString());

      // Clear resume data if it exists since chat is now the source of truth
      if (resumeData) {
        setResumeData(null);
        localStorage.removeItem(STORAGE_KEYS.RESUME_DATA);
      }

      setSnackbar({ 
        open: true, 
        message: 'Profile information saved successfully!', 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Error saving chat data:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error saving profile information. Please try again.', 
        severity: 'error' 
      });
    }
  };

  // Handle job description changes with persistence
  const handleJobDescriptionChange = (field) => (event) => {
    const newJobDescription = {
      ...jobDescription,
      [field]: event.target.value
    };
    setJobDescription(newJobDescription);
    localStorage.setItem(STORAGE_KEYS.JOB_DESCRIPTION, JSON.stringify(newJobDescription));
  };

  // Handle job description save with persistence
  const handleSaveJobDescription = async () => {
    try {
      // Save to Supabase
      const response = await axios.post('/api/job-descriptions', {
        user_id: userId,
        title: jobDescription.title,
        content: jobDescription.content
      });

      // Log the response for debugging
      console.log('Job description save response:', response.data);

      if (!response.data || !response.data.id) {
        throw new Error('Invalid response from server - no job description ID received');
      }

      // Update local state and storage
      const jdId = response.data.id;
      setJobDescriptionId(jdId);
      localStorage.setItem(STORAGE_KEYS.JOB_DESCRIPTION_ID, jdId);
      localStorage.setItem(STORAGE_KEYS.JOB_DESCRIPTION, JSON.stringify(jobDescription));

      // Update last updated timestamp without affecting resume state
      const timestamp = new Date();
      setLastUpdated(timestamp);
      localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, timestamp.toISOString());

      setSnackbar({ 
        open: true, 
        message: 'Job description saved successfully!', 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Error saving job description:', error);
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.detail || 'Error saving job description. Please try again.', 
        severity: 'error' 
      });
    }
  };

  // Handle job description clear
  const handleClearJobDescription = () => {
    setJobDescription({ title: '', content: '' });
    setJobDescriptionId(null);
    localStorage.removeItem(STORAGE_KEYS.JOB_DESCRIPTION);
    localStorage.removeItem(STORAGE_KEYS.JOB_DESCRIPTION_ID);
    setSnackbar({
      open: true,
      message: 'Job description cleared.',
      severity: 'success'
    });
  };

  // Clear profile data (useful for testing or resetting)
  const clearProfileData = async () => {
    try {
      // Clear from Supabase (optional - you might want to keep history)
      // await axios.delete(`/api/users/${userId}/profile-data`);
      
      // Clear from localStorage
      localStorage.removeItem(STORAGE_KEYS.RESUME_DATA);
      localStorage.removeItem(STORAGE_KEYS.CHAT_DATA);
      localStorage.removeItem(STORAGE_KEYS.JOB_DESCRIPTION);
      localStorage.removeItem(STORAGE_KEYS.JOB_DESCRIPTION_ID);
      localStorage.removeItem(STORAGE_KEYS.LAST_UPDATED);
      
      // Clear local state
      setResumeData(null);
      setChatData(null);
      setJobDescription({ title: '', content: '' });
      setJobDescriptionId(null);
      setLastUpdated(null);

      setSnackbar({ 
        open: true, 
        message: 'Profile data cleared successfully.', 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Error clearing profile data:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error clearing profile data. Please try again.', 
        severity: 'error' 
      });
    }
  };

  // Handle action buttons with improved error handling and loading states
  const handleAction = async (action) => {
    if (!isProfileComplete) {
      setSnackbar({ 
        open: true, 
        message: 'Please complete your profile and job description first.', 
        severity: 'warning' 
      });
      return;
    }

    // Get the correct resume ID (either from upload or chat)
    const resumeId = resumeData?.resumeId || chatData?.resumeId;
    if (!resumeId) {
      setSnackbar({ 
        open: true, 
        message: 'Resume information is required. Please upload a resume or complete the chat.', 
        severity: 'error' 
      });
      return;
    }

    // Set loading state for specific action
    setActionLoading(prev => ({ ...prev, [action]: true }));

    try {
      // Initialize request data object
      let requestData = {
        user_id: userId,
        job_description_id: jobDescriptionId,
        resume_id: resumeId
      };

      let endpoint = '';
      let successMessage = '';
      let errorMessage = '';
      let redirectPath = '';
      let responseData = null;

      switch (action) {
        case 'optimize':
          endpoint = '/api/resumes/optimize';
          successMessage = 'Resume optimization started.';
          errorMessage = 'Error starting resume optimization.';
          redirectPath = '/resume-optimizer';
          break;

        case 'portfolio':
          endpoint = '/api/portfolios/generate';
          requestData = {
            user_id: userId,
            title: 'My Portfolio',
            resume_id: resumeData?.resumeId,
            job_description_id: jobDescriptionId,
            chat_data: chatData
          };
          successMessage = 'Portfolio generation started.';
          errorMessage = 'Error starting portfolio generation.';
          redirectPath = '/portfolio-generator';
          break;

        case 'cover-letter':
          endpoint = '/api/cover-letters/generate';
          successMessage = 'Cover letter generation started.';
          errorMessage = 'Error starting cover letter generation.';
          redirectPath = '/cover-letter-writer';
          break;

        case 'interview':
          // Start a new interview and navigate to the mock interview tab
          responseData = await axios.post('/api/interviews/start', {
            user_id: userId,
            job_description_id: jobDescriptionId
          });
          
          // Navigate to the mock interview tab
          navigate('/mock-interviewer');
          
          // Dispatch event with the new interview ID
          window.dispatchEvent(new CustomEvent('interview-started', {
            detail: { interviewId: responseData.data.id }
          }));
          
          setSnackbar({
            open: true,
            message: 'Starting new interview...',
            severity: 'success'
          });
          break;

        case 'career-guide':
          endpoint = '/api/career-guides/generate';
          successMessage = 'Career guide generation started.';
          errorMessage = 'Error starting career guide generation.';
          redirectPath = '/career-guide';
          break;

        default:
          throw new Error('Invalid action');
      }

      // Log the request
      console.log(`Starting ${action} with data:`, requestData);
      
      const response = await axios.post(endpoint, requestData);
      responseData = response.data;
      
      // Log successful response
      console.log(`${action} response:`, responseData);
      
      // Show success message
      setSnackbar({ 
        open: true, 
        message: successMessage, 
        severity: 'success' 
      });

      // Handle redirect based on action and response
      if (redirectPath) {
        // For other actions, use the standard redirect
        navigate(redirectPath);
      }
    } catch (error) {
      console.error(`Error in ${action}:`, error);
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.detail || errorMessage, 
        severity: 'error' 
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [action]: false }));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Resume Input Section */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Profile Information
          </Typography>
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab label="Upload Resume" />
            <Tab label="Chat Input" />
          </Tabs>
          {activeTab === 0 ? (
            <ResumeUpload onResumeUploaded={handleResumeUploaded} userId={userId} />
          ) : (
            <ChatPortfolio onChatComplete={handleChatComplete} />
          )}
        </CardContent>
      </Card>

      {/* Job Description Section */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Job Description
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Job Title"
                value={jobDescription.title}
                onChange={handleJobDescriptionChange('title')}
                disabled={loading}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Job Description"
                multiline
                rows={6}
                value={jobDescription.content}
                onChange={handleJobDescriptionChange('content')}
                disabled={loading}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveJobDescription}
                  disabled={loading || !jobDescription.title.trim() || !jobDescription.content.trim()}
                  sx={{ flex: 1 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Save Job Description'}
                </Button>
                {(jobDescription.title || jobDescription.content) && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleClearJobDescription}
                    disabled={loading}
                    startIcon={<ClearIcon />}
                  >
                    Clear
                  </Button>
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Paper sx={{ p: 2, borderRadius: 3, boxShadow: 3 }}>
        <Typography variant="h6" gutterBottom>
          Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={() => handleAction('optimize')}
              disabled={!isProfileComplete || actionLoading.optimize}
              startIcon={actionLoading.optimize ? <CircularProgress size={20} /> : null}
            >
              {actionLoading.optimize ? 'Optimizing...' : 'Optimize Resume'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={() => handleAction('portfolio')}
              disabled={!isProfileComplete || actionLoading.portfolio}
              startIcon={actionLoading.portfolio ? <CircularProgress size={20} /> : null}
            >
              {actionLoading.portfolio ? 'Generating...' : 'Generate Portfolio'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={() => handleAction('cover-letter')}
              disabled={!isProfileComplete || actionLoading.coverLetter}
              startIcon={actionLoading.coverLetter ? <CircularProgress size={20} /> : null}
            >
              {actionLoading.coverLetter ? 'Generating...' : 'Write Cover Letter'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={() => handleAction('interview')}
              disabled={!isProfileComplete || actionLoading.interview}
              startIcon={actionLoading.interview ? <CircularProgress size={20} /> : null}
            >
              {actionLoading.interview ? 'Starting...' : 'Start Mock Interview'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={() => handleAction('career-guide')}
              disabled={!isProfileComplete || actionLoading.careerGuide}
              startIcon={actionLoading.careerGuide ? <CircularProgress size={20} /> : null}
            >
              {actionLoading.careerGuide ? 'Generating...' : 'Get Career Guide'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

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

export default Profile; 