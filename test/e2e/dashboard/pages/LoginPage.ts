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
    await this.page.click(this.submitButton);
  }
}