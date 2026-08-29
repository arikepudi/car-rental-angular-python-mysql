import { Locator, Page } from "@playwright/test";

export class ComparePage {
  readonly page: Page;
  readonly emptyMessage: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emptyMessage = page.getByText("You haven't added any cars to compare yet.");
    this.table = page.locator("table");
  }

  async goto() {
    await this.page.goto("/compare");
  }

  columnHeaders(): Locator {
    return this.table.locator("thead .car-name");
  }

  rowFor(label: string): Locator {
    return this.table.locator("tr").filter({ has: this.page.locator(".row-label", { hasText: label }) });
  }
}
