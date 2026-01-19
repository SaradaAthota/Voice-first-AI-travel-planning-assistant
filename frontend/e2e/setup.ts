/**
 * E2E Test Setup
 * 
 * Global setup for E2E tests.
 */

import { test as setup } from '@playwright/test';

/**
 * Setup: Ensure backend is running
 */
setup('setup', async () => {
  // Check if backend is accessible
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${backendUrl}/health`);
    if (!response.ok) {
      throw new Error('Backend health check failed');
    }
    console.log('✅ Backend is running');
  } catch (error) {
    console.warn('⚠️ Backend may not be running. Some tests may fail.');
    console.warn('Start backend with: cd backend && npm run dev');
  }
});

