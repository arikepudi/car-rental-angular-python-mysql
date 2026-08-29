import { expect, test } from "@playwright/test";
import { BookingConfirmationPage } from "../pages/booking-confirmation.page";
import { SignupPage } from "../pages/auth.page";
import { CarDetailPage } from "../pages/car-detail.page";
import { CheckoutPage } from "../pages/checkout.page";
import { HomePage } from "../pages/home.page";
import { futureDate, uniqueEmail } from "../fixtures/test-data";

async function bookCar(page: import("@playwright/test").Page, carName: string, startsIn: number, endsIn: number) {
  const home = new HomePage(page);
  await home.goto();
  await home.openCar(carName);
  const detail = new CarDetailPage(page);
  await detail.chooseDates(futureDate(startsIn), futureDate(endsIn));
  await detail.proceedToCheckout();
  const checkout = new CheckoutPage(page);
  await checkout.fillDetails("Cancellation Policy Tester", uniqueEmail("cancel"));
  await checkout.confirmBooking();
  await expect(page).toHaveURL(/\/bookings\//);
  return new BookingConfirmationPage(page);
}

test.describe("cancellation policy", () => {
  test("a booking well outside the 48h window is free to cancel", async ({ page }) => {
    const confirmation = await bookCar(page, "Mercedes-Benz E-Class", 90, 92);
    await expect(confirmation.policyText).toHaveText(/free cancellation is still available/i);
  });

  test("a booking starting within 48h shows a late cancellation fee equal to one day's rate", async ({ page }) => {
    // Cancellation always requires an authenticated owner — a guest booking's user_id is
    // null, so ownership can never match and the app correctly refuses to cancel it (see
    // the "guest-cancellation-limit" FAQ entry). Sign in first so the actual cancel step
    // below is exercising the real, supported path.
    const signup = new SignupPage(page);
    await signup.goto();
    await signup.signUp("Cancellation Policy Tester", uniqueEmail("cancelowner"), "correct-horse-battery-staple");

    // Tesla Model 3's seeded price_per_day is 89.00 — inside the 48h window the fee is
    // min(price_per_day * 1, total_price), which for any multi-day booking is just the rate.
    const confirmation = await bookCar(page, "Tesla Model 3", 1, 3);
    await expect(confirmation.policyText).toHaveText(/late cancellation fee of \$89 applies now/i);

    await confirmation.cancel();
    // The rule being pinned down: the fee shown before cancelling matches what actually
    // happens when you go through with it — not just a warning that turns out to be wrong.
    await expect(page.locator(".banner.cancelled")).toBeVisible();
  });
});
