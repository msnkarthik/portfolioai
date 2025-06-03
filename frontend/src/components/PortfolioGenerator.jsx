import React from 'react';
import { Box, Card, CardContent, Typography, Tabs, Tab, Divider } from '@mui/material';
import ResumeUpload from './ResumeUpload.jsx';
import ChatPortfolio from './ChatPortfolio.jsx';
import PortfolioList from './PortfolioList.jsx';

// Main component for AI Portfolio Generator
function PortfolioGenerator() {
  const [tab, setTab] = React.useState(0);
  // State to trigger portfolio list refresh
  const [refreshPortfolios, setRefreshPortfolios] = React.useState(0);

  // Callback to trigger refresh after portfolio creation
  const handlePortfolioCreated = () => {
    setRefreshPortfolios((r) => r + 1);
  };

  return (
    <Box maxWidth={1000} mx="auto" mt={4}>
      {/* Upper section: Portfolio creation workflow */}
      <Card sx={{ p: 2, borderRadius: 3, boxShadow: 3, mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom fontWeight={700} color="primary">
            Create Your Portfolio
          </Typography>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Resume Upload" />
            <Tab label="Q&A Chat" />
          </Tabs>
          <Divider sx={{ mb: 2 }} />
          {tab === 0 && <ResumeUpload onPortfolioCreated={handlePortfolioCreated} />}
          {tab === 1 && <ChatPortfolio onPortfolioCreated={handlePortfolioCreated} />}
        </CardContent>
      </Card>
      {/* Lower section: Historical portfolios table */}
      <PortfolioList refresh={refreshPortfolios} />
    </Box>
  );
}

export default PortfolioGenerator; 