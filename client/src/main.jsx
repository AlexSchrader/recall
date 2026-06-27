import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './installPrompt.js'; // register beforeinstallprompt capture early
import { initPWA } from './pwa.js';
import App from './App.jsx';

initPWA(); // register the service worker (precache shell + offline study data)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
