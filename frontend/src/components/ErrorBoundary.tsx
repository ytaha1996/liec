import React from 'react';
import { Box, Button, Typography } from '@mui/material';

interface State {
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 4, maxWidth: 720, mx: 'auto', textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Something went wrong</Typography>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            The page hit an unexpected error. You can reload to continue, or contact support if the issue persists.
          </Typography>
          <Typography variant="caption" component="pre" sx={{ mb: 3, p: 2, backgroundColor: 'grey.100', borderRadius: 1, textAlign: 'left', overflow: 'auto' }}>
            {this.state.error.message}
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>Reload page</Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
