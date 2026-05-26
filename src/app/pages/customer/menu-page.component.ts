import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CartService } from '../../services/cart.service';
import { CatalogService } from '../../services/catalog.service';
import { MenuItem } from '../../core/app.models';

@Component({
  selector: 'app-menu-page',
  imports: [NgClass, NgFor, NgIf, RouterLink],
  template: `
    <section class="product-hero">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
        <a routerLink="/home" class="back-link">&#8592; Back to Discovery</a>
        <a routerLink="/cart" class="back-link" style="color: var(--brand);">
          🛒 View Cart ({{ cart.itemCount() }})
        </a>
      </div>

      <!-- Restaurant Context Header (Rule 8: Restaurant Context Must Always Be Visible) -->
      <div class="restaurant-hero card" *ngIf="featuredRestaurant() as rest">
        <div class="restaurant-hero__info">
          <span class="restaurant-hero__badge">Ordering From Restaurant</span>
          <h1>{{ rest.name }}</h1>
          <p class="restaurant-hero__cuisine">{{ rest.cuisine }}</p>
          <div class="restaurant-hero__stats">
            <span class="rating">★ {{ rest.rating.toFixed(1) }}</span>
            <span class="dot">•</span>
            <span>⏱ {{ rest.deliveryMinutes }} mins delivery</span>
            <span class="dot">•</span>
            <span>🛵 ₹40 delivery fee</span>
          </div>
        </div>
      </div>

      <!-- Category Filter Banner (Active when arrived from a category click) -->
      <div class="category-filter-banner card" *ngIf="activeCategoryFilter() as cat">
        <div class="category-filter-banner__text">
          <span class="category-filter-banner__pill">Category Filter</span>
          <p>
            Showing only <strong>{{ catalog.categoryLabel(cat) }}</strong> from
            <strong>{{ featuredRestaurant()?.name }}</strong>
          </p>
        </div>
        <button type="button" class="btn-clear-category" (click)="clearCategoryFilter()">
          Show Full Restaurant Menu (All Items) &rarr;
        </button>
      </div>

      <!-- Featured / Selected Dish Stage -->
      <div class="product-stage" *ngIf="featuredItem()">
        <div class="product-stage__visual card">
          <img [src]="featuredImageUrl()" [alt]="featuredTitle()" />
          <div class="product-stage__badge product-stage__badge--left">
            {{ targetDishId() === featuredItem()?.id ? '★ Selected Dish' : 'Chef Pick' }}
          </div>
          <div class="product-stage__badge product-stage__badge--right">
            {{ featuredRestaurant()?.deliveryMinutes ?? '30' }} min
          </div>
        </div>

        <div class="product-card card">
          <div class="product-card__header">
            <div>
              <span class="product-card__eyebrow" *ngIf="targetDishId() === featuredItem()?.id">
                Selected Dish from Discovery
              </span>
              <span class="product-card__eyebrow" *ngIf="targetDishId() !== featuredItem()?.id">
                Featured Specialty
              </span>
              <h1>{{ featuredTitle() }}</h1>
              <p>{{ featuredRestaurant()?.name }} • {{ featuredRestaurant()?.cuisine }}</p>
            </div>

            <div class="product-card__rating">
              <strong>&#9733; {{ featuredRating().toFixed(1) }}</strong>
              <span>1.4k reviews</span>
            </div>
          </div>

          <div class="product-card__meta">
            <div class="meta-pill">
              <span>Cooking time</span>
              <strong>{{ prepTime() }}</strong>
            </div>
            <div class="meta-pill">
              <span>Delivery</span>
              <strong>{{ featuredRestaurant()?.deliveryMinutes ?? '30-40' }}</strong>
            </div>
            <div class="meta-pill">
              <span>Nutrition</span>
              <strong>{{ calories() }} kcal</strong>
            </div>
          </div>

          <div class="quantity-row">
            <div>
              <span class="quantity-row__label">Quantity</span>
              <p>Build your order from {{ featuredRestaurant()?.name }}.</p>
            </div>
            <div class="quantity-picker" aria-label="Quantity selector">
              <button type="button" (click)="decreaseQuantity()">-</button>
              <strong>{{ quantity() }}</strong>
              <button type="button" (click)="increaseQuantity()">+</button>
            </div>
          </div>

          <div class="description-block">
            <h2>Description</h2>
            <p>{{ featuredDescription() }}</p>
          </div>

          <div class="nutrition-grid">
            <article *ngFor="let stat of nutritionCards" class="nutrition-card">
              <span>{{ stat.label }}</span>
              <strong>{{ stat.value }}</strong>
            </article>
          </div>

          <div class="ingredients-row" *ngIf="ingredients().length > 0">
            <span *ngFor="let ingredient of ingredients()">{{ ingredient }}</span>
          </div>

          <div class="price-row">
            <div>
              <span>Price</span>
              <strong>₹{{ totalPrice() }}</strong>
            </div>
            <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
              <button
                type="button"
                class="order-now"
                [class.btn-added-state]="justAddedId() === featuredItem()?.id"
                (click)="addItem(featuredItem()!, quantity())"
              >
                {{ justAddedId() === featuredItem()?.id ? '✓ Added to Cart!' : 'Add to Cart • ₹' + totalPrice() }}
              </button>
              <button type="button" class="back-link" style="cursor: pointer;" (click)="orderNow()">
                Checkout &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Full Menu from this Restaurant -->
      <section class="related-section">
        <div class="section-head">
          <div>
            <span>{{ activeCategoryFilter() ? (catalog.categoryLabel(activeCategoryFilter()!) + ' Specials') : 'Full Restaurant Menu' }}</span>
            <h2>
              {{ activeCategoryFilter() ? (catalog.categoryLabel(activeCategoryFilter()!) + ' Dishes') : 'All Dishes' }}
              from {{ featuredRestaurant()?.name }} ({{ restaurantItems().length + (featuredItem() ? 1 : 0) }} items)
            </h2>
          </div>
          <a routerLink="/cart" class="section-head__cart">
            View Cart ({{ cart.itemCount() }})
          </a>
        </div>

        <div class="related-grid">
          <article
            *ngFor="let item of restaurantItems()"
            class="related-card card"
            [id]="'dish-' + item.id"
            [class.highlighted-dish]="item.id === targetDishId()"
          >
            <div class="related-card__media">
              <img [src]="item.imageUrl" [alt]="item.name" />
              <div class="diet-indicator" [ngClass]="item.isVeg ? 'veg' : 'non-veg'">
                <div class="circle"></div>
              </div>
              <span *ngIf="item.id === targetDishId()" class="highlighted-badge">Selected</span>
            </div>
            <div class="related-card__body">
              <div>
                <div class="flex items-center justify-between gap-2">
                  <h3>{{ item.name }}</h3>
                </div>
                <p>{{ item.description }}</p>
              </div>
              <div class="related-card__footer">
                <strong>₹{{ item.price }}</strong>
                <button
                  type="button"
                  class="btn-add-item"
                  [class.btn-added-state]="justAddedId() === item.id"
                  (click)="addItem(item)"
                >
                  {{ justAddedId() === item.id ? '✓ Added!' : 'Add to Cart' }}
                </button>
              </div>
            </div>
          </article>
        </div>

        <div *ngIf="restaurantItems().length === 0" class="empty-state-notice">
          <p>No items found matching the current diet preference.</p>
        </div>
      </section>
    </section>

    <a routerLink="/cart" class="floating-cart floating-cart--details" aria-label="View cart">
      <span class="floating-cart__icon">&#128722;</span>
      <span class="floating-cart__details">
        <strong>{{ cart.itemCount() }} items • {{ cart.restaurantName() || featuredRestaurant()?.name }}</strong>
        <small>₹{{ cart.total() }} • View Cart</small>
      </span>
      <span class="floating-cart__arrow">&#8594;</span>
    </a>
  `,
  styleUrl: './menu-page.component.scss',
})
export class MenuPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  public readonly catalog = inject(CatalogService);
  public readonly cart = inject(CartService);

  protected readonly quantity = signal(1);
  protected readonly justAddedId = signal<string | null>(null);

  public readonly restaurantId = signal(this.route.snapshot.paramMap.get('id') ?? '');
  public readonly targetDishId = signal(this.route.snapshot.queryParamMap.get('dish') ?? '');
  public readonly activeCategoryFilter = signal<string | null>(
    this.route.snapshot.queryParamMap.get('category'),
  );

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.restaurantId.set(id);
      }
    });

    this.route.queryParamMap.subscribe((params) => {
      const dish = params.get('dish');
      if (dish) {
        this.targetDishId.set(dish);
        setTimeout(() => {
          const el = document.getElementById(`dish-${dish}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
      this.activeCategoryFilter.set(params.get('category'));
    });
  }

  protected readonly featuredRestaurant = computed(() =>
    this.catalog.restaurantById(this.restaurantId()),
  );

  protected readonly allItems = computed(() => {
    const list = this.catalog.menuForRestaurant(this.restaurantId());
    const cat = this.activeCategoryFilter();
    if (!cat || cat === 'all') {
      return list;
    }
    return list.filter((item) => this.catalog.matchesDishCategory(item, cat));
  });

  protected clearCategoryFilter(): void {
    this.activeCategoryFilter.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: null },
      queryParamsHandling: 'merge',
    });
  }

  // Selected or featured dish at top
  protected readonly featuredItem = computed<MenuItem | null>(() => {
    const list = this.allItems();
    if (!list.length) return null;

    const target = this.targetDishId();
    if (target) {
      const found = list.find((it) => it.id === target);
      if (found) return found;
    }

    const vegPref = this.catalog.vegFilter();
    let eligible = list;
    if (vegPref === 'VEG') {
      const vegOnly = list.filter((it) => it.isVeg);
      if (vegOnly.length) eligible = vegOnly;
    } else if (vegPref === 'NON_VEG') {
      const nonVegOnly = list.filter((it) => !it.isVeg);
      if (nonVegOnly.length) eligible = nonVegOnly;
    }

    return eligible[0] ?? list[0];
  });

  protected readonly featuredTitle = computed(
    () => this.featuredItem()?.name ?? this.featuredRestaurant()?.name ?? 'Chef Special',
  );

  protected readonly featuredImageUrl = computed(
    () =>
      this.featuredItem()?.imageUrl ??
      this.featuredRestaurant()?.imageUrl ??
      '/assets/images/hero-banners/healthy-food.png?v=20260429',
  );

  protected readonly featuredDescription = computed(
    () =>
      this.featuredItem()?.description ??
      this.featuredRestaurant()?.description ??
      'Handcrafted with a premium delivery finish.',
  );

  protected readonly featuredRating = computed(
    () => this.featuredItem()?.rating ?? this.featuredRestaurant()?.rating ?? 4.8,
  );

  protected readonly nutritionCards = [
    { label: 'Protein', value: '28g' },
    { label: 'Carbs', value: '42g' },
    { label: 'Freshness', value: 'A+' },
    { label: 'Spice', value: 'Balanced' },
  ];

  protected readonly prepTime = computed(() => {
    const item = this.featuredItem();
    if (item?.prepTimeMinutes) {
      return `${item.prepTimeMinutes} min`;
    }
    return '18 min';
  });

  protected readonly calories = computed(() => {
    const item = this.featuredItem();
    return item ? 380 + (item.price % 120) : 430;
  });

  protected readonly totalPrice = computed(() => {
    const item = this.featuredItem();
    return (item?.price ?? 0) * this.quantity();
  });

  protected readonly ingredients = computed(() => this.featuredItem()?.ingredients ?? []);

  // Show ALL items from the restaurant!
  protected readonly restaurantItems = computed<MenuItem[]>(() => {
    const feat = this.featuredItem();
    const list = this.allItems();
    const vegPref = this.catalog.vegFilter();

    let items = list.filter((it) => it.id !== feat?.id);
    if (vegPref === 'VEG') {
      items = items.filter((it) => it.isVeg === true);
    } else if (vegPref === 'NON_VEG') {
      items = items.filter((it) => it.isVeg === false);
    }

    return items;
  });

  protected increaseQuantity(): void {
    this.quantity.update((value) => Math.min(12, value + 1));
  }

  protected decreaseQuantity(): void {
    this.quantity.update((value) => Math.max(1, value - 1));
  }

  protected addItem(
    item: {
      id: string;
      backendId?: number;
      restaurantId: string;
      name: string;
      description: string;
      price: number;
      imageUrl?: string;
    },
    quantity = 1,
  ): void {
    const restaurant = this.featuredRestaurant();
    if (!restaurant) {
      return;
    }

    const added = this.cart.addItem({
      id: `${restaurant.id}-${item.id}`,
      backendMenuItemId: item.backendId,
      backendRestaurantId: restaurant.backendId,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      name: item.name,
      description: item.description,
      price: item.price,
      quantity,
      imageUrl: item.imageUrl,
    });

    if (added) {
      this.justAddedId.set(item.id);
      setTimeout(() => {
        if (this.justAddedId() === item.id) {
          this.justAddedId.set(null);
        }
      }, 2200);
    }
  }

  protected orderNow(): void {
    const item = this.featuredItem();
    if (!item) {
      return;
    }

    this.addItem(item, this.quantity());
    void this.router.navigate(['/cart']);
  }
}
