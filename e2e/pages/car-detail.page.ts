import { Locator, Page } from "@playwright/test";

export class CarDetailPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly pickupDate: Locator;
  readonly returnDate: Locator;
  readonly proceedButton: Locator;
  readonly compareToggle: Locator;
  readonly dateError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.pickupDate = page.getByLabel("Pickup date");
    this.returnDate = page.getByLabel("Return date");
    this.proceedButton = page.getByRole("button", { name: "Proceed to Checkout" });
    this.compareToggle = page.getByRole("button", { name: /add to compare|remove from compare/i });
    this.dateError = page.locator(".error-text");
  }

  async chooseDates(startsAt: string, endsAt: string) {
    await this.pickupDate.fill(startsAt);
    await this.returnDate.fill(endsAt);
  }

  async proceedToCheckout() {
    await this.proceedButton.click();
  }
}
