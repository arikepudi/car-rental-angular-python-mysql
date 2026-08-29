import { Locator, Page } from "@playwright/test";

export class ChatWidgetComponent {
  readonly page: Page;
  readonly toggleButton: Locator;
  readonly input: Locator;
  readonly sendButton: Locator;
  readonly bubbles: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toggleButton = page.getByRole("button", { name: "Toggle chat assistant" });
    this.input = page.getByLabel("Chat message");
    this.sendButton = page.getByRole("button", { name: "Send" });
    this.bubbles = page.locator(".bubble.bot");
  }

  async open() {
    if ((await this.toggleButton.getAttribute("aria-expanded")) !== "true") {
      await this.toggleButton.click();
    }
  }

  async ask(message: string) {
    await this.open();
    await this.input.fill(message);
    await this.sendButton.click();
  }

  /** The most recent bot reply's message text, waiting for the "Thinking…" placeholder to resolve. */
  lastReply(): Locator {
    return this.bubbles.last().locator("p");
  }

  lastReplyTag(): Locator {
    return this.bubbles.last().locator(".tag");
  }
}
