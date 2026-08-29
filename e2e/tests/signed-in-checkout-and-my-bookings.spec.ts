import { expect, test } from "@playwright/test";
import { BookingConfirmationPage } from "../pages/booking-confirmation.page";
import { HeaderComponent, SignupPage } from "../pages/auth.page";
import { CarDetailPage } from "../pages/car-detail.page";
import { CheckoutPage } from "../pages/checkout.page";
import { HomePage } from "../pages/home.page";
import { MyBookingsPage } from "../pages/my-bookings.page";
import { futureDate, uniqueEmail } from "../fixtures/test-data";

test.describe("signed-in checkout, My Bookings, and cancellation", () => {
  test("a signed-in user's booking appears in My Bookings and can be cancelled", async ({ page }) => {
    const email = uniqueEmail("signedin");
    const signup = new SignupPage(page);
    await signup.goto();
    await signup.signUp("Signed In Tester", email, "correct-horse-battery-staple");

    const header = new HeaderComponent(page);
    await expect(header.userName).toHaveText("Signed In Tester"); // signup itself establishes a session

    const home = new HomePage(page);
    await home.goto();
    await home.openCar("Honda Civic");

    const detail = new CarDetailPage(page);
    await detail.chooseDates(futureDate(15), futureDate(17));
    await detail.proceedToCheckout();

    const checkout = new CheckoutPage(page);
    // The rule being pinned down: checkout prefills from the session for a signed-in user —
    // no guest-checkout note, and the name/email fields aren't blank.
    await expect(checkout.guestNote).toHaveCount(0);
    await expect(checkout.nameInput).toHaveValue("Signed In Tester");
    await expect(checkout.emailInput).toHaveValue(email);
    await checkout.confirmBooking();
    await expect(page).toHaveURL(/\/bookings\//);

    const myBookings = new MyBookingsPage(page);
    await myBookings.goto();
    await expect(myBookings.rowFor("Honda Civic")).toBeVisible();

    await myBookings.cancel("Honda Civic");
    // The rule being pinned down: cancelling actually removes it from the active list, not
    // just shows a success toast while leaving stale state.
    await expect(myBookings.rowFor("Honda Civic")).toHaveCount(0);
  });

  test("My Bookings requires sign-in and never shows another user's bookings", async ({ page, browser }) => {
    // User A books a car.
    const emailA = uniqueEmail("usera");
    const signupA = new SignupPage(page);
    await signupA.goto();
    await signupA.signUp("User A", emailA, "correct-horse-battery-staple");

    const home = new HomePage(page);
    await home.goto();
    await home.openCar("BMW 5 Series");
    const detail = new CarDetailPage(page);
    await detail.chooseDates(futureDate(20), futureDate(22));
    await detail.proceedToCheckout();
    const checkout = new CheckoutPage(page);
    // This test isn't about prefill (test 1 already covers that specifically) — filling
    // explicitly avoids depending on the async session-prefill's timing to land before the
    // button click.
    await checkout.fillDetails("User A", emailA);
    await checkout.confirmBooking();
    await expect(page).toHaveURL(/\/bookings\//);

    // A fresh, unauthenticated context (a different "browser") must not see User A's booking
    // history — this is the negative case a shared/leaked session would fail.
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    const myBookingsAsGuest = new MyBookingsPage(guestPage);
    await myBookingsAsGuest.goto();
    await expect(myBookingsAsGuest.signInPrompt).toBeVisible();
    await guestContext.close();

    // A second signed-in user must only see their own bookings, never User A's.
    const userBContext = await browser.newContext();
    const userBPage = await userBContext.newPage();
    const signupB = new SignupPage(userBPage);
    await signupB.goto();
    await signupB.signUp("User B", uniqueEmail("userb"), "correct-horse-battery-staple");
    const myBookingsAsB = new MyBookingsPage(userBPage);
    await myBookingsAsB.goto();
    await expect(myBookingsAsB.emptyMessage).toBeVisible();
    await expect(myBookingsAsB.rowFor("BMW 5 Series")).toHaveCount(0);
    await userBContext.close();
  });
});
