import { Locator, Page } from "@playwright/test";

export class BookingConfirmationPage {
  readonly page: Page;
  readonly banner: Locator;
  readonly confirmationRef: Locator;
  readonly totalCharged: Locator;
  readonly cancelButton: Locator;
  readonly policyText: Locator;
  readonly cancelError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.banner = page.locator(".banner");
    this.confirmationRef = page.locator(".ref");
    this.totalCharged = page.locator(".row.total dd");
    this.cancelButton = page.getByRole("button", { name: /cancel booking/i });
    this.policyText = page.locator(".policy");
    this.cancelError = page.locator(".error-text");
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async confirmationCode(): Promise<string> {
    const text = await this.confirmationRef.textContent();
    return text?.replace("Confirmation #", "").trim() ?? "";
  }
}
