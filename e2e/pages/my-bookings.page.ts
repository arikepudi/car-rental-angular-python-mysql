import { Locator, Page } from "@playwright/test";

export class MyBookingsPage {
  readonly page: Page;
  readonly signInPrompt: Locator;
  readonly emptyMessage: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.signInPrompt = page.getByText("Sign in to see your booking history");
    this.emptyMessage = page.getByText("You don't have any bookings yet.");
    this.rows = page.locator(".booking-row");
  }

  async goto() {
    await this.page.goto("/my-bookings");
  }

  rowFor(carName: string): Locator {
    return this.rows.filter({ hasText: carName });
  }

  async cancel(carName: string) {
    await this.rowFor(carName).getByRole("button", { name: /cancel/i }).click();
  }
}
