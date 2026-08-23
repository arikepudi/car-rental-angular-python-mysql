import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { CompareService } from '../../core/compare.service';
import { Car } from '../../core/models';

@Component({
  imports: [RouterLink],
  selector: 'app-compare',
  styleUrl: './compare.scss',
  templateUrl: './compare.html',
})
export class Compare implements OnInit {
  private api = inject(ApiService);
  protected compareService = inject(CompareService);

  protected cars = signal<Car[]>([]);
  protected loading = signal(true);

  // Derived from whatever metadata keys are actually present across the selected cars,
  // not a hardcoded list — this is what makes the table work for any domain, not just cars.
  protected metadataKeys = computed(() => {
    const keys = new Set<string>();
    for (const car of this.cars()) {
      Object.keys(car.metadata).forEach((k) => keys.add(k));
    }
    return Array.from(keys);
  });

  protected allTags = computed(() => {
    const tags = new Set<string>();
    for (const car of this.cars()) {
      car.tags.forEach((t) => tags.add(t));
    }
    return Array.from(tags);
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const ids = this.compareService.ids();
    if (ids.length === 0) {
      this.cars.set([]);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    forkJoin(ids.map((id) => this.api.getCar(id))).subscribe({
      next: (cars) => {
        this.cars.set(cars);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected remove(carId: number): void {
    this.compareService.toggle(carId);
    this.load();
  }

  protected formatKey(key: string): string {
    return key
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
