import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DataService } from '@/api/DataService';
import { store } from '@/redux/store';
import App from './App.tsx';
import './theme/globals.css';

// Set the API base URL before any component mounts so the first request
// already has it wired up.
DataService.setBaseUrl(
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    'https://liec-shipment.azurewebsites.net',
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <TooltipProvider delayDuration={200}>
          <App />
          <Toaster richColors closeButton position="top-right" />
        </TooltipProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
