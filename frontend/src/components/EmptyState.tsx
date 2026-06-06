import { Box, Button, Typography } from '@mui/material';

interface Props {
  message?: string;
  hint?: string;
  action?: { label: string; onClick: () => void };
}

const EmptyState = ({ message = 'No records found.', hint, action }: Props) => (
  <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
    <Typography variant="body1">{message}</Typography>
    {hint && <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>{hint}</Typography>}
    {action && (
      <Button onClick={action.onClick} variant="contained" sx={{ mt: 2 }}>
        {action.label}
      </Button>
    )}
  </Box>
);

export default EmptyState;
