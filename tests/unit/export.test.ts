import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Main user flow', () => {
  test('upload a WAV file and verify transcript page loads', async ({ page }) => {
    await page.goto('/');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('text=Upload Audio');
    const fileChooser = await fileChooserPromise;

    const fixturePath = path.resolve(__dirname, '../fixtures/sample.wav');
    await fileChooser.setFiles(fixturePath);

    await page.waitForURL(/\/transcript\//);
    await expect(page.locator('h1')).toContainText('Transcript');
  });

  test('export buttons trigger downloads', async ({ page }) => {
    await page.goto('/transcript/1');

    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Export TXT');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.txt$/);
  });
});