import React from 'react';
import ReactDOM from 'react-dom/client';
import 'soft-dark-ui/style.css';
import 'soft-dark-ui/app.css';
import { ToastProvider } from 'soft-dark-ui';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider duration={2600}>
      <App />
    </ToastProvider>
  </React.StrictMode>,
);
