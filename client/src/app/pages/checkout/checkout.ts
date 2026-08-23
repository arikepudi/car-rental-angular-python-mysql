import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiService } from '../../core/api.service';
import { BookingDraftService } from '../../core/booking-draft.service';
import { SessionService } from '../../core/session.service';
import { Car } from '../../core/models';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-checkout',
  styleUrl: './checkout.scss',
  templateUrl: './checkout.html',
})
export class Checkout implements OnInit {
  private router = inject(Router);
  private api = inject(ApiService);
  private draftService = inject(BookingDraftService);
  protected session = inject(SessionService);

  protected car = signal<Car | null>(null);
  protected loading = signal(true);
  protected submitting = signal(false);
  protected errorMessage = signal<string | null>(null);

  protected customerName = signal('');
  protected email = signal('');

  protected draft = this.draftService.draft;

  protected rentalDays = computed(() => {
    const d = this.draft();
    if (!d) return 0;
    const days = Math.round(
      (new Date(d.endsAt).getTime() - new Date(d.startsAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(days, 1);
  });

  protected estimatedTotal = computed(() => {
    const car = this.car();
    if (!car) return 0;
    return car.price_per_day * this.rentalDays();
  });

  async ngOnInit(): Promise<void> {
    const draft = this.draft();
    if (!draft) {
      this.loading.set(false);
      return;
    }
    await this.session.whenReady; // avoid prefilling blank fields before the session check resolves
    const user = this.session.user();
    if (user) {
      this.customerName.set(user.name);
      this.email.set(user.email);
    }
    this.api.getCar(draft.carId).subscribe({
      next: (car) => {
        this.car.set(car);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('This car is no longer available.');
        this.loading.set(false);
      },
    });
  }

  protected confirmBooking(): void {
    const draft = this.draft();
    const car = this.car();
    if (!draft || !car) return;
    if (!this.customerName().trim() || !this.email().trim()) {
      this.errorMessage.set('Name and email are required.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    // The server recomputes price/availability from the DB — this request only carries
    // *which* car and *what dates*, never a price, so a tampered client total can't matter.
    this.api
      .createBooking({
        car_id: draft.carId,
        starts_at: draft.startsAt,
        ends_at: draft.endsAt,
        customer_name: this.customerName().trim(),
        email: this.email().trim(),
      })
      .subscribe({
        next: (booking) => {
          this.draftService.clear();
          this.router.navigate(['/bookings', booking.id]);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          if (err.status === 409) {
            this.errorMessage.set('This car was just booked for part of your selected dates. Please choose different dates.');
          } else {
            this.errorMessage.set(err.error?.detail ?? 'Something went wrong. Please try again.');
          }
        },
      });
  }
}
