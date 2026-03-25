function resolveApiBase() {
  // Detect if running on localhost
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isLocal) {
      // On localhost: return empty string so Vite proxy handles /api/* routes
      // The proxy in vite.config.js routes /api/... → http://localhost:8000
      return '';
    }
  }
  
  // Production: return the Render backend URL
  return 'https://envirosync-backend.onrender.com';
}

export const API_BASE = resolveApiBase();
