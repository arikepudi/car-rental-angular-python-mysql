import { expect, test } from "@playwright/test";
import { CarDetailPage } from "../pages/car-detail.page";
import { CheckoutPage } from "../pages/checkout.page";
import { HomePage } from "../pages/home.page";
import { futureDate, uniqueEmail } from "../fixtures/test-data";

// The single highest-value test in this suite: a double-booking on the same car is the one
// failure mode that actually costs the business money, not just a UI inconvenience.
test("a second booking that overlaps an existing one on the same car is rejected", async ({ page }) => {
  const home = new HomePage(page);

  // First booking: Honda CR-V, days 5-7 out.
  await home.goto();
  await home.openCar("Honda CR-V");
  let detail = new CarDetailPage(page);
  await detail.chooseDates(futureDate(5), futureDate(7));
  await detail.proceedToCheckout();
  let checkout = new CheckoutPage(page);
  await checkout.fillDetails("First Booker", uniqueEmail("first"));
  await checkout.confirmBooking();
  await expect(page).toHaveURL(/\/bookings\//);

  // Second attempt: same car, an overlapping range (days 6-8 overlaps days 5-7).
  await home.goto();
  await home.openCar("Honda CR-V");
  detail = new CarDetailPage(page);
  await detail.chooseDates(futureDate(6), futureDate(8));
  await detail.proceedToCheckout();
  checkout = new CheckoutPage(page);
  await checkout.fillDetails("Second Booker", uniqueEmail("second"));
  await checkout.confirmBooking();

  // The rule being pinned down: the server rejects the overlap (409) and checkout stays put
  // with an explanatory error — it must NOT silently succeed and double-book the car.
  // (The frontend rephrases the raw 409 body into this specific message — see checkout.ts.)
  await expect(checkout.errorMessage).toContainText(/booked for part of your selected dates/i);
  await expect(page).toHaveURL(/\/checkout/);
});
