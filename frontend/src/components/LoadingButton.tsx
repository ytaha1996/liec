import { Button, ButtonProps, CircularProgress } from '@mui/material';

interface LoadingButtonProps extends Omit<ButtonProps, 'startIcon'> {
  loading?: boolean;
  loadingText?: string;
  startIcon?: ButtonProps['startIcon'];
}

// Drop-in MUI Button replacement that shows a spinner while a mutation is
// pending. Wrap any `<Button>` driven by `useMutation` to give users visible
// feedback instead of just disabling the button.
const LoadingButton = ({
  loading,
  loadingText,
  startIcon,
  disabled,
  children,
  ...rest
}: LoadingButtonProps) => (
  <Button
    {...rest}
    disabled={disabled || loading}
    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
  >
    {loading && loadingText ? loadingText : children}
  </Button>
);

export default LoadingButton;
