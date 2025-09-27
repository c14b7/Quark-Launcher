import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Sprawdzenie czy działa w Electron
if (window.electronAPI) {
  console.log('Running in Electron environment');
  console.log('Electron version:', window.electronAPI.versions.electron);
} else {
  console.log('Running in browser environment');
}