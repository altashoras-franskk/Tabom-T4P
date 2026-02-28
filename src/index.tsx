import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { I18nProvider } from './i18n/context';
import './styles/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);
