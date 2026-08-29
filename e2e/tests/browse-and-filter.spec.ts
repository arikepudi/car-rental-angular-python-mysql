import { expect, test } from "@playwright/test";
import { HomePage } from "../pages/home.page";

test.describe("browse and filter", () => {
  test("home page lists all seeded cars", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(home.cars).toHaveCount(9);
  });

  test("filtering by category actually narrows the result set server-side", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.filterByCategory("Electric");

    await expect(home.cars).toHaveCount(2); // Tesla Model 3, Chevrolet Bolt EUV — see seed_data.py
    await expect(home.carCard("Tesla Model 3")).toBeVisible();
    await expect(home.carCard("Chevrolet Bolt EUV")).toBeVisible();
    // The rule being pinned down: a car from a different category must not leak through.
    await expect(home.carCard("Toyota Corolla")).toHaveCount(0);
  });

  test("filtering by an availability date range excludes a car with an overlapping booking", async ({
    page,
    request,
  }, testInfo) => {
    // Directly create a booking via the API for a known car/date range, then confirm the
    // browse page's date filter actually excludes it — this is testing the same overlap
    // query the booking-creation endpoint uses, from the read side.
    const baseURL = testInfo.project.use.baseURL!;
    await request.post("/api/bookings", {
      headers: { Origin: baseURL },
      data: {
        car_id: 4, // Ford Explorer
        starts_at: "2027-03-01T10:00:00",
        ends_at: "2027-03-03T10:00:00",
        customer_name: "Availability Filter Setup",
        email: "availability-setup@example.com",
      },
    });

    const home = new HomePage(page);
    await home.goto();
    await home.pickupDate.fill("2027-03-02"); // inside the booked range
    await home.returnDate.fill("2027-03-04");
    await home.search();

    await expect(home.carCard("Ford Explorer")).toHaveCount(0);
  });
});
