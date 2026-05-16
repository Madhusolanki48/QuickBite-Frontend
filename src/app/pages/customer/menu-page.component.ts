import { NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CartService } from '../../services/cart.service';
import { CatalogService } from '../../services/catalog.service';

@Component({
  selector: 'app-menu-page',
  imports: [NgFor, NgIf, RouterLink],
  template: `
    <section class="product-hero">
      <a routerLink="/home" class="back-link">&#8592; Back to QuickBite</a>

      <div class="product-stage">
        <div class="product-stage__visual card">
          <img [src]="featuredImageUrl()" [alt]="featuredTitle()" />
          <div class="product-stage__badge product-stage__badge--left">Chef pick</div>
          <div class="product-stage__badge product-stage__badge--right">
            {{ featuredRestaurant()?.deliveryMinutes ?? '30' }} min
          </div>
        </div>

        <div class="product-card card">
          <div class="product-card__header">
            <div>
              <span class="product-card__eyebrow">Premium details</span>
              <h1>{{ featuredTitle() }}</h1>
              <p>{{ featuredRestaurant()?.cuisine }}</p>
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
              <p>Build a premium order with the perfect serving size.</p>
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
            <button type="button" class="order-now" (click)="orderNow()">Order Now</button>
          </div>
        </div>
      </div>

      <section class="related-section">
        <div class="section-head">
          <div>
            <span>More from this restaurant</span>
            <h2>Other premium picks</h2>
          </div>
          <a routerLink="/cart" class="section-head__cart">
            View Cart ({{ cart.itemCount() }})
          </a>
        </div>

        <div class="related-grid">
          <article *ngFor="let item of relatedItems()" class="related-card card">
            <img [src]="item.imageUrl" [alt]="item.name" />
            <div class="related-card__body">
              <div>
                <h3>{{ item.name }}</h3>
                <p>{{ item.description }}</p>
              </div>
              <div class="related-card__footer">
                <strong>₹{{ item.price }}</strong>
                <button type="button" (click)="addItem(item)">Add</button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </section>

    <a routerLink="/cart" class="floating-cart floating-cart--details" aria-label="View cart">
      <span class="floating-cart__icon">&#128722;</span>
      <span class="floating-cart__details">
        <strong>{{ cart.itemCount() }} items</strong>
        <small>₹{{ cart.total() }} • Checkout</small>
      </span>
      <span class="floating-cart__arrow">&#8594;</span>
    </a>

    <div *ngIf="toast()" class="toast">{{ toast() }}</div>
  `,
  styleUrl: './menu-page.component.scss',
})
export class MenuPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly catalog = inject(CatalogService);
  protected readonly cart = inject(CartService);

  protected readonly quantity = signal(1);
  protected readonly toast = signal<string | null>(null);

  protected readonly restaurantId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly featuredRestaurant = computed(() => this.catalog.restaurantById(this.restaurantId));
  protected readonly items = computed(() => this.catalog.menuForRestaurant(this.restaurantId));
  protected readonly featuredItem = computed(() => this.items()[0] ?? null);
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
    const base = item ? 380 + (item.price % 120) : 430;
    return base;
  });

  protected readonly totalPrice = computed(() => {
    const item = this.featuredItem();
    return (item?.price ?? 0) * this.quantity();
  });

  protected readonly ingredients = computed(() => this.featuredItem()?.ingredients ?? []);

  protected readonly relatedItems = computed(() =>
    this.items()
      .slice(1, 5)
      .map((item) => item),
  );

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

    this.cart.addItem({
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

    this.toast.set(`${item.name} added to cart`);
    window.setTimeout(() => this.toast.set(null), 1600);
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
