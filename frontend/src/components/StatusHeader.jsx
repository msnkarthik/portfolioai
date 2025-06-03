import React from 'react';
import { AppBar, Toolbar, Typography, Box, Chip, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled components for better organization
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: theme.shadows[2],
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const StatusChip = styled(Chip)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  height: 24,
  '& .MuiChip-label': {
    fontSize: '0.75rem',
    padding: '0 8px',
  },
}));

const StatusHeader = ({ lastUpdated, profileStatus, jobDescriptionStatus }) => {
  return (
    <StyledAppBar position="fixed">
      <Toolbar variant="dense" sx={{ justifyContent: 'space-between', minHeight: '48px !important' }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 0 }}>
          PortfolioAI
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              Last Updated: {new Date(lastUpdated).toLocaleString()}
            </Typography>
          )}
          {profileStatus && (
            <StatusChip
              label={profileStatus}
              color="success"
              size="small"
            />
          )}
          {jobDescriptionStatus && (
            <StatusChip
              label={jobDescriptionStatus}
              color="success"
              size="small"
            />
          )}
        </Box>
      </Toolbar>
    </StyledAppBar>
  );
};

export default StatusHeader; 