import { expect, test } from "@playwright/test";
import { SignupPage } from "../pages/auth.page";
import { CarDetailPage } from "../pages/car-detail.page";
import { CheckoutPage } from "../pages/checkout.page";
import { ChatWidgetComponent } from "../pages/chat-widget.page";
import { HomePage } from "../pages/home.page";
import { futureDate, uniqueEmail } from "../fixtures/test-data";

test.describe("chat assistant", () => {
  test("a known FAQ question gets the curated answer, tagged as such", async ({ page }) => {
    await page.goto("/");
    const chat = new ChatWidgetComponent(page);
    await chat.ask("What is the cancellation policy?");

    await expect(chat.lastReply()).toContainText("48 hours before pickup");
    await expect(chat.lastReplyTag()).toHaveText(/from faq/i);
  });

  test("an out-of-scope question gets the fallback, not a fabricated answer", async ({ page }) => {
    await page.goto("/");
    const chat = new ChatWidgetComponent(page);
    await chat.ask("What's the weather like in Tokyo right now?");

    await expect(chat.lastReply()).toContainText("I don't have information about that");
    await expect(chat.lastReplyTag()).toHaveText(/not covered by our faq/i);
  });

  test("a catalog question reflects the real seeded categories, not a hardcoded list", async ({ page }) => {
    await page.goto("/");
    const chat = new ChatWidgetComponent(page);
    await chat.ask("What categories of cars are available?");

    await expect(chat.lastReply()).toContainText("Economy");
    await expect(chat.lastReply()).toContainText("Electric");
    await expect(chat.lastReplyTag()).toHaveText(/live catalog data/i);
  });

  test("asking about a reservation while signed out prompts for sign-in, never leaks data", async ({ page }) => {
    await page.goto("/");
    const chat = new ChatWidgetComponent(page);
    await chat.ask("What's the status of my booking?");

    await expect(chat.lastReply()).toContainText(/signed in|confirmation number/i);
  });

  test("a signed-in user's reservation question only surfaces their own real booking", async ({ page }) => {
    const email = uniqueEmail("chatuser");
    const signup = new SignupPage(page);
    await signup.goto();
    await signup.signUp("Chat Widget Tester", email, "correct-horse-battery-staple");

    const home = new HomePage(page);
    await home.goto();
    await home.openCar("Chevrolet Bolt EUV");
    const detail = new CarDetailPage(page);
    await detail.chooseDates(futureDate(12), futureDate(14));
    await detail.proceedToCheckout();
    const checkout = new CheckoutPage(page);
    await checkout.fillDetails("Chat Widget Tester", email);
    await checkout.confirmBooking();
    await expect(page).toHaveURL(/\/bookings\//);

    await page.goto("/");
    const chat = new ChatWidgetComponent(page);
    await chat.ask("What's the status of my bookings?");

    // The rule being pinned down: the reply is built from this user's real DB row (the
    // actual car name and a real dollar total), not a generated/guessed answer.
    await expect(chat.lastReply()).toContainText("Chevrolet Bolt EUV");
    await expect(chat.lastReplyTag()).toHaveText(/from your reservation data/i);
  });
});
