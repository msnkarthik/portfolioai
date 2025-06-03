import React, { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme.js';
import { CssBaseline, Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Divider, Toolbar, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import WebIcon from '@mui/icons-material/Web';
import MailIcon from '@mui/icons-material/Mail';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import SchoolIcon from '@mui/icons-material/School';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Profile from './components/Profile';
import ResumeOptimizer from './components/ResumeOptimizer';
import PortfolioGenerator from './components/PortfolioGenerator';
import CoverLetterWriter from './components/CoverLetterWriter';
import MockInterviewer from './components/MockInterviewer';
import CareerGuide from './components/CareerGuide';
import StatusHeader from './components/StatusHeader';

const drawerWidth = 240;

function Sidebar() {
  const location = useLocation();
  const navItems = [
    { text: 'Profile', icon: <PersonIcon />, path: '/profile' },
    { text: 'Resume Optimizer', icon: <DescriptionIcon />, path: '/resume-optimizer' },
    { text: 'Portfolio Generator', icon: <WebIcon />, path: '/portfolio-generator' },
    { text: 'Cover Letter Writer', icon: <MailIcon />, path: '/cover-letter-writer' },
    { text: 'Mock Interviewer', icon: <RecordVoiceOverIcon />, path: '/mock-interviewer' },
    { text: 'Career Guide', icon: <SchoolIcon />, path: '/career-guide' },
  ];
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { 
          width: drawerWidth, 
          boxSizing: 'border-box', 
          background: theme.palette.background.paper,
          borderRight: `1px solid ${theme.palette.divider}`,
          position: 'fixed',
          height: 'calc(100vh - 48px)', // Subtract StatusHeader height
          top: '48px', // Height of the StatusHeader
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <List sx={{ flex: 1 }}>
        {navItems.map((item) => (
          <ListItem 
            button 
            key={item.text} 
            component={Link} 
            to={item.path} 
            selected={location.pathname === item.path}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: 'action.hover',
                transform: 'translateX(4px)',
              },
              '&.Mui-selected': {
                backgroundColor: 'primary.dark',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                  transform: 'translateX(4px)',
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  backgroundColor: 'primary.main',
                  borderRadius: '0 4px 4px 0',
                },
              },
            }}
          >
            <ListItemIcon sx={{ 
              color: location.pathname === item.path ? 'primary.contrastText' : 'inherit',
              minWidth: 40,
              transition: 'color 0.2s ease-in-out',
            }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text} 
              primaryTypographyProps={{
                fontWeight: location.pathname === item.path ? 600 : 400,
                color: location.pathname === item.path ? 'primary.contrastText' : 'inherit',
                transition: 'all 0.2s ease-in-out',
              }}
            />
          </ListItem>
        ))}
      </List>
      <Box
        sx={{
          p: 2,
          textAlign: 'center',
          color: 'text.secondary',
          fontSize: '0.75rem',
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
          Made with Love and AI by
        </Typography>
        <Typography variant="caption" display="block" sx={{ fontWeight: 500 }}>
          MSN Karthik
        </Typography>
      </Box>
    </Drawer>
  );
}

function App() {
  const [userId] = useState("47ab26ba-14ae-4b55-83b4-4e377f9a3ed0");
  const [status, setStatus] = useState({
    lastUpdated: null,
    profileStatus: null,
    jobDescriptionStatus: null
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh',
          bgcolor: 'background.default',
          overflow: 'hidden' // Prevent horizontal scroll
        }}>
          <StatusHeader
            lastUpdated={status.lastUpdated}
            profileStatus={status.profileStatus}
            jobDescriptionStatus={status.jobDescriptionStatus}
          />
          <Box sx={{ 
            display: 'flex', 
            flex: 1,
            mt: '48px', // Height of StatusHeader
            overflow: 'hidden' // Prevent horizontal scroll
          }}>
            <Sidebar />
            <Box 
              component="main" 
              sx={{ 
                flex: 1,
                bgcolor: 'background.default',
                minHeight: 'calc(100vh - 48px)',
                p: 3,
                overflow: 'auto' // Allow vertical scroll if needed
              }}
            >
              <Routes>
                <Route path="/" element={<Profile userId={userId} onStatusUpdate={setStatus} />} />
                <Route path="/profile" element={<Profile userId={userId} onStatusUpdate={setStatus} />} />
                <Route path="/resume-optimizer" element={<ResumeOptimizer userId={userId} />} />
                <Route path="/portfolio-generator" element={<PortfolioGenerator userId={userId} />} />
                <Route path="/cover-letter-writer" element={<CoverLetterWriter userId={userId} />} />
                <Route path="/mock-interviewer" element={<MockInterviewer userId={userId} />} />
                <Route path="/career-guide" element={<CareerGuide userId={userId} />} />
              </Routes>
            </Box>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App; 