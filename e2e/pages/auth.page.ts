import { Locator, Page } from "@playwright/test";

export class SignupPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByLabel("Full name");
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: /sign up|creating account/i });
    this.errorMessage = page.locator(".error-text");
  }

  async goto() {
    await this.page.goto("/signup");
  }

  async signUp(name: string, email: string, password: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    // Same race as HeaderComponent.signOut(): .click() only waits for the click to dispatch,
    // not for the component's async chain (signup API call, session update, then navigate
    // to '/') to finish. A caller that immediately does a hard page.goto() afterward (as
    // bookCar() does in several specs) can otherwise race ahead of the session cookie
    // actually being set. Waiting for the on-success navigation target is an unambiguous
    // signal the whole chain completed.
    await this.page.waitForURL("/");
  }
}

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: /sign in|signing in/i });
    this.errorMessage = page.locator(".error-text");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

export class HeaderComponent {
  readonly page: Page;
  readonly signOutButton: Locator;
  readonly userName: Locator;
  readonly signInLink: Locator;
  readonly compareLink: Locator;
  readonly myBookingsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.signOutButton = page.getByRole("button", { name: "Sign out" });
    this.userName = page.locator(".user-name");
    this.signInLink = page.getByRole("link", { name: "Sign in" });
    this.compareLink = page.getByRole("link", { name: /compare/i });
    this.myBookingsLink = page.getByRole("link", { name: "My Bookings" });
  }

  async signOut() {
    await this.signOutButton.click();
    // Header.signOut() is fire-and-forget from Playwright's point of view — .click() only
    // waits for the click event to dispatch, not for the component's internal await chain
    // (the sign-out API call, then the session signal update). Without waiting here, a
    // subsequent hard page.goto() can abort that in-flight request before the server-side
    // session is actually revoked. Wait for the header to visibly reflect signed-out state.
    await this.signInLink.waitFor();
  }
}
