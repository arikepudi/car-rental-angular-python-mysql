import { SlicePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { SessionService } from '../../core/session.service';
import { Booking } from '../../core/models';

@Component({
  imports: [RouterLink, SlicePipe],
  selector: 'app-booking-confirmation',
  styleUrl: './booking-confirmation.scss',
  templateUrl: './booking-confirmation.html',
})
export class BookingConfirmation implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  protected session = inject(SessionService);

  protected booking = signal<Booking | null>(null);
  protected loading = signal(true);
  protected notFound = signal(false);
  protected cancelError = signal<string | null>(null);
  protected cancelling = signal(false);
  protected cancelled = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getBooking(id).subscribe({
      next: (b) => {
        this.booking.set(b);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  protected cancel(): void {
    const booking = this.booking();
    if (!booking) return;
    this.cancelling.set(true);
    this.cancelError.set(null);
    this.api.cancelBooking(booking.id).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.cancelled.set(true);
      },
      error: (err) => {
        this.cancelling.set(false);
        this.cancelError.set(
          err.status === 403
            ? "This booking isn't linked to your account, so we can't cancel it here."
            : (err.error?.detail ?? 'Could not cancel this booking.'),
        );
      },
    });
  }
}
