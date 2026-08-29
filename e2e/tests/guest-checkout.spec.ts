import { expect, test } from "@playwright/test";
import { BookingConfirmationPage } from "../pages/booking-confirmation.page";
import { CarDetailPage } from "../pages/car-detail.page";
import { CheckoutPage } from "../pages/checkout.page";
import { HomePage } from "../pages/home.page";
import { futureDate, uniqueEmail } from "../fixtures/test-data";

test.describe("guest checkout", () => {
  test("a signed-out visitor can complete a booking end to end", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.openCar("Toyota Corolla");

    const detail = new CarDetailPage(page);
    await expect(detail.heading).toHaveText("Toyota Corolla");
    await detail.chooseDates(futureDate(10), futureDate(12)); // 2 days, comfortably outside the 48h window
    await detail.proceedToCheckout();

    const checkout = new CheckoutPage(page);
    await expect(checkout.guestNote).toBeVisible(); // confirms this really is the guest path, not silently signed in
    await checkout.fillDetails("Guest Tester", uniqueEmail("guest"));
    await checkout.confirmBooking();

    await expect(page).toHaveURL(/\/bookings\//);
    const confirmation = new BookingConfirmationPage(page);
    await expect(confirmation.banner).toHaveText(/booking confirmed/i);

    // The rule being pinned down: the total is the server's authoritative computation
    // (price_per_day=38.00 for the Corolla × 2 days), not whatever the client displayed
    // during date selection.
    await expect(confirmation.totalCharged).toHaveText("$76");
  });
});
