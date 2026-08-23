import { KeyValuePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { BookingDraftService } from '../../core/booking-draft.service';
import { CompareService } from '../../core/compare.service';
import { Car } from '../../core/models';

@Component({
  imports: [FormsModule, RouterLink, KeyValuePipe],
  selector: 'app-car-detail',
  styleUrl: './car-detail.scss',
  templateUrl: './car-detail.html',
})
export class CarDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private draft = inject(BookingDraftService);
  protected compare = inject(CompareService);

  protected car = signal<Car | null>(null);
  protected loading = signal(true);
  protected notFound = signal(false);

  protected pickupDate = signal<string>('');
  protected returnDate = signal<string>('');
  protected dateError = signal<string | null>(null);

  protected rentalDays = computed(() => {
    if (!this.pickupDate() || !this.returnDate()) return 0;
    const start = new Date(this.pickupDate());
    const end = new Date(this.returnDate());
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(days, 1);
  });

  protected estimatedTotal = computed(() => {
    const car = this.car();
    if (!car || this.rentalDays() === 0) return 0;
    return car.price_per_day * this.rentalDays();
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getCar(id).subscribe({
      next: (car) => {
        this.car.set(car);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  protected proceedToCheckout(): void {
    this.dateError.set(null);
    const car = this.car();
    if (!car) return;
    if (!this.pickupDate() || !this.returnDate()) {
      this.dateError.set('Choose a pickup and return date.');
      return;
    }
    if (new Date(this.returnDate()) <= new Date(this.pickupDate())) {
      this.dateError.set('Return date must be after the pickup date.');
      return;
    }
    this.draft.set({ carId: car.id, startsAt: this.pickupDate(), endsAt: this.returnDate() });
    this.router.navigateByUrl('/checkout');
  }

  protected toggleCompare(): void {
    const car = this.car();
    if (car) this.compare.toggle(car.id);
  }
}
