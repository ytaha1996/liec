import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import ThemeProviderWrapper from './theme/ThemeProvider';
import { Portal } from './Portal';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useMediaQuery, useTheme } from '@mui/material';
import ErrorBoundary from './components/ErrorBoundary';

// Toast lives inside ThemeProvider so it can read the breakpoint. On phones
// the top-right position overlaps the hamburger menu; top-center reads better.
const ResponsiveToastContainer = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <ToastContainer
      position={isMobile ? 'top-center' : 'top-right'}
      autoClose={4000}
      style={{ zIndex: 99999 }}
    />
  );
};

export const App = () => (
  <Provider store={store}>
    <ThemeProviderWrapper>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <BrowserRouter>
          <ErrorBoundary>
            <Portal />
          </ErrorBoundary>
          <ResponsiveToastContainer />
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProviderWrapper>
  </Provider>
);
