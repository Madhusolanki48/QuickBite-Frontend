import { NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { CatalogService } from '../../services/catalog.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-menu-page',
  imports: [NgFor, NgIf, RouterLink],
  template: `
    <section class="menu-head">
      <a routerLink="/home" class="back">← Back</a>
      <div>
        <h1>
          <ng-container
            *ngIf="restaurant()?.imageUrl && !restaurantImageError(); else restaurantHeroEmoji"
          >
            <img
              class="menu-head__logo"
              [src]="restaurant()?.imageUrl"
              [alt]="restaurant()?.name ?? 'Restaurant'"
              (error)="markRestaurantImageError()"
            />
          </ng-container>
          <ng-template #restaurantHeroEmoji>{{ restaurant()?.heroEmoji }}</ng-template>
          {{ restaurant()?.name }}
        </h1>
        <p>
          {{ restaurant()?.cuisine }} · ⭐ {{ restaurant()?.rating }} · ⏱
          {{ restaurant()?.deliveryMinutes }} min · Min ₹{{ restaurant()?.minOrder }}
        </p>
      </div>
      <a routerLink="/cart" class="ghost">Cart ({{ cart.itemCount() }})</a>
    </section>

    <section class="grid">
      <article *ngFor="let item of items()" class="menu-card card">
        <div class="menu-card__visual">
          <img
            *ngIf="item.imageUrl && !itemImageError(item.id); else itemEmoji"
            [src]="item.imageUrl"
            [alt]="item.name"
            (error)="markItemImageError(item.id)"
          />
          <ng-template #itemEmoji>{{ item.icon }}</ng-template>
        </div>
        <div class="menu-card__body">
          <h3>{{ item.name }}</h3>
          <p>{{ item.description }}</p>
          <div class="menu-card__footer">
            <strong>₹{{ item.price }}</strong>
            <span>⭐ {{ item.rating }}</span>
            <button type="button" (click)="add(item)">+ Add</button>
          </div>
        </div>
      </article>
    </section>

    <div *ngIf="toast()" class="toast">{{ toast() }}</div>
  `,
  styleUrl: './customer-pages.scss',
})
export class MenuPageComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly catalog = inject(CatalogService);
  protected readonly cart = inject(CartService);
  protected readonly toast = signal<string | null>(null);
  protected readonly restaurantImageBroken = signal(false);
  protected readonly itemImageErrors = signal<Record<string, boolean>>({});
  protected readonly restaurantId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly restaurant = computed(() => this.catalog.restaurantById(this.restaurantId));
  protected readonly items = computed(() => this.catalog.menuForRestaurant(this.restaurantId));

  protected add(item: {
    id: string;
    backendId?: number;
    name: string;
    description: string;
    price: number;
  }) {
    const restaurant = this.restaurant();
    if (!restaurant) {
      return;
    }

    if (restaurant.status === 'CLOSED') {
      this.toast.set(`${restaurant.name} is closed right now`);
      window.setTimeout(() => this.toast.set(null), 1800);
      return;
    }

    this.cart.addItem({
      id: `${restaurant.id}-${item.id}`,
      backendMenuItemId: item.backendId,
      backendRestaurantId: restaurant.backendId,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      name: item.name,
      description: item.description,
      price: item.price,
      quantity: 1,
      imageUrl: this.catalog
        .menuForRestaurant(this.restaurantId)
        .find((entry) => entry.id === item.id)?.imageUrl,
    });
    this.toast.set(`${item.name} added to cart`);
    window.setTimeout(() => this.toast.set(null), 1800);
  }

  markRestaurantImageError(): void {
    this.restaurantImageBroken.set(true);
  }

  restaurantImageError(): boolean {
    return this.restaurantImageBroken();
  }

  markItemImageError(id: string): void {
    this.itemImageErrors.update((state) => ({ ...state, [id]: true }));
  }

  itemImageError(id: string): boolean {
    return this.itemImageErrors()[id] ?? false;
  }
}
