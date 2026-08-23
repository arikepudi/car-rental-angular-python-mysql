import { Injectable, signal } from '@angular/core';

export interface BookingDraft {
  carId: number;
  startsAt: string; // yyyy-MM-dd
  endsAt: string; // yyyy-MM-dd
}

// Carries the selected car + dates from the car-detail page into /checkout. In-memory
// only (not persisted) — unlike the compare list, a booking-in-progress shouldn't survive
// a reload; if it's gone, checkout redirects back to browse rather than guessing.
@Injectable({ providedIn: 'root' })
export class BookingDraftService {
  readonly draft = signal<BookingDraft | null>(null);

  set(draft: BookingDraft): void {
    this.draft.set(draft);
  }

  clear(): void {
    this.draft.set(null);
  }
}
