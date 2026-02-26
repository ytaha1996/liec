import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import ThemeProviderWrapper from './theme/ThemeProvider';
import { Portal } from './Portal';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

export const App = () => (
  <Provider store={store}>
    <ThemeProviderWrapper>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <BrowserRouter>
          <Portal />
          <ToastContainer position="top-right" autoClose={4000} />
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProviderWrapper>
  </Provider>
);
