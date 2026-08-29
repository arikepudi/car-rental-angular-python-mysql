import { expect, test } from "@playwright/test";
import { HeaderComponent, LoginPage, SignupPage } from "../pages/auth.page";
import { MyBookingsPage } from "../pages/my-bookings.page";
import { uniqueEmail } from "../fixtures/test-data";

test.describe("session and auth", () => {
  test("a session survives a page reload", async ({ page }) => {
    const email = uniqueEmail("reload");
    const signup = new SignupPage(page);
    await signup.goto();
    await signup.signUp("Reload Tester", email, "correct-horse-battery-staple");

    const header = new HeaderComponent(page);
    await expect(header.userName).toHaveText("Reload Tester");

    await page.reload();
    // The rule being pinned down: this is a real cookie-backed session, not client-only
    // state that evaporates on reload.
    await expect(header.userName).toHaveText("Reload Tester");
  });

  test("signing out immediately ends the session — My Bookings requires signing in again", async ({ page }) => {
    const email = uniqueEmail("signout");
    const signup = new SignupPage(page);
    await signup.goto();
    await signup.signUp("Sign Out Tester", email, "correct-horse-battery-staple");

    const header = new HeaderComponent(page);
    await header.signOut();
    await expect(header.signInLink).toBeVisible();

    const myBookings = new MyBookingsPage(page);
    await myBookings.goto();
    await expect(myBookings.signInPrompt).toBeVisible();
  });

  test("signing in with the wrong password is rejected with a clear error, not a silent failure", async ({
    page,
  }) => {
    const email = uniqueEmail("wrongpass");
    const signup = new SignupPage(page);
    await signup.goto();
    await signup.signUp("Wrong Password Tester", email, "the-correct-password");

    const header = new HeaderComponent(page);
    await header.signOut();

    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(email, "definitely-not-the-password");
    await expect(login.errorMessage).toHaveText(/invalid email or password/i);
    await expect(header.signInLink).toBeVisible(); // still signed out
  });
});
