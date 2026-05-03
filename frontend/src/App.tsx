import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import ThemeProviderWrapper from './theme/ThemeProvider';
import { Portal } from './Portal';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import ErrorBoundary from './components/ErrorBoundary';

export const App = () => (
  <Provider store={store}>
    <ThemeProviderWrapper>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <BrowserRouter>
          <ErrorBoundary>
            <Portal />
          </ErrorBoundary>
          <ToastContainer position="top-right" autoClose={4000} />
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProviderWrapper>
  </Provider>
);
