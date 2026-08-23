import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { CompareService } from '../../core/compare.service';
import { Car } from '../../core/models';

type SortKey = 'price-asc' | 'price-desc' | 'rating-desc';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private api = inject(ApiService);
  protected compare = inject(CompareService);

  protected cars = signal<Car[]>([]);
  protected loading = signal(true);
  protected errorMessage = signal<string | null>(null);

  protected category = signal<string>('');
  protected pickupDate = signal<string>('');
  protected returnDate = signal<string>('');
  protected sort = signal<SortKey>('rating-desc');

  protected categories = computed(() => {
    const set = new Set(this.cars().map((c) => c.category));
    return Array.from(set).sort();
  });

  protected visibleCars = computed(() => {
    let list = this.cars();
    if (this.category()) {
      list = list.filter((c) => c.category === this.category());
    }
    const sorted = [...list];
    switch (this.sort()) {
      case 'price-asc':
        sorted.sort((a, b) => a.price_per_day - b.price_per_day);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price_per_day - a.price_per_day);
        break;
      case 'rating-desc':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
    }
    return sorted;
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const filters =
      this.pickupDate() && this.returnDate()
        ? { starts_at: this.pickupDate(), ends_at: this.returnDate() }
        : {};
    this.api.getCars(filters).subscribe({
      next: (cars) => {
        this.cars.set(cars);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load cars. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected toggleCompare(carId: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.compare.toggle(carId);
  }
}
