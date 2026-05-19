import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../helpers/usePageTitle';

const NotFoundPage = () => {
  usePageTitle('Not Found');
  const navigate = useNavigate();
  return (
    <Box sx={{ p: 6, textAlign: 'center' }}>
      <Typography variant="h2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1 }}>404</Typography>
      <Typography variant="h5" sx={{ mb: 3 }}>Page not found</Typography>
      <Button variant="contained" onClick={() => navigate('/ops/dashboard')}>Go to Dashboard</Button>
    </Box>
  );
};

export default NotFoundPage;
