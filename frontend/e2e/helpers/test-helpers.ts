/**
 * E2E Test Helpers
 * 
 * Utility functions for E2E tests.
 */

import { Page } from '@playwright/test';

/**
 * Wait for backend to be ready
 */
export async function waitForBackend(page: Page, timeout = 30000) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const response = await page.request.get(`${backendUrl}/health`);
      if (response.ok()) {
        return true;
      }
    } catch (error) {
      // Backend not ready yet
    }
    await page.waitForTimeout(1000);
  }
  
  throw new Error('Backend not ready within timeout');
}

/**
 * Mock API response
 */
export async function mockApiResponse(
  page: Page,
  url: string,
  response: any,
  status = 200
) {
  await page.route(`**${url}**`, route => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Wait for element with retry
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 10000
) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if element exists (non-blocking)
 */
export async function elementExists(page: Page, selector: string) {
  const element = page.locator(selector).first();
  return await element.isVisible().catch(() => false);
}

