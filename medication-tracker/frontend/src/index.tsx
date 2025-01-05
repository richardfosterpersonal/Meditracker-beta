import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import App from './App';
import { store } from './store';
import theme from './theme';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#333',
              color: '#fff',
            },
          }}
        />
        <App />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);

// Register service worker for PWA support
serviceWorkerRegistration.register({
  onSuccess: (registration) => {
    console.log('PWA registration successful');
    
    // Set up background sync
    if ('sync' in registration) {
      registration.sync.register('sync-changes').catch(console.error);
    }

    // Set up periodic sync for emergency contacts
    if ('periodicSync' in registration) {
      (registration.periodicSync as any).register('sync-emergency', {
        minInterval: 24 * 60 * 60 * 1000 // 24 hours
      }).catch(console.error);
    }

    // Listen for sync messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'sync-status') {
        switch (event.data.status) {
          case 'started':
            toast.loading('Syncing offline changes...');
            break;
          case 'completed':
            toast.success('All changes synced successfully');
            break;
          case 'error':
            toast.error('Some changes failed to sync');
            break;
        }
      }
    });
  },
  onUpdate: (registration) => {
    // Notify user of available update
    const shouldUpdate = window.confirm(
      'A new version of the app is available. Would you like to update now?'
    );
    if (shouldUpdate && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  },
});
