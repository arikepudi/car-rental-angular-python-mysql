import { expect, test } from "@playwright/test";
import { ComparePage } from "../pages/compare.page";
import { HomePage } from "../pages/home.page";

test.describe("comparison", () => {
  test("compare page is empty until cars are added", async ({ page }) => {
    const compare = new ComparePage(page);
    await compare.goto();
    await expect(compare.emptyMessage).toBeVisible();
  });

  test("adding cars from browse shows them, with real data, on the compare page", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.toggleCompare("BMW 5 Series");
    await home.toggleCompare("Mercedes-Benz E-Class");

    const compare = new ComparePage(page);
    await compare.goto();

    const headers = compare.columnHeaders();
    await expect(headers).toHaveCount(2);
    await expect(headers.filter({ hasText: "BMW 5 Series" })).toBeVisible();
    await expect(headers.filter({ hasText: "Mercedes-Benz E-Class" })).toBeVisible();

    // The rule being pinned down: it's the *real* car data in the table, not placeholders.
    await expect(compare.rowFor("Price / day")).toContainText("118"); // BMW's seeded price_per_day
    await expect(compare.rowFor("Price / day")).toContainText("125"); // Mercedes' seeded price_per_day
  });

  test("compare list caps at 3 — a 4th checkbox is disabled", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.toggleCompare("Toyota Corolla");
    await home.toggleCompare("Honda Civic");
    await home.toggleCompare("Honda CR-V");

    await expect(home.carCard("Ford Explorer").getByLabel("Compare")).toBeDisabled();
  });
});
