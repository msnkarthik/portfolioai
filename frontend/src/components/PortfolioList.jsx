import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// PortfolioList component displays user's portfolios with actions
function PortfolioList({ refresh }) {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();

  // Hardcoded user_id for demo; replace with real user auth in production
  const USER_ID = "test-user-123";

  // Fetch portfolios from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Backend expects user_id in the path
        const res = await axios.get(`/api/users/${USER_ID}/portfolios`);
        setPortfolios(res.data || []);
      } catch (err) {
        setSnackbar({ open: true, message: 'Failed to fetch portfolios.', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refresh]);

  // Handle export action
  const handleExport = async (id) => {
    try {
      // Fetch HTML and CSS from backend
      const exportRes = await axios.get(`/api/portfolios/${id}/export`);
      let { html, css } = exportRes.data;
      // Inject CSS into a <style> tag in the <head> of the HTML
      if (css) {
        // Try to insert before </head>, or at the top if not found
        if (html.includes('</head>')) {
          html = html.replace('</head>', `<style>\n${css}\n</style>\n</head>`);
        } else {
          html = `<style>\n${css}\n</style>\n` + html;
        }
      }
      // Download the combined HTML file
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const htmlUrl = window.URL.createObjectURL(htmlBlob);
      const htmlLink = document.createElement('a');
      htmlLink.href = htmlUrl;
      htmlLink.setAttribute('download', `portfolio_${id}.html`);
      document.body.appendChild(htmlLink);
      htmlLink.click();
      htmlLink.parentNode.removeChild(htmlLink);
    } catch (err) {
      setSnackbar({ open: true, message: 'Export failed.', severity: 'error' });
    }
  };

  // Handle view action
  const handleView = async (id) => {
    try {
      // Fetch the portfolio HTML from the backend
      const res = await axios.get(`/api/portfolios/${id}`);
      const html = res.data.html || '<p>No portfolio found.</p>';
      // Open in a new tab as a data URL
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load portfolio.', severity: 'error' });
    }
  };

  return (
    <Box maxWidth={900} mx="auto" mt={4}>
      <Card sx={{ p: 2, borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Portfolio List
          </Typography>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {portfolios.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.title || `${p.id.slice(0, 8)}...`}</TableCell>
                      <TableCell>{p.status}</TableCell>
                      <TableCell>{new Date(p.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button size="small" color="primary" startIcon={<VisibilityIcon />} onClick={() => handleView(p.id)}>
                          View
                        </Button>
                        <Button size="small" color="primary" startIcon={<DownloadIcon />} onClick={() => handleExport(p.id)}>
                          Export
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default PortfolioList; 