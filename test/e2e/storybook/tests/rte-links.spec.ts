import { test, expect } from '@playwright/test';

const STORYBOOK_URL = process.env.STORYBOOK_URL || 'http://localhost:6006';

test.describe('RTE links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      `${STORYBOOK_URL}/?path=/story/dialog-livejsontester--live-tester-rte-links`
    );
    await page.waitForSelector('text=Rich Text Content');
  });

  test('preserves link attributes in the LiveJsonTester story', async ({ page }) => {
    const editor = page.locator('[data-testid="rte-editor"]');
    const link = editor.locator('a[href="/content/sample"]');

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAttribute('title', 'Sample link');

    // Hidden form input should also keep the link attributes
    const hiddenInput = page.locator('[data-testid="rte-hidden-input"]');
    await expect(hiddenInput).toHaveAttribute(
      'value',
      /href="\/content\/sample"/
    );
  });

  test('creates a link by selecting text in the visual editor', async ({ page }) => {
    await page.getByRole('button', { name: /Test Dialog/i }).click();

    const dialog = page.locator('[role="dialog"]');
    const editor = dialog.locator('[data-testid="rte-editor"]');

    // Focus the editor and type some text
    await editor.click();
    await editor.fill('Visit Ethereal Nexus today');

    // Select the words "Ethereal Nexus" by triple-clicking the second word
    // and then extending with Shift+Click is fragile; use keyboard selection.
    await editor.click();
    await page.keyboard.press('Control+Home');
    await page.keyboard.press('Control+ArrowRight'); // skip "Visit"
    await page.keyboard.press('Shift+End'); // select to end -> "Ethereal Nexus today"
    // Narrow the selection to only "Ethereal Nexus" by shifting left twice
    await page.keyboard.press('Shift+Control+ArrowLeft'); // deselect "today"
    await page.keyboard.press('Shift+Control+ArrowLeft'); // deselect trailing space? we want "Ethereal Nexus"

    // Open the link toolbar
    await dialog.getByTestId('rte-link-button').click();

    // Wait for link editor controls
    await dialog.getByTestId('rte-link-apply').waitFor();

    // Fill link path, alt text and open-in-new-tab
    const pathFallback = dialog.getByTestId('rte-link-path-fallback').locator('input');
    await pathFallback.fill('/content/ethereal');

    const altInput = dialog.getByTestId('rte-link-alt').locator('input');
    await altInput.fill('Ethereal site');

    await dialog.getByTestId('rte-link-new-tab').click();

    await dialog.getByTestId('rte-link-apply').click();

    // Assert the link was created with the correct attributes
    const link = editor.locator('a[href="/content/ethereal"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('title', 'Ethereal site');

    const hiddenInput = page.locator('[data-testid="rte-hidden-input"]');
    await expect(hiddenInput).toHaveAttribute(
      'value',
      /href="\/content\/ethereal"/
    );
  });

  test('creates a new link via source mode', async ({ page }) => {
    await page.getByRole('button', { name: /Test Dialog/i }).click();

    const dialog = page.locator('[role="dialog"]');

    // Enter source mode
    await dialog.getByTestId('rte-source-toggle').click();
    await dialog
      .getByTestId('rte-source-textarea')
      .fill('<p>Visit <a href="/content/ethereal" target="_blank" title="Ethereal">Ethereal Nexus</a></p>');

    // Switch back to visual
    await dialog.getByTestId('rte-source-toggle').click();

    const editor = dialog.getByTestId('rte-editor');
    const link = editor.locator('a[href="/content/ethereal"]');

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('title', 'Ethereal');

    const hiddenInput = page.locator('[data-testid="rte-hidden-input"]');
    await expect(hiddenInput).toHaveAttribute(
      'value',
      /href="\/content\/ethereal"/
    );
  });
});
