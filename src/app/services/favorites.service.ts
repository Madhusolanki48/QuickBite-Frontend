import { Injectable, computed, inject, signal } from '@angular/core';

import { MenuItem } from '../core/app.models';
import { CatalogService } from './catalog.service';

const FAVORITES_KEY = 'quickbite.favorite.items';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly catalog = inject(CatalogService);
  private readonly favoriteIdsSignal = signal<string[]>(this.readFavorites());

  readonly favoriteIds = computed(() => this.favoriteIdsSignal());
  readonly favorites = computed<MenuItem[]>(() => {
    const ids = new Set(this.favoriteIdsSignal());
    return this.catalog.menuItemsSignal().filter((item) => ids.has(item.id));
  });

  isFavorite(id: string): boolean {
    return this.favoriteIdsSignal().includes(id);
  }

  toggle(item: MenuItem): void {
    const next = this.isFavorite(item.id)
      ? this.favoriteIdsSignal().filter((id) => id !== item.id)
      : [...this.favoriteIdsSignal(), item.id];

    this.favoriteIdsSignal.set(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  add(item: MenuItem): void {
    if (this.isFavorite(item.id)) {
      return;
    }

    const next = [...this.favoriteIdsSignal(), item.id];
    this.favoriteIdsSignal.set(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  remove(id: string): void {
    const next = this.favoriteIdsSignal().filter((entry) => entry !== id);
    this.favoriteIdsSignal.set(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  private readFavorites(): string[] {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }
}
