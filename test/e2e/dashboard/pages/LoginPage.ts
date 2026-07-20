import { Page } from '@playwright/test';

export class LoginPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  emailInput = 'input[name="email"]';
  passwordInput = 'input[name="password"]';
  submitButton = 'button[type="submit"]';

  async navigateTo() {
    await this.page.goto('/auth/signin');
  }

  async login(email: string, password: string) {
    await this.page.fill(this.emailInput, email);
    await this.page.fill(this.passwordInput, password);
    // Wait for the server action response that indicates login completed
    const [response] = await Promise.all([
      this.page.waitForResponse(
        res => res.url().includes('/auth/signin') && res.status() === 303,
        { timeout: 10000 }
      ),
      this.page.click(this.submitButton),
    ]);
    // Check if the server action redirected to home (success) or back to signin (failure)
    const redirectTarget = response.headers()['x-action-redirect'] ?? '';
    if (!redirectTarget.includes('/;push') && !redirectTarget.endsWith('/')) {
      throw new Error(`Login failed. Server action redirect: "${redirectTarget}"`);
    }
  }
}