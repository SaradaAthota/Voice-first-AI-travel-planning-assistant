/**
 * Page Object Model: App Page
 * 
 * Reusable selectors and actions for the main app page.
 */

import { Page, Locator } from '@playwright/test';

export class AppPage {
  readonly page: Page;
  readonly header: Locator;
  readonly micButton: Locator;
  readonly transcriptArea: Locator;
  readonly itineraryArea: Locator;
  readonly sourcesSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('h1').filter({ hasText: /voice|travel|assistant/i });
    this.micButton = page.locator('button').filter({ hasText: /mic|record|voice/i }).first();
    this.transcriptArea = page.locator('[data-testid="transcript"]').or(
      page.locator('*').filter({ hasText: /transcript|speech/i })
    );
    this.itineraryArea = page.locator('[data-testid="itinerary"]').or(
      page.locator('*').filter({ hasText: /itinerary|day|trip/i })
    );
    this.sourcesSection = page.locator('[data-testid="sources"]').or(
      page.locator('*').filter({ hasText: /source|reference|citation/i })
    );
  }

  async goto() {
    await this.page.goto('/');
  }

  async clickMicButton() {
    await this.micButton.click();
  }

  async waitForTranscript() {
    await this.transcriptArea.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      // Transcript may not appear immediately
    });
  }

  async waitForItinerary() {
    await this.itineraryArea.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      // Itinerary may not exist yet
    });
  }
}

