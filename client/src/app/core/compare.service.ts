import { Injectable, signal } from '@angular/core';

const MAX_COMPARE = 3;
const STORAGE_KEY = 'compareList';

function readStored(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Client-only comparison list, persisted to localStorage — deliberately not tied to the
// signed-in user, same reasoning as the cart in the sibling React/eCommerce app: it's a
// browsing convenience, not account data.
@Injectable({ providedIn: 'root' })
export class CompareService {
  readonly ids = signal<number[]>(readStored());

  isSelected(id: number): boolean {
    return this.ids().includes(id);
  }

  canAddMore(): boolean {
    return this.ids().length < MAX_COMPARE;
  }

  toggle(id: number): void {
    const current = this.ids();
    if (current.includes(id)) {
      this.persist(current.filter((x) => x !== id));
    } else if (current.length < MAX_COMPARE) {
      this.persist([...current, id]);
    }
    // silently ignore attempts to add a 4th — the UI disables the control instead
  }

  clear(): void {
    this.persist([]);
  }

  private persist(ids: number[]): void {
    this.ids.set(ids);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // localStorage unavailable (private mode, etc.) — in-memory state still works for this session
    }
  }
}
