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
            <span aria-hidden="true" class="search-icon">🔍</span>
            <input
              [value]="query()"
              (input)="onSearchChange($any($event.target).value)"
              placeholder="Search food, restaurants or cuisines..."
              aria-label="Search food, restaurants or cuisines"
            />
            <button
              *ngIf="query()"
              type="button"
              class="clear-search-btn"
              (click)="clearSearch()"
              aria-label="Clear search"
            >
              ✕
            </button>
          </div>
        </div>
      </section>

      <section class="categories-section" @fadeRise>
        <div class="section-heading section-heading--compact">
          <div>
            <h2>Food categories</h2>
            <p>Quick access to your favorite dishes and cuisines.</p>
          </div>
          <a routerLink="/categories/all" class="view-all link">View all</a>
        </div>

        <div class="category-strip">
          <a
            *ngFor="let category of topCategories; trackBy: trackCategory"
            [routerLink]="['/categories', category.id]"
            class="category-pill"
          >
            <div class="image-wrapper">
              <img [src]="category.imageUrl" [alt]="category.label" />
            </div>
            <span>{{ category.label }}</span>
          </a>
        </div>
      </section>

      <section class="food-menu-section" @fadeRise>
        <div class="section-heading section-heading--compact">
          <div>
            <h2>{{ query().trim() ? 'Search Results' : 'Popular dishes' }}</h2>
            <p>{{ query().trim() ? (foodMenu().length + ' dishes matching your search') : 'Top picks from nearby restaurants to satisfy your cravings.' }}</p>
          </div>
          <div class="heading-actions">
            <a routerLink="/categories/all" class="view-all link">View all</a>
            <a routerLink="/cart" class="view-all link">View cart</a>
          </div>
        </div>

        <div class="food-menu-grid">
          <article
            *ngFor="let dish of foodMenu(); trackBy: trackDish"
            class="food-card"
            [routerLink]="['/restaurants', dish.item.restaurantId]"
            [queryParams]="{ dish: dish.item.id }"
            role="button"
            tabindex="0"
          >
            <div class="food-card__media">
              <img [src]="dish.item.imageUrl" [alt]="dish.item.name" />
              <div class="diet-indicator" [ngClass]="dish.item.isVeg ? 'veg' : 'non-veg'">
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
                <span class="rating">⭐ {{ dish.item.rating.toFixed(1) }}</span>
                <span>•</span>
                <span class="restaurant-name-tag">{{ dish.restaurant?.name || 'QuickBite' }}</span>
                <span>•</span>
                <span>{{ dish.deliveryTime }}</span>
              </div>
              <h3>{{ dish.item.name }}</h3>
              <p>{{ dish.item.description }}</p>
              <div class="food-card__footer">
                <strong>₹{{ dish.item.price }}</strong>
                <span class="btn-view-menu">View in Menu →</span>
              </div>
            </div>
          </article>
        </div>

        <div *ngIf="foodMenu().length === 0" class="empty-state-box">
          <p>No dishes match your search criteria.</p>
          <button type="button" class="btn-reset-filters" (click)="clearSearch()">Clear Search</button>
        </div>
      </section>

      <section class="nearby-section" id="restaurants" @fadeRise>
        <div class="section-heading section-heading--compact">
          <div>
            <h2>Restaurants near you</h2>
            <p>Premium restaurant picks with live delivery info.</p>
          </div>
          <span class="restaurant-count-pill">{{ restaurantCards().length }} restaurants</span>
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
  public readonly catalog = inject(CatalogService);
  public readonly cart = inject(CartService);
  protected readonly favorites = inject(FavoritesService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);

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
    const queryTerms = this.searchTerms(this.query());
    const filter = this.activeFilter();

    let list = this.catalog.restaurantList().filter((restaurant) => {
      return (
        queryTerms.length === 0 ||
        queryTerms.every((term) =>
          this.normalize(this.restaurantIndex(restaurant)).includes(term),
        )
      );
    });

    const designatedOrder = [
      'urban-bites',
      'crust-and-co',
      'wok-and-bowl',
      'green-spoon',
      'royal-tadka',
      'the-food-yard',
    ];

    if (filter === 'Top Rated') {
      list = list.sort((left, right) => right.rating - left.rating);
    } else if (filter === 'Offers') {
      list = list.sort((left, right) => right.rating - left.rating);
    } else if (filter === 'Near Me') {
      list = list.sort(
        (left, right) => parseInt(left.deliveryMinutes) - parseInt(right.deliveryMinutes),
      );
    } else {
      list = list.sort((left, right) => {
        const idxA = designatedOrder.indexOf(left.id);
        const idxB = designatedOrder.indexOf(right.id);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
      });
    }

    // Always display all 6 restaurants
    return list.slice(0, 6);
  });

  // Exactly 6 diverse signature dishes for the home dashboard
  public readonly popularDishes = computed<DishCard[]>(() => {
    const vegPref = this.catalog.vegFilter();
    const allItems = this.catalog.menuItemsSignal();

    let targetIds: string[];

    if (vegPref === 'VEG') {
      // 6 signature veg items representing distinct categories
      targetIds = [
        'veggie-burger',          // Quick Bites
        'margherita-pizza',       // Pizza & Pasta
        'daal-makhani',           // Indian
        'tonki-hakka-noodles',    // Asian
        'buddha-bowl',            // Healthy
        'choco-lava-cake',        // Desserts
      ];
    } else if (vegPref === 'NON_VEG') {
      // 6 signature non-veg items representing distinct categories
      targetIds = [
        'classic-cheeseburger',   // Quick Bites
        'chicken-tikka-pizza',    // Pizza & Pasta
        'chicken-biryani',        // Indian
        'chicken-chow-mein',      // Asian
        'chicken-protein-bowl',   // Healthy
        'pepperoni-feast',        // Pizza & Pasta
      ];
    } else {
      // 6 diverse signature items across categories
      targetIds = [
        'classic-cheeseburger',   // Quick Bites
        'margherita-pizza',       // Pizza & Pasta
        'chicken-biryani',        // Indian
        'tonki-hakka-noodles',    // Asian
        'buddha-bowl',            // Healthy
        'choco-lava-cake',        // Desserts
      ];
    }

    const items: MenuItem[] = [];
    for (const id of targetIds) {
      const found = allItems.find((it) => it.id === id);
      if (found) {
        items.push(found);
      }
    }

    // Fallback if needed to ensure exactly 6 items
    if (items.length < 6) {
      for (const it of allItems) {
        if (items.length >= 6) break;
        if (!items.some((existing) => existing.id === it.id)) {
          if (vegPref === 'VEG' && !it.isVeg) continue;
          if (vegPref === 'NON_VEG' && it.isVeg) continue;
          items.push(it);
        }
      }
    }

    return items.slice(0, 6).map((item, index) => this.toDishCard(item, index));
  });

  // Search results or top 6 popular dishes
  public readonly foodMenu = computed<DishCard[]>(() => {
    const q = this.query().trim();
    if (!q) {
      return this.popularDishes();
    }

    const queryTerms = this.searchTerms(q);
    const vegPref = this.catalog.vegFilter();
    let list = this.catalog.menuItemsSignal();

    // Check if query is looking for non-veg specifically
    const isExplicitNonVegSearch = /\b(chicken|mutton|meat|fish|prawn|bacon|pepperoni|non-veg|nonveg)\b/i.test(q);

    if (vegPref === 'VEG' && !isExplicitNonVegSearch) {
      list = list.filter((item) => item.isVeg === true);
    } else if (vegPref === 'NON_VEG') {
      list = list.filter((item) => item.isVeg === false);
    }

    list = list.filter((item) => this.matchesSearch(item, q, queryTerms));

    const normQ = this.normalize(q);
    list = list.slice().sort((a, b) => {
      const aInName = this.normalize(a.name).includes(normQ) ? 1 : 0;
      const bInName = this.normalize(b.name).includes(normQ) ? 1 : 0;
      if (aInName !== bInName) return bInName - aInName;
      return b.rating - a.rating;
    });

    return list.map((item, index) => this.toDishCard(item, index));
  });

  private toDishCard(item: MenuItem, index: number): DishCard {
    const tones: TileTone[] = ['green', 'orange', 'slate', 'rose', 'sky', 'amber'];
    return {
      item,
      restaurant: this.catalog.restaurantById(item.restaurantId),
      deliveryTime:
        this.catalog.restaurantById(item.restaurantId)?.deliveryMinutes ??
        `${20 + (index % 5) * 3} min`,
      badge:
        index % 3 === 0
          ? 'Top Rated'
          : index % 3 === 1
            ? 'Popular'
            : 'Chef Pick',
      tone: tones[index % tones.length],
    };
  }

  public onSearchChange(value: string): void {
    this.query.set(value);
  }

  public clearSearch(): void {
    this.query.set('');
  }

  public navigateToMenu(): void {
    this.router.navigate(['/categories/quick-bites']);
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

  private matchesSearch(item: MenuItem, query: string, queryTerms: string[]): boolean {
    const normName = this.normalize(item.name);
    const normDesc = this.normalize(item.description || '');
    const nameAndDesc = `${normName} ${normDesc}`;
    const restaurant = this.catalog.restaurantById(item.restaurantId);
    const normRest = restaurant ? this.normalize(restaurant.name) : '';

    // If query contains 'pasta' and does NOT contain 'pizza', strictly exclude pizza items
    if (queryTerms.includes('pasta') && !queryTerms.includes('pizza')) {
      if (!nameAndDesc.includes('pasta')) return false;
    }

    // If query contains 'pizza' and does NOT contain 'pasta', strictly exclude pasta items
    if (queryTerms.includes('pizza') && !queryTerms.includes('pasta')) {
      if (!nameAndDesc.includes('pizza')) return false;
    }

    // If query contains 'burger', do not show sandwich or wraps unless burger is in name/desc
    if (queryTerms.includes('burger')) {
      if (!nameAndDesc.includes('burger')) return false;
    }

    // Direct match against item name and description
    if (queryTerms.every((term) => nameAndDesc.includes(term))) {
      return true;
    }

    // Match against restaurant name (e.g. searching 'urban bites')
    if (normRest && queryTerms.every((term) => normRest.includes(term))) {
      return true;
    }

    // Match against pure category names (e.g. searching 'Indian', 'Healthy', 'Asian', 'Dessert', 'Drinks')
    const catLabel = this.catalog.categoryLabel(item.category).toLowerCase();
    if (catLabel !== 'pizza & pasta') {
      const normCat = this.normalize(catLabel);
      if (queryTerms.every((term) => normCat.includes(term))) {
        return true;
      }
    }

    return false;
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
    const categoryLabel = this.catalog.categoryLabel(item.category);
    return [
      item.name,
      item.description,
      item.category,
      restaurant?.name ?? '',
      categoryLabel,
      item.isVeg ? 'veg vegetarian' : 'non-veg nonveg chicken mutton meat',
    ].join(' ');
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
