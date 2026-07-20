/**
 * Global setup test: log in once and save the authenticated browser storage state.
 * All tests that use { storageState: STORAGE_STATE_PATH } reuse this saved state,
 * avoiding a full login round-trip for every test file.
 *
 * This file is matched by the `setup` project in playwright.config.ts.
 * It runs as a test (using test() from @playwright/test) so that Playwright
 * project dependencies work correctly.
 */
import { test as setup } from '@playwright/test';
import { userData } from '../fixtures/user';
import { LoginPage } from '../pages/LoginPage';
import { STORAGE_STATE_PATH } from '../fixtures/constants';

setup('authenticate and save session state', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigateTo();
  await loginPage.login(userData.validUser.username, userData.validUser.password);

  // Persist cookies + localStorage so authenticated tests can reuse the session
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
