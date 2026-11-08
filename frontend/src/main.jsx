import React from 'react';
import { BASE } from './lib/base.js';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={BASE || undefined}><App /></BrowserRouter>
  </React.StrictMode>,
);
