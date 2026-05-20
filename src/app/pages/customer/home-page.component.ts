import { NgClass, NgFor, NgIf } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CartItem, MenuItem, Restaurant } from '../../core/app.models';
import { CartService } from '../../services/cart.service';
import { CatalogService } from '../../services/catalog.service';
import { FavoritesService } from '../../services/favorites.service';
import { SessionService } from '../../services/session.service';

type TileTone = 'orange' | 'green' | 'amber' | 'slate' | 'rose' | 'sky';

interface CategoryTile {
  id: string;
  label: string;
  imageUrl: string;
  tone: TileTone;
}

interface DishCard {
  item: MenuItem;
  restaurant: Restaurant | undefined;
  deliveryTime: string;
  badge: string;
  tone: TileTone;
}

interface HeroSlide {
  image: string;
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  badge: string;
  offer: string;
}

@Component({
  selector: 'app-home-page',
  imports: [NgClass, NgFor, NgIf, RouterLink],
  animations: [
    trigger('fadeRise', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(14px)' }),
        animate(
          '420ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ]),
    ]),
  ],
  template: `
    <div class="customer-dashboard">
      <section class="hero-section" @fadeRise>
        <div class="hero-slider">
          <article
            *ngFor="let slide of heroSlides; let idx = index"
            class="hero-slide"
            [ngClass]="{ 'hero-slide--active': activeSlide() === idx }"
          >
            <img [src]="slide.image" [alt]="slide.title" />
          </article>
        </div>
      </section>

      <section class="search-filter-bar glass-card" @fadeRise>
        <div class="search-group">
          <div class="search-bar">
            <span aria-hidden="true">🔍</span>
            <input
              [value]="query()"
              (input)="onSearchChange($any($event.target).value)"
              placeholder="Search food, restaurants or cuisines"
              aria-label="Search food, restaurants or cuisines"
            />
          </div>
        </div>
      </section>

      <section class="categories-section" @fadeRise>
        <div class="section-heading section-heading--compact">
          <div>
            <h2>Food categories</h2>
            <p>Quick access to your favorite dishes and cuisines.</p>
          </div>
          <button type="button" class="view-all">View all</button>
        </div>

        <div class="category-strip">
          <button
            *ngFor="let category of topCategories; trackBy: trackCategory"
            type="button"
            class="category-pill"
            [ngClass]="{ active: activeCategory() === category.id }"
            (click)="setCategory(category.id)"
          >
            <div class="image-wrapper">
              <img [src]="category.imageUrl" [alt]="category.label" />
            </div>
            <span>{{ category.label }}</span>
          </button>
        </div>
      </section>

      <section class="food-menu-section" @fadeRise>
        <div class="section-heading section-heading--compact">
          <div>
            <h2>Popular dishes</h2>
            <p>Top picks from nearby restaurants to satisfy your cravings.</p>
          </div>
          <a routerLink="/cart" class="view-all link">View cart</a>
        </div>

        <div class="food-menu-grid">
          <article *ngFor="let dish of foodMenu(); trackBy: trackDish" class="food-card">
            <div class="food-card__media">
              <img [src]="dish.item.imageUrl" [alt]="dish.item.name" />
              <div class="diet-indicator veg">
                <div class="circle"></div>
              </div>
              <button
                type="button"
                class="favorite-btn"
                [ngClass]="{ active: favorites.isFavorite(dish.item.id) }"
                (click)="toggleFavorite(dish.item, $event)"
                aria-label="Save {{ dish.item.name }}"
              >
                {{ favorites.isFavorite(dish.item.id) ? '♥' : '♡' }}
              </button>
            </div>
            <div class="food-card__content">
              <div class="food-card__meta">
                <span class="rating">⭐ 4.5</span>
                <span>•</span>
                <span>{{ dish.deliveryTime }}</span>
              </div>
              <h3>{{ dish.item.name }}</h3>
              <p>{{ dish.item.description }}</p>
              <div class="food-card__footer">
                <strong>₹{{ dish.item.price }}</strong>
                <button type="button" class="btn-add" (click)="addToCart(dish.item)">ADD</button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="nearby-section" id="restaurants" @fadeRise>
        <div class="section-heading section-heading--compact">
          <div>
            <h2>Restaurants near you</h2>
            <p>Premium restaurant picks with live delivery info.</p>
          </div>
          <a routerLink="/categories/burgers" class="view-all link">See more</a>
        </div>

        <div class="restaurant-feed">
          <a
            *ngFor="
              let restaurant of restaurantCards();
              let index = index;
              trackBy: trackRestaurant
            "
            class="restaurant-card"
            [routerLink]="['/restaurants', restaurant.id]"
          >
            <div class="restaurant-card__media">
              <img [src]="restaurant.imageUrl" [alt]="restaurant.name" />
              <div class="media-overlay"></div>
              <span class="offer-badge">{{ offerFor(restaurant) }}</span>
              <button
                type="button"
                class="favorite-btn"
                [ngClass]="{ active: isRestaurantFavorite(restaurant.id) }"
                (click)="toggleRestaurantFavorite(restaurant, $event)"
              >
                {{ isRestaurantFavorite(restaurant.id) ? '♥' : '♡' }}
              </button>
              <div class="delivery-badge">Free Delivery</div>
            </div>
            <div class="restaurant-card__body">
              <div class="restaurant-card__top">
                <h3>{{ restaurant.name }}</h3>
                <span class="rating-badge">⭐ {{ restaurant.rating.toFixed(1) }}</span>
              </div>
              <p>{{ restaurant.cuisine }} • {{ restaurant.category }}</p>
              <div class="restaurant-card__meta">
                <span>{{ restaurant.deliveryMinutes }} mins</span>
                <span>•</span>
                <span>{{ distanceFor(index) }} km</span>
              </div>
            </div>
          </a>
        </div>
      </section>

      <a routerLink="/cart" class="cart-fab" aria-label="View cart">
        <span>{{ cart.itemCount() }}</span>
        <strong>&#8377;{{ cart.total() }}</strong>
      </a>

      <div *ngIf="toast()" class="toast">{{ toast() }}</div>
    </div>
  `,
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements OnDestroy {
  protected readonly catalog = inject(CatalogService);
  public readonly cart = inject(CartService);
  protected readonly favorites = inject(FavoritesService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);

  public readonly activeCategory = signal('all');
  public readonly activeFilter = signal('Popular');
  public readonly query = signal('');
  public readonly activeSlide = signal(0);
  public readonly toast = signal<string | null>(null);

  private readonly restaurantFavorites = new Set<string>();

  public readonly heroSlides: HeroSlide[] = [
    {
      image: '/assets/images/hero-banners/pizza-offer.png',
      title: 'Premium food, delivered fast',
      subtitle: 'Discover top-rated restaurants and exclusive deals in your area.',
      ctaPrimary: 'Order Now',
      ctaSecondary: 'Explore Menu',
      badge: 'Hot Deals',
      offer: '30% OFF on first order',
    },
    {
      image: '/assets/images/hero-banners/healthy-food.png',
      title: 'Fresh flavors for every craving',
      subtitle: 'Healthy bites and chef specials ready to reach your door.',
      ctaPrimary: 'Find Healthy',
      ctaSecondary: 'View Offers',
      badge: 'Eat Better',
      offer: 'Free delivery on ₹399+',
    },
    {
      image: '/assets/images/hero-banners/burger-deal.png',
      title: 'Satisfy your hunger instantly',
      subtitle: 'Swipe through premium picks from your favorite local kitchens.',
      ctaPrimary: 'Browse Restaurants',
      ctaSecondary: 'Best Picks',
      badge: 'Local Favorites',
      offer: 'Up to 40% off selected restaurants',
    },
  ];

  public readonly topCategories: CategoryTile[] = this.catalog
    .categoryList()
    .filter((c) => c.id !== 'all' && !!c.imageUrl)
    .map((c, i) => {
      const tones: TileTone[] = ['orange', 'amber', 'rose', 'green', 'sky', 'slate'];
      return {
        id: c.id,
        label: c.label,
        imageUrl: c.imageUrl!,
        tone: tones[i % tones.length],
      };
    });

  private readonly heroTimer = window.setInterval(() => {
    const next = (this.activeSlide() + 1) % this.heroSlides.length;
    this.activeSlide.set(next);
  }, 6500);

  protected readonly displayName = computed(() => {
    const user = this.session.user();
    return user ? user.firstName : 'Madhu';
  });

  public readonly activeHero = computed(() => this.heroSlides[this.activeSlide()]);

  public readonly restaurantCards = computed(() => {
    const selected = this.activeCategory();
    const queryTerms = this.searchTerms(this.query());
    const filter = this.activeFilter();

    let list = this.catalog.restaurantList().filter((restaurant) => {
      const matchesCategory = selected === 'all' || restaurant.category === selected;
      const matchesQuery = queryTerms.every((term) =>
        this.normalize(this.restaurantIndex(restaurant)).includes(term),
      );
      return matchesCategory && matchesQuery;
    });

    if (filter === 'Top Rated') {
      list = list.sort((left, right) => right.rating - left.rating);
    } else if (filter === 'Offers') {
      list = list.sort((left, right) => right.rating - left.rating);
    } else if (filter === 'Near Me') {
      list = list.sort(
        (left, right) => parseInt(left.deliveryMinutes) - parseInt(right.deliveryMinutes),
      );
    } else {
      list = list.sort((left, right) => right.rating - left.rating);
    }

    return list.slice(0, 5);
  });

  public readonly popularDishes = computed<DishCard[]>(() => {
    const selected = this.activeCategory();
    const queryTerms = this.searchTerms(this.query());

    return this.catalog
      .menuItemsSignal()
      .filter((item) => {
        const matchesCategory = this.catalog.matchesDishCategory(item, selected);
        const matchesQuery = queryTerms.every((term) =>
          this.normalize(this.itemIndex(item)).includes(term),
        );
        return matchesCategory && matchesQuery;
      })
      .sort((left, right) => right.rating - left.rating)
      .slice(0, 6)
      .map((item, index) => ({
        item,
        restaurant: this.catalog.restaurantById(item.restaurantId),
        deliveryTime:
          this.catalog.restaurantById(item.restaurantId)?.deliveryMinutes ??
          `${22 + index * 2} min`,
        badge: index % 3 === 0 ? 'Top Rated' : index % 3 === 1 ? '30 Min' : 'Chef Pick',
        tone:
          index % 6 === 0
            ? 'green'
            : index % 6 === 1
              ? 'orange'
              : index % 6 === 2
                ? 'slate'
                : index % 6 === 3
                  ? 'rose'
                  : index % 6 === 4
                    ? 'sky'
                    : 'amber',
      }));
  });

  public readonly foodMenu = computed(() => this.popularDishes().slice(0, 6));

  public onSearchChange(value: string): void {
    this.query.set(value);
    const category = this.categoryFromQuery(value);
    if (category) {
      this.activeCategory.set(category);
    }
  }

  public setCategory(categoryId: string): void {
    this.activeCategory.set(categoryId);
  }

  public addToCart(item: MenuItem): void {
    const restaurant = this.catalog.restaurantById(item.restaurantId);
    if (!restaurant) {
      return;
    }

    this.cart.addItem({
      id: `${restaurant.id}-${item.id}`,
      restaurantId: restaurant.id,
      backendRestaurantId: restaurant.backendId,
      backendMenuItemId: item.backendId,
      restaurantName: restaurant.name,
      name: item.name,
      description: item.description,
      price: item.price,
      quantity: 1,
      imageUrl: item.imageUrl,
    } satisfies CartItem);

    this.toast.set(`${item.name} added to cart`);
    window.setTimeout(() => this.toast.set(null), 1600);
  }

  public navigateToMenu(): void {
    this.router.navigate(['/categories/pizza']);
  }

  public exploreMenu(): void {
    this.router.navigate(['/home']);
  }

  public offerFor(restaurant: Restaurant): string {
    const value = Math.max(15, Math.round((restaurant.rating - 4) * 25));
    return `${value}% OFF`;
  }

  public distanceFor(index: number): string {
    return (1.2 + index * 0.4).toFixed(1);
  }

  public trackCategory(_index: number, category: CategoryTile): string {
    return category.id;
  }

  public trackDish(_index: number, dish: DishCard): string {
    return dish.item.id;
  }

  public trackRestaurant(_index: number, restaurant: Restaurant): string {
    return restaurant.id;
  }

  ngOnDestroy(): void {
    window.clearInterval(this.heroTimer);
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private searchTerms(value: string): string[] {
    const normalized = this.normalize(value);
    return normalized ? normalized.split(' ').filter((term) => term.length > 1) : [];
  }

  private restaurantIndex(restaurant: Restaurant): string {
    const categoryLabel =
      this.catalog.categoryList().find((category) => category.id === restaurant.category)?.label ??
      restaurant.category;
    return [restaurant.name, restaurant.cuisine, categoryLabel, restaurant.description].join(' ');
  }

  private itemIndex(item: MenuItem): string {
    const restaurant = this.catalog.restaurantById(item.restaurantId);
    const categoryLabel = this.catalog.categoryLabel(restaurant?.category ?? item.category);
    return [item.name, item.description, item.category, restaurant?.name, categoryLabel].join(' ');
  }

  private categoryFromQuery(value: string): string | null {
    const normalized = this.normalize(value);
    if (!normalized) {
      return null;
    }

    const match = this.topCategories.find(
      (category: CategoryTile) => this.normalize(category.label) === normalized,
    );
    return match?.id ?? null;
  }

  public toggleFavorite(item: MenuItem, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.favorites.toggle(item);
    if (this.favorites.isFavorite(item.id)) {
      this.toast.set(`${item.name} added to favorites`);
    } else {
      this.toast.set(`${item.name} removed from favorites`);
    }
    window.setTimeout(() => this.toast.set(null), 2000);
  }

  public isRestaurantFavorite(id: string): boolean {
    return this.restaurantFavorites.has(id);
  }

  public toggleRestaurantFavorite(restaurant: Restaurant, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.restaurantFavorites.has(restaurant.id)) {
      this.restaurantFavorites.delete(restaurant.id);
      this.toast.set(`${restaurant.name} removed from favorites`);
    } else {
      this.restaurantFavorites.add(restaurant.id);
      this.toast.set(`${restaurant.name} added to favorites`);
    }
    window.setTimeout(() => this.toast.set(null), 2000);
  }
}
