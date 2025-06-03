import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Alert,
  Snackbar,
  Divider,
  Collapse,
  IconButton as MuiIconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import DataTable from './common/DataTable';

// Configure axios defaults
axios.defaults.timeout = 30000; // 30 seconds timeout
axios.defaults.headers.common['Content-Type'] = 'application/json';

function MockInterviewer({ userId }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [interview, setInterview] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [interviewFeedback, setInterviewFeedback] = useState(null);
  const [expandedFeedback, setExpandedFeedback] = useState(null);

  // Add state to track if we're handling a new interview from profile
  const [isNewInterviewFromProfile, setIsNewInterviewFromProfile] = useState(false);

  // Columns for the interview history table
  const columns = [
    { 
      id: 'created_at', 
      label: 'Date', 
      render: (row) => new Date(row.created_at).toLocaleString()
    },
    { 
      id: 'job_role', 
      label: 'Job Title', 
      render: (row) => row.job_role || 'N/A'
    },
    { 
      id: 'score', 
      label: 'Score', 
      render: (row) => row.score ? `${row.score}/100` : 'N/A'
    },
    {
      id: 'feedback',
      label: 'Feedback',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {row.feedback ? (
            <MuiIconButton
              onClick={(e) => {
                e.stopPropagation();
                setExpandedFeedback(expandedFeedback === row.id ? null : row.id);
              }}
              size="small"
              color="primary"
            >
              {expandedFeedback === row.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              <Typography variant="body2" sx={{ ml: 0.5 }}>
                {expandedFeedback === row.id ? 'Hide Feedback' : 'View Feedback'}
              </Typography>
            </MuiIconButton>
          ) : (
            <Typography variant="body2" color="text.secondary">No feedback available</Typography>
          )}
        </Box>
      )
    }
  ];

  // Table header style
  const tableHeaderSx = {
    backgroundColor: (theme) => theme.palette.grey[900], // dark grey
    color: (theme) => theme.palette.getContrastText(theme.palette.grey[900]),
  };

  // Feedback accordion style
  const feedbackAccordionSx = {
    backgroundColor: (theme) => theme.palette.grey[900],
    color: (theme) => theme.palette.getContrastText(theme.palette.grey[900]),
    borderRadius: 0,  // Remove border radius for full-width look
    p: 2,
    width: '100%'
  };

  useEffect(() => {
    // Start a new interview when the component mounts
    startNewInterview();
    fetchHistory();

    // Add event listener for interview-started event
    const handleInterviewStarted = (event) => {
      const { interviewId } = event.detail;
      setIsNewInterviewFromProfile(true);
      fetchInterview(interviewId);
    };

    window.addEventListener('interview-started', handleInterviewStarted);

    // Cleanup
    return () => {
      window.removeEventListener('interview-started', handleInterviewStarted);
    };
  }, []); // Empty dependency array since we only want this to run once on mount

  const startNewInterview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First check if we have a job description
      let jobDescriptionId;
      try {
        const jdResponse = await axios.get(`/api/job-descriptions/${userId}/latest`);
        if (!jdResponse.data) {
          throw new Error('No job description found. Please add a job description first.');
        }
        jobDescriptionId = jdResponse.data.id;
      } catch (err) {
        if (err.code === 'ECONNABORTED') {
          throw new Error('Connection timed out while fetching job description. Please try again.');
        }
        throw new Error('Failed to fetch job description. Please ensure you have added a job description.');
      }

      // Then start the interview
      try {
        const response = await axios.post('/api/interviews/start', {
          user_id: userId,
          job_description_id: jobDescriptionId
        });
        
        if (!response.data) {
          throw new Error('No interview data received from server');
        }
        
        setInterview(response.data);
        setCurrentQuestionIndex(0);
        setShowAllQuestions(false);
        setInterviewFeedback(null);
        setIsNewInterviewFromProfile(false);
      } catch (err) {
        if (err.code === 'ECONNABORTED') {
          throw new Error('Connection timed out while starting interview. Please try again.');
        }
        throw new Error(err.response?.data?.detail || 'Failed to start interview. Please try again.');
      }
    } catch (err) {
      console.error('Error starting interview:', err);
      setError(err.message || 'Failed to start interview');
      setSnackbar({
        open: true,
        message: err.message || 'Error starting interview. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInterview = async (interviewId) => {
    if (!interviewId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/api/interviews/${interviewId}`);
      if (!response.data) {
        throw new Error('No interview data received from server');
      }
      
      const interviewData = response.data;
      setInterview(interviewData);
      
      // Find the first unanswered question
      const firstUnansweredIndex = interviewData.questions.findIndex(q => !q.answer);
      
      // If all questions are answered and we have a score, show the complete view
      if (firstUnansweredIndex === -1 && interviewData.score) {
        setShowAllQuestions(true);
        setCurrentQuestionIndex(interviewData.questions.length);
        await generateInterviewFeedback(interviewData);
      } else {
        setShowAllQuestions(false);
        setCurrentQuestionIndex(firstUnansweredIndex >= 0 ? firstUnansweredIndex : interviewData.questions.length);
        setInterviewFeedback(null);
      }
    } catch (err) {
      console.error('Error fetching interview:', err);
      const errorMessage = err.code === 'ECONNABORTED' 
        ? 'Connection timed out while loading interview. Please try again.'
        : err.response?.data?.detail || 'Failed to load interview';
      
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

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      console.log('Fetching interview history for user:', userId);
      
      // Log the exact URL being called
      const url = `/api/interviews/scores/${userId}`;
      console.log('Making request to:', url);
      
      const response = await axios.get(url);
      console.log('Raw interview history response:', response);
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      console.log('Interview history data:', response.data);
      
      if (!response.data) {
        console.warn('No interview history data received');
        setHistory([]);
      } else if (!Array.isArray(response.data)) {
        console.error('Interview history data is not an array:', response.data);
        setHistory([]);
      } else {
        console.log(`Setting history with ${response.data.length} records:`, response.data);
        setHistory(response.data);
      }
    } catch (err) {
      console.error('Error fetching interview history:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        headers: err.response?.headers,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          headers: err.config?.headers
        }
      });
      
      // Show more specific error message to user
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch interview history';
      setSnackbar({
        open: true,
        message: `Error: ${errorMessage}. Please try refreshing the page.`,
        severity: 'error'
      });
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const generateInterviewFeedback = async (interviewData) => {
    try {
      // Show loading state for feedback
      setSnackbar({
        open: true,
        message: 'Generating detailed feedback...',
        severity: 'info'
      });

      const response = await axios.post('/api/interviews/feedback', {
        interview_id: interviewData.id,
        questions: interviewData.questions,
        score: interviewData.score
      });
      
      if (response.data.feedback) {
        setInterviewFeedback(response.data.feedback);
        // Show feedback ready notification
        setSnackbar({
          open: true,
          message: 'Detailed feedback is ready!',
          severity: 'success'
        });
      } else {
        throw new Error('No feedback received from server');
      }
    } catch (err) {
      console.error('Error generating feedback:', err);
      // Fallback to a simple message if feedback generation fails
      const feedbackMessage = 
        `Interview completed! Your score: ${interviewData.score}/100\n\n` +
        (interviewData.score >= 70 
          ? 'Congratulations on completing the interview! Your performance was strong. ' +
            'You demonstrated good understanding of the technical concepts and provided clear explanations.'
          : 'Thank you for completing the interview. While your score indicates room for improvement, ' +
            'this is a great opportunity to identify areas to focus on for future interviews.');
      
      setInterviewFeedback(feedbackMessage);
      setSnackbar({
        open: true,
        message: 'Feedback generated with basic analysis. Some detailed feedback features may be limited.',
        severity: 'warning'
      });
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !interview) return;

    try {
      setSending(true);
      const response = await axios.post('/api/interviews/answer', {
        interview_id: interview.id,
        question_index: currentQuestionIndex,
        answer: message.trim()
      });

      if (!response.data) {
        throw new Error('No response received from server');
      }

      // Update the interview state with the new answer
      const updatedInterview = { ...interview };
      updatedInterview.questions[currentQuestionIndex].answer = message.trim();
      setInterview(updatedInterview);

      // Clear the message input
      setMessage('');

      // If this was the last question, show completion message and handle scoring
      if (currentQuestionIndex === interview.questions.length - 1) {
        // Show completion message
        setSnackbar({
          open: true,
          message: 'Thank you for attending the interview. Your interview score will be updated in the table below. All the best.',
          severity: 'info',
          autoHideDuration: 8000 // Show for 8 seconds
        });

        // If we got a score in the response, update the UI
        if (response.data.score !== undefined) {
          // Update the interview with the score
          updatedInterview.score = response.data.score;
          setInterview(updatedInterview);
          
          // Show all questions and generate feedback
          setShowAllQuestions(true);
          await generateInterviewFeedback(updatedInterview);
          
          // Refresh the history to show the new score
          await fetchHistory();

          // Show score notification
          setSnackbar({
            open: true,
            message: `Interview completed! Your score: ${response.data.score}/100`,
            severity: 'success',
            autoHideDuration: 6000
          });
        } else if (response.data.error) {
          // Handle scoring error
          setSnackbar({
            open: true,
            message: 'Error processing interview results. Please check the history table for your score.',
            severity: 'warning'
          });
        }
      } else {
        // Move to the next question
        setCurrentQuestionIndex(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error sending answer:', err);
      const errorMessage = err.code === 'ECONNABORTED'
        ? 'Connection timed out while submitting answer. Please try again.'
        : err.response?.data?.detail || 'Failed to submit answer';
      
      setError(errorMessage);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleView = (row) => {
    // Update the URL without a full page reload
    window.history.pushState({}, '', `/mock-interviewer/${row.id}`);
    fetchInterview();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="contained" onClick={startNewInterview}>Start New Interview</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', margin: '0 auto' }}>
      {/* Interview Chat Section */}
      <Paper sx={{ mb: 4, borderRadius: 2 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h5">Mock Interview</Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={startNewInterview}
            variant="outlined"
            disabled={loading}
          >
            {loading ? 'Starting...' : 'Start New Interview'}
          </Button>
        </Box>

        {interview && (
          <Box sx={{ height: '50vh', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              <List>
                {showAllQuestions ? (
                  // Show all questions and answers after completion
                  <>
                    {interview.questions.map((q, index) => (
                      <ListItem
                        key={index}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          width: '100%',
                          mb: 2,
                          px: 2
                        }}
                      >
                        {/* Question - Left aligned */}
                        <Box sx={{ 
                          display: 'flex', 
                          alignSelf: 'flex-start',
                          maxWidth: '80%',
                          mb: 1
                        }}>
                          <Avatar sx={{ mr: 1, bgcolor: 'grey.700' }}>
                            <BotIcon />
                          </Avatar>
                          <Typography
                            variant="body1"
                            sx={{
                              bgcolor: 'grey.700',
                              color: 'white',
                              p: 2,
                              borderRadius: 2,
                              wordBreak: 'break-word'
                            }}
                          >
                            {q.question}
                          </Typography>
                        </Box>

                        {/* Answer - Right aligned */}
                        <Box sx={{ 
                          display: 'flex', 
                          alignSelf: 'flex-end',
                          maxWidth: '80%',
                          flexDirection: 'row-reverse'
                        }}>
                          <Avatar sx={{ ml: 1, bgcolor: 'success.main' }}>
                            <PersonIcon />
                          </Avatar>
                          <Typography
                            variant="body1"
                            sx={{
                              bgcolor: 'success.main',
                              color: 'white',
                              p: 2,
                              borderRadius: 2,
                              wordBreak: 'break-word'
                            }}
                          >
                            {q.answer}
                          </Typography>
                        </Box>
                      </ListItem>
                    ))}
                    {interviewFeedback && (
                      <ListItem sx={{ mt: 2, px: 2 }}>
                        <ListItemText
                          primary={
                            <Alert 
                              severity={interview.score >= 70 ? "success" : "info"} 
                              sx={{ 
                                '& .MuiAlert-message': { 
                                  whiteSpace: 'pre-line' 
                                } 
                              }}
                            >
                              {interviewFeedback}
                            </Alert>
                          }
                        />
                      </ListItem>
                    )}
                  </>
                ) : (
                  // Show only current question and previous Q&A
                  <>
                    {/* Show previous questions and answers */}
                    {interview.questions.slice(0, currentQuestionIndex).map((q, index) => (
                      <ListItem
                        key={index}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          width: '100%',
                          mb: 2,
                          px: 2
                        }}
                      >
                        {/* Question - Left aligned */}
                        <Box sx={{ 
                          display: 'flex', 
                          alignSelf: 'flex-start',
                          maxWidth: '80%',
                          mb: 1
                        }}>
                          <Avatar sx={{ mr: 1, bgcolor: 'grey.700' }}>
                            <BotIcon />
                          </Avatar>
                          <Typography
                            variant="body1"
                            sx={{
                              bgcolor: 'grey.700',
                              color: 'white',
                              p: 2,
                              borderRadius: 2,
                              wordBreak: 'break-word'
                            }}
                          >
                            {q.question}
                          </Typography>
                        </Box>

                        {/* Answer - Right aligned */}
                        <Box sx={{ 
                          display: 'flex', 
                          alignSelf: 'flex-end',
                          maxWidth: '80%',
                          flexDirection: 'row-reverse'
                        }}>
                          <Avatar sx={{ ml: 1, bgcolor: 'success.main' }}>
                            <PersonIcon />
                          </Avatar>
                          <Typography
                            variant="body1"
                            sx={{
                              bgcolor: 'success.main',
                              color: 'white',
                              p: 2,
                              borderRadius: 2,
                              wordBreak: 'break-word'
                            }}
                          >
                            {q.answer}
                          </Typography>
                        </Box>
                      </ListItem>
                    ))}
                    {/* Show current question only if there are more questions to answer */}
                    {currentQuestionIndex < interview.questions.length && (
                      <ListItem
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          width: '100%',
                          mb: 2,
                          px: 2
                        }}
                      >
                        {/* Question - Left aligned */}
                        <Box sx={{ 
                          display: 'flex', 
                          alignSelf: 'flex-start',
                          maxWidth: '80%'
                        }}>
                          <Avatar sx={{ mr: 1, bgcolor: 'grey.700' }}>
                            <BotIcon />
                          </Avatar>
                          <Typography
                            variant="body1"
                            sx={{
                              bgcolor: 'grey.700',
                              color: 'white',
                              p: 2,
                              borderRadius: 2,
                              wordBreak: 'break-word'
                            }}
                          >
                            {interview.questions[currentQuestionIndex].question}
                          </Typography>
                        </Box>
                      </ListItem>
                    )}
                  </>
                )}
              </List>
            </Box>

            {/* Show input box only if there are more questions to answer */}
            {!showAllQuestions && currentQuestionIndex < interview.questions.length && (
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your answer..."
                    disabled={sending}
                  />
                  <IconButton
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={sending || !message.trim()}
                  >
                    {sending ? <CircularProgress size={24} /> : <SendIcon />}
                  </IconButton>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Interview History Section */}
      <Paper sx={{ borderRadius: 2, mt: 4, width: '100%' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Interview History</Typography>
        </Box>
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : history.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">No interview history available</Typography>
            </Box>
          ) : (
            <Table sx={{ width: '100%' }}>
              <TableHead>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell 
                      key={col.id} 
                      sx={{
                        ...tableHeaderSx,
                        width: col.width || 'auto'  // Use defined width or auto
                      }}
                      align="left"
                    >
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((row) => (
                  <React.Fragment key={row.id}>
                    <TableRow
                      sx={{
                        '&:hover': { bgcolor: 'action.hover' },
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      {columns.map((column) => (
                        <TableCell
                          key={column.id}
                          sx={{
                            width: column.width || 'auto',
                            px: 2
                          }}
                        >
                          {column.render(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                    {/* Feedback Accordion Row */}
                    {expandedFeedback === row.id && (
                      <TableRow>
                        <TableCell 
                          colSpan={columns.length} 
                          sx={{ 
                            p: 0, 
                            border: 0,
                            backgroundColor: (theme) => theme.palette.grey[900]
                          }}
                        >
                          <Collapse in={expandedFeedback === row.id} timeout="auto" unmountOnExit>
                            <Box sx={feedbackAccordionSx}>
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                {row.feedback || 'No feedback available.'}
                              </Typography>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.autoHideDuration || 6000}
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

export default MockInterviewer; 