import React from 'react';
import { Box, CircularProgress } from '@mui/material';

interface LoaderProps {
  size?: number;
}

const Loader: React.FC<LoaderProps> = ({ size = 40 }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100vh',
    }}
  >
    <CircularProgress size={size} />
  </Box>
);

export default Loader;
