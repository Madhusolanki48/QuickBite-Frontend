import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Restaurant } from '../../core/app.models';
import { CartService } from '../../services/cart.service';
import { CatalogService } from '../../services/catalog.service';

@Component({
  selector: 'app-home-page',
  imports: [NgClass, NgFor, NgIf, RouterLink],
  template: `
    <section class="page-head">
      <div>
        <h1>Discover Restaurants <span aria-hidden="true">&#x1F37D;&#xFE0F;</span></h1>
        <p>Order food from the best restaurants near you</p>
      </div>
      <a routerLink="/cart" class="ghost">Go to cart ({{ cart.itemCount() }})</a>
    </section>

    <section class="searchbar card">
      <span aria-hidden="true">&#x1F50D;</span>
      <input
        [value]="query()"
        (input)="query.set($any($event.target).value)"
        placeholder="Search for restaurants, cuisines..."
      />
      <button type="button">Search</button>
    </section>

    <section class="chips">
      <button
        type="button"
        *ngFor="let category of catalog.categoryList()"
        class="chip"
        [class.active]="activeCategory() === category.id"
        (click)="activeCategory.set(category.id)"
      >
        <ng-container
          *ngIf="category.imageUrl && !categoryImageError(category.id); else categoryIcon"
        >
          <img
            class="chip__image"
            [src]="category.imageUrl"
            [alt]="category.label"
            (error)="markCategoryImageError(category.id)"
          />
        </ng-container>
        <ng-template #categoryIcon>{{ category.icon }}</ng-template>
        <span>{{ category.label }}</span>
      </button>
    </section>

    <section class="restaurant-list">
      <a
        *ngFor="let restaurant of filteredRestaurants()"
        class="restaurant card"
        [routerLink]="['/restaurants', restaurant.id]"
      >
        <div class="restaurant__icon">
          <img
            *ngIf="
              restaurant.imageUrl && !restaurantImageError(restaurant.id);
              else restaurantEmoji
            "
            [src]="restaurant.imageUrl"
            [alt]="restaurant.name"
            (error)="markRestaurantImageError(restaurant.id)"
          />
          <ng-template #restaurantEmoji>{{ restaurant.heroEmoji }}</ng-template>
        </div>
        <div class="restaurant__body">
          <div class="restaurant__title-row">
            <h3>{{ restaurant.name }}</h3>
            <span class="status" [ngClass]="restaurant.status.toLowerCase()">{{
              restaurant.status
            }}</span>
          </div>
          <p>{{ restaurant.cuisine }}</p>
          <div class="stats">
            <span>&#x2B50; {{ restaurant.rating }}</span>
            <span>&#x23F1; {{ restaurant.deliveryMinutes }} min</span>
            <span>Rs {{ restaurant.minOrder }}</span>
          </div>
        </div>
      </a>
    </section>
  `,
  styleUrl: './customer-pages.scss',
})
export class HomePageComponent {
  protected readonly catalog = inject(CatalogService);
  protected readonly cart = inject(CartService);
  protected readonly activeCategory = signal('all');
  protected readonly query = signal('');
  protected readonly categoryErrors = signal<Record<string, boolean>>({});
  protected readonly restaurantErrors = signal<Record<string, boolean>>({});

  protected filteredRestaurants(): Restaurant[] {
    const queryTerms = this.searchTerms(this.query());
    return this.catalog.restaurantList().filter((restaurant) => {
      const matchesCategory =
        this.activeCategory() === 'all' || restaurant.category === this.activeCategory();
      const matchesQuery =
        queryTerms.length === 0 ||
        queryTerms.every((term) => this.searchIndex(restaurant).includes(term));
      return matchesCategory && matchesQuery;
    });
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private searchTerms(value: string): string[] {
    const normalized = this.normalize(value);
    if (!normalized) {
      return [];
    }
    return normalized.split(' ').filter((term) => term.length > 1);
  }

  private searchIndex(restaurant: Restaurant): string {
    const categoryLabel =
      this.catalog.categoryList().find((item) => item.id === restaurant.category)?.label ??
      restaurant.category;
    return this.normalize(
      [restaurant.name, restaurant.cuisine, categoryLabel, restaurant.description].join(' '),
    );
  }

  protected markCategoryImageError(id: string): void {
    this.categoryErrors.update((state) => ({ ...state, [id]: true }));
  }

  protected categoryImageError(id: string): boolean {
    return this.categoryErrors()[id] ?? false;
  }

  protected markRestaurantImageError(id: string): void {
    this.restaurantErrors.update((state) => ({ ...state, [id]: true }));
  }

  protected restaurantImageError(id: string): boolean {
    return this.restaurantErrors()[id] ?? false;
  }
}
