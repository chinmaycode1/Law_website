/**
 * Runtime API Configuration
 * 
 * This file MUST be loaded before any other application scripts.
 * It centralizes the API base URL for all frontend-backend communication.
 * 
 * DEPLOYMENT ENVIRONMENTS:
 * - Production (Vercel): Set window.API_BASE to your Render backend URL
 * - Local dev: Uses localhost:3000
 */

(function() {
  'use strict';
  
  // Detect environment and set API base URL
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  
  if (isLocal) {
    // Local development: backend runs on localhost:3000
    window.API_BASE = 'http://localhost:3000';
  } else {
    // Production: Render backend URL
    window.API_BASE = 'https://law-backend-trgj.onrender.com';
  }
  
  // For debugging - remove in production if desired
  console.log('[Config] API Base URL:', window.API_BASE);
})();
