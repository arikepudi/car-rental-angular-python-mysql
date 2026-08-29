import { Locator, Page } from "@playwright/test";

export class HomePage {
  readonly page: Page;
  readonly pickupDate: Locator;
  readonly returnDate: Locator;
  readonly category: Locator;
  readonly sort: Locator;
  readonly searchButton: Locator;
  readonly cars: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pickupDate = page.getByLabel("Pickup date");
    this.returnDate = page.getByLabel("Return date");
    this.category = page.getByLabel("Category");
    this.sort = page.getByLabel("Sort by");
    this.searchButton = page.getByRole("button", { name: "Search" });
    this.cars = page.getByTestId("car-card");
  }

  async goto() {
    await this.page.goto("/");
  }

  async search() {
    await this.searchButton.click();
  }

  async filterByCategory(category: string) {
    await this.category.selectOption(category);
    await this.search();
  }

  carCard(name: string): Locator {
    return this.cars.filter({ has: this.page.getByRole("heading", { name, exact: true }) });
  }

  async openCar(name: string) {
    await this.carCard(name).click();
  }

  async toggleCompare(name: string) {
    await this.carCard(name).getByLabel("Compare").click();
  }
}
