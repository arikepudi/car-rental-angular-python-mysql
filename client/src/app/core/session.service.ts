import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiService } from './api.service';
import { User } from './models';

// Single source of truth for auth state across the app — pages read `user()`/`ready()`
// directly rather than duplicating session state locally.
@Injectable({ providedIn: 'root' })
export class SessionService {
  private api = inject(ApiService);

  readonly user = signal<User | null>(null);
  readonly ready = signal(false); // true once the initial /api/auth/session check has resolved

  // Started eagerly in the constructor (not from a component's ngOnInit) and awaited by
  // any component that must not act on `user()` before the initial check resolves — e.g.
  // MyBookings deciding whether to show a sign-in prompt on a direct page load/refresh.
  readonly whenReady: Promise<void>;

  constructor() {
    this.whenReady = this.refresh();
  }

  private async refresh(): Promise<void> {
    try {
      const { user } = await firstValueFrom(this.api.getSession());
      this.user.set(user);
    } catch {
      this.user.set(null);
    } finally {
      this.ready.set(true);
    }
  }

  async signUp(email: string, password: string, name: string): Promise<void> {
    const user = await firstValueFrom(this.api.signUp({ email, password, name }));
    this.user.set(user);
  }

  async signIn(email: string, password: string): Promise<void> {
    const user = await firstValueFrom(this.api.signIn({ email, password }));
    this.user.set(user);
  }

  async signOut(): Promise<void> {
    await firstValueFrom(this.api.signOut());
    this.user.set(null);
  }
}
