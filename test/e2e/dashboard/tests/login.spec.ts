import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { userData } from '../fixtures/user';

test.describe('Login Page', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigateTo();
  });

  test('should successfully log in with valid credentials', async ({ page }) => {
    await loginPage.login(userData.validUser.username, userData.validUser.password);
    // After login, the Next.js router issues a client-side push to '/'
    // Navigate explicitly to confirm the session is valid
    await page.goto('/');
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });
});