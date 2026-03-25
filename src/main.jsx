// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ProjectProvider } from './context/ProjectContext';

// IMPORT GLOBAL STYLES HERE (VERY IMPORTANT!)
import './styles/variable.css';
import './styles/global.css';
import './styles/pages-overrides.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ProjectProvider>
      <App />
    </ProjectProvider>
  </React.StrictMode>,
);