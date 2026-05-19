import { Box, Typography } from '@mui/material';

interface Props {
  message?: string;
  hint?: string;
}

const EmptyState = ({ message = 'No records found.', hint }: Props) => (
  <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
    <Typography variant="body1">{message}</Typography>
    {hint && <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>{hint}</Typography>}
  </Box>
);

export default EmptyState;
