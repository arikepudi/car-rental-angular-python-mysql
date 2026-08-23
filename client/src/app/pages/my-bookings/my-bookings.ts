import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { SessionService } from '../../core/session.service';
import { Booking } from '../../core/models';

@Component({
  imports: [RouterLink],
  selector: 'app-my-bookings',
  styleUrl: './my-bookings.scss',
  templateUrl: './my-bookings.html',
})
export class MyBookings implements OnInit {
  private api = inject(ApiService);
  protected session = inject(SessionService);

  protected bookings = signal<Booking[]>([]);
  protected loading = signal(true);
  protected cancellingId = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.session.whenReady; // don't decide sign-in-prompt-vs-list before the initial session check resolves
    if (this.session.user()) {
      this.load();
    } else {
      this.loading.set(false);
    }
  }

  private load(): void {
    this.loading.set(true);
    this.api.getMyBookings().subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected cancel(booking: Booking): void {
    this.cancellingId.set(booking.id);
    this.api.cancelBooking(booking.id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.load();
      },
      error: () => this.cancellingId.set(null),
    });
  }
}
