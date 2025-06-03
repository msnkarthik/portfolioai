import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme.js';
import { CssBaseline, Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import PortfolioGenerator from './components/PortfolioGenerator.jsx';

const drawerWidth = 220;

function Sidebar() {
  const location = useLocation();
  const navItems = [
    { text: 'AI Portfolio Generator', icon: <AutoAwesomeIcon />, path: '/' },
  ];
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', background: theme.palette.background.paper },
      }}
    >
      <Toolbar>
        <Typography variant="h6" color="primary" fontWeight={700}>
          PortfolioAI
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem button key={item.text} component={Link} to={item.path} selected={location.pathname === item.path}>
            <ListItemIcon sx={{ color: 'primary.main' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex' }}>
          <Sidebar />
          <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
            <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Toolbar>
                <Typography variant="h6" color="text.primary" fontWeight={700}>
                  PortfolioAI
                </Typography>
              </Toolbar>
            </AppBar>
            <Routes>
              <Route path="/" element={<PortfolioGenerator />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App; 