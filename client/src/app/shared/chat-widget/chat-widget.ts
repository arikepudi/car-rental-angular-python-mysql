import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { ChatSource } from '../../core/models';

interface ChatBubble {
  role: 'user' | 'bot';
  text: string;
  source?: ChatSource;
  topic?: string;
}

const GREETING: ChatBubble = {
  role: 'bot',
  text: "Hi! I can answer questions about renting here — browsing, comparing, pricing, cancellations — and look up your own reservations. Ask me anything, or try a suggestion below.",
};

const SUGGESTIONS = [
  'What is the cancellation policy?',
  'How does comparing cars work?',
  "What's the status of my bookings?",
  'Do I need an account to book?',
];

@Component({
  imports: [FormsModule],
  selector: 'app-chat-widget',
  styleUrl: './chat-widget.scss',
  templateUrl: './chat-widget.html',
})
export class ChatWidget {
  private api = inject(ApiService);
  private scrollAnchor = viewChild<ElementRef<HTMLElement>>('scrollAnchor');

  protected readonly suggestions = SUGGESTIONS;
  protected open = signal(false);
  protected messages = signal<ChatBubble[]>([GREETING]);
  protected draft = signal('');
  protected sending = signal(false);

  constructor() {
    // Scroll to the newest message whenever the list grows (including while the panel is closed,
    // which is harmless — it just keeps the anchor current for the next time it opens).
    effect(() => {
      this.messages();
      queueMicrotask(() => this.scrollAnchor()?.nativeElement.scrollIntoView({ block: 'end' }));
    });
  }

  protected toggle(): void {
    this.open.update((v) => !v);
  }

  protected sendSuggestion(text: string): void {
    this.draft.set(text);
    this.send();
  }

  protected send(): void {
    const text = this.draft().trim();
    if (!text || this.sending()) return;

    this.messages.update((msgs) => [...msgs, { role: 'user', text }]);
    this.draft.set('');
    this.sending.set(true);

    this.api.chat(text).subscribe({
      next: (res) => {
        this.messages.update((msgs) => [
          ...msgs,
          { role: 'bot', text: res.reply, source: res.source, topic: res.topic },
        ]);
        this.sending.set(false);
      },
      error: () => {
        this.messages.update((msgs) => [
          ...msgs,
          {
            role: 'bot',
            text: "Sorry, I couldn't reach the assistant just now — please try again in a moment.",
            source: 'none',
          },
        ]);
        this.sending.set(false);
      },
    });
  }
}
