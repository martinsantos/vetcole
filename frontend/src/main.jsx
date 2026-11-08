import React from 'react';
import { BASE, CLAUDE } from './lib/base.js';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {CLAUDE ? <MemoryRouter><App /></MemoryRouter> : <BrowserRouter basename={BASE || undefined}><App /></BrowserRouter>}
  </React.StrictMode>,
);
