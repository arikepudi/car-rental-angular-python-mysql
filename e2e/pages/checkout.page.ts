import { Locator, Page } from "@playwright/test";

export class CheckoutPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly confirmButton: Locator;
  readonly errorMessage: Locator;
  readonly guestNote: Locator;
  readonly estimatedTotal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByLabel("Full name");
    this.emailInput = page.getByLabel("Email");
    this.confirmButton = page.getByRole("button", { name: /confirm booking/i });
    this.errorMessage = page.locator(".error-text");
    this.guestNote = page.locator(".guest-note");
    this.estimatedTotal = page.locator(".row.total dd");
  }

  async fillDetails(name: string, email: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
  }

  async confirmBooking() {
    await this.confirmButton.click();
  }
}
