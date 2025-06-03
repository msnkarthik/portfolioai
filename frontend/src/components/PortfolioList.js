import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// PortfolioList component displays user's portfolios with actions
function PortfolioList() {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();

  // Fetch portfolios from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/portfolio/list');
        setPortfolios(res.data.portfolios || []);
      } catch (err) {
        setSnackbar({ open: true, message: 'Failed to fetch portfolios.', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle export action
  const handleExport = async (id) => {
    try {
      const res = await axios.get(`/api/portfolio/export/${id}`, { responseType: 'blob' });
      // Download the exported file
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `portfolio_${id}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setSnackbar({ open: true, message: 'Export failed.', severity: 'error' });
    }
  };

  // Handle view action
  const handleView = (id) => {
    navigate(`/portfolio/${id}`);
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
                    <TableCell>ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {portfolios.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.id}</TableCell>
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