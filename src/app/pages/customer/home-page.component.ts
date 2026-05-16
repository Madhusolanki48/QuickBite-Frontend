import { NgClass, NgFor } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import { register } from 'swiper/element/bundle';

import { CartItem, MenuItem, Restaurant } from '../../core/app.models';
import { CartService } from '../../services/cart.service';
import { CatalogService } from '../../services/catalog.service';
import { FavoritesService } from '../../services/favorites.service';
import { SessionService } from '../../services/session.service';

type TileTone = 'orange' | 'green' | 'amber' | 'slate';

interface BannerSlide {
  badge: string;
  ribbon: string;
  title: string;
  copy: string;
  cta: string;
  imageUrl: string;
}

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

register();

@Component({
  selector: 'app-home-page',
  imports: [NgClass, NgFor, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  animations: [
    trigger('fadeRise', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(14px)' }),
        animate('420ms cubic-bezier(0.22, 1, 0.36, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
  template: `
    <div class="grid w-full gap-5 text-[var(--text)]">
      <section
        @fadeRise
        class="overflow-hidden rounded-[32px] border border-[var(--line)] bg-[var(--surface-soft)] shadow-glow backdrop-blur-xl"
      >
        <div class="grid md:grid-cols-[0.9fr,1.1fr]">
          <div class="flex flex-col justify-between gap-4 bg-[linear-gradient(135deg,var(--surface),rgba(255,248,242,0.95))] p-4 md:p-6">
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <img
                  src="/assets/images/avatar/user%20avatar.jpg"
                  alt="User profile"
                  class="h-11 w-11 rounded-full object-cover shadow-soft"
                />
                <div>
                  <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">
                    Hello, {{ displayName() }} &#128075;
                  </p>
                  <h1 class="mt-1 font-['Space_Grotesk'] text-[1.95rem] font-bold tracking-[-0.06em] text-[var(--text)] md:text-[2.35rem]">
                    Cravings delivered fast.
                  </h1>
                </div>
              </div>

              <p class="max-w-xl text-sm leading-6 text-[var(--muted)] md:text-[0.98rem]">
                Warm, cinematic food delivery with premium offers, quick drop-offs, and restaurant picks that feel delicious to scroll.
              </p>

              <div class="rounded-full border border-[var(--line)] bg-[var(--surface)] p-2 shadow-soft">
                <div class="flex items-center gap-2 rounded-full px-1.5 py-1">
                  <span
                    class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand"
                    aria-hidden="true"
                  >
                    &#128269;
                  </span>
                  <input
                    [value]="query()"
                    (input)="onSearchChange($any($event.target).value)"
                    placeholder="Search pizza, burger, biryani, dessert..."
                    aria-label="Search restaurants and dishes"
                    class="min-w-0 flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] md:text-[0.95rem]"
                  />
                  <button
                    type="button"
                    class="rounded-full bg-gradient-to-r from-brand to-orange-500 px-4 py-2 text-sm font-extrabold text-white shadow-soft transition hover:-translate-y-0.5"
                    (click)="scrollToCategories()"
                  >
                    Filter
                  </button>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <a
                routerLink="/cart"
                class="inline-flex w-fit rounded-full bg-gradient-to-r from-brand to-orange-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:-translate-y-0.5"
              >
                Order Now
              </a>
              <button
                type="button"
                class="inline-flex w-fit rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm font-extrabold text-[var(--text)] shadow-soft transition hover:-translate-y-0.5"
                (click)="scrollToRestaurants()"
              >
                Browse restaurants
              </button>
            </div>
          </div>

          <div class="quickbite-swiper group relative h-[300px] overflow-hidden md:h-[300px]">
            <swiper-container #heroSwiper class="h-full w-full" init="false">
              <swiper-slide *ngFor="let slide of heroSlides; trackBy: trackSlide">
                <article class="relative h-full overflow-hidden rounded-[28px]">
                  <img
                    [src]="slide.imageUrl"
                    [alt]="slide.title"
                    class="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
                  />
                  <div
                    class="absolute inset-0 bg-[linear-gradient(90deg,var(--surface-soft)_0%,rgba(255,248,242,0.88)_34%,rgba(255,248,242,0.14)_62%,rgba(255,248,242,0.04)_100%)]"
                  ></div>
                  <div class="absolute inset-0 bg-gradient-to-tr from-ink/15 via-transparent to-transparent"></div>

                  <span class="absolute left-4 top-4 rounded-full bg-brand/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-soft">
                    {{ slide.badge }}
                  </span>

                  <div class="absolute inset-y-0 left-0 flex items-center px-4 py-5 md:px-6">
                    <div class="max-w-md">
                      <h2 class="max-w-sm font-['Space_Grotesk'] text-[1.7rem] font-bold tracking-[-0.06em] text-[var(--text)] md:text-[2rem]">
                        {{ slide.title }}
                      </h2>
                      <p class="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
                        {{ slide.copy }}
                      </p>
                      <a
                        routerLink="/home"
                        class="mt-4 inline-flex rounded-full bg-gradient-to-r from-brand to-orange-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:-translate-y-0.5"
                      >
                        {{ slide.cta }}
                      </a>
                    </div>
                  </div>
                </article>
              </swiper-slide>
            </swiper-container>
          </div>
        </div>
      </section>

      <section
        id="categories"
        @fadeRise
        class="grid gap-3 rounded-[28px] border border-[var(--line)] bg-[var(--surface-soft)] p-4 shadow-soft backdrop-blur-xl"
      >
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">Categories</p>
            <h2 class="mt-1 font-['Space_Grotesk'] text-2xl font-bold tracking-[-0.05em] text-[var(--text)]">
              Compact food moods
            </h2>
          </div>
        </div>

        <div class="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-6 md:overflow-visible">
          <button
            type="button"
            *ngFor="let category of categoryTiles; trackBy: trackCategory"
            (click)="setCategory(category.id)"
            class="group flex h-[110px] min-w-[112px] flex-col items-center justify-center rounded-[20px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-center shadow-soft transition hover:-translate-y-1 hover:shadow-glow md:min-w-0"
            [ngClass]="activeCategory() === category.id ? 'ring-2 ring-brand/30 shadow-glow' : ''"
          >
            <span
              class="mx-auto grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand/15 via-white to-emerald-100"
            >
              <img [src]="category.imageUrl" [alt]="category.label" class="h-full w-full rounded-full object-cover" />
            </span>
            <strong class="mt-2 block text-sm font-bold text-[var(--text)]">{{ category.label }}</strong>
          </button>
        </div>
      </section>

      <section id="popular" @fadeRise class="grid gap-3">
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">Popular dishes</p>
            <h2 class="mt-1 font-['Space_Grotesk'] text-2xl font-bold tracking-[-0.05em] text-[var(--text)]">
              Most loved right now
            </h2>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article
            *ngFor="let dish of popularDishes(); trackBy: trackDish"
            @fadeRise
            class="group overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-soft)] shadow-soft transition hover:-translate-y-1 hover:shadow-glow"
          >
            <div class="relative aspect-[4/3] overflow-hidden">
              <img [src]="dish.item.imageUrl" [alt]="dish.item.name" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
              <span
                class="absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white shadow-soft"
                [ngClass]="badgeClass(dish.tone)"
              >
                {{ dish.badge }}
              </span>
              <button
                type="button"
                class="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-500 shadow-soft transition hover:-translate-y-0.5 hover:text-brand"
                [class.text-brand]="favorites.isFavorite(dish.item.id)"
                (click)="toggleFavorite(dish.item.id, $event)"
                aria-label="Toggle favorite"
              >
                &#9825;
              </button>
            </div>

            <div class="grid gap-3 p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="font-['Space_Grotesk'] text-base font-bold tracking-[-0.04em] text-[var(--text)]">
                    {{ dish.item.name }}
                  </h3>
                  <p class="mt-1 text-sm text-[var(--muted)]">{{ dish.restaurant?.name }}</p>
                </div>
                <span class="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-extrabold text-emerald-600">
                  &#9733; {{ dish.item.rating.toFixed(1) }}
                </span>
              </div>

              <div class="flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
                <span>{{ dish.deliveryTime }}</span>
                <span>&#8377;{{ dish.item.price }}</span>
              </div>

              <p class="text-sm leading-6 text-[var(--muted)]">{{ dish.item.description }}</p>

              <button
                type="button"
                class="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-orange-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:-translate-y-0.5"
                (click)="addToCart(dish.item)"
              >
                + Add to cart
              </button>
            </div>
          </article>
        </div>
      </section>

      <section
        id="restaurants"
        @fadeRise
        class="grid gap-3 rounded-[28px] border border-[var(--line)] bg-[var(--surface-soft)] p-4 shadow-soft backdrop-blur-xl"
      >
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">Restaurants</p>
            <h2 class="mt-1 font-['Space_Grotesk'] text-2xl font-bold tracking-[-0.05em] text-[var(--text)]">
              Signature spots near you
            </h2>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <a
            *ngFor="let restaurant of restaurantCards(); trackBy: trackRestaurant"
            @fadeRise
            class="group overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-soft)] shadow-soft transition hover:-translate-y-1 hover:shadow-glow"
            [routerLink]="['/restaurants', restaurant.id]"
          >
            <div class="relative aspect-[16/10] overflow-hidden">
              <img
                [src]="restaurant.imageUrl"
                [alt]="restaurant.name"
                class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
              <span
                class="absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white shadow-soft"
                [ngClass]="restaurant.status === 'OPEN' ? 'bg-emerald-500/95' : 'bg-slate-600/95'"
              >
                {{ restaurant.status === 'OPEN' ? 'Open now' : 'Closed' }}
              </span>
              <span class="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-[var(--text)] shadow-soft">
                {{ restaurant.deliveryMinutes }} min
              </span>
            </div>

            <div class="grid gap-2 p-4">
              <div class="flex items-start justify-between gap-3">
                <h3 class="font-['Space_Grotesk'] text-base font-bold tracking-[-0.04em] text-[var(--text)]">
                  {{ restaurant.name }}
                </h3>
                <span class="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-extrabold text-emerald-600">
                  &#9733; {{ restaurant.rating.toFixed(1) }}
                </span>
              </div>
              <p class="text-sm text-[var(--muted)]">{{ restaurant.cuisine }}</p>
              <div class="flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
                <span>{{ restaurant.description }}</span>
                <span>Min &#8377;{{ restaurant.minOrder }}</span>
              </div>
            </div>
          </a>
        </div>
      </section>

      <a
        routerLink="/cart"
        class="animate-bounce-soft fixed right-4 bottom-6 z-30 inline-flex items-center gap-3 rounded-[24px] bg-gradient-to-r from-brand to-orange-500 px-4 py-3 text-white shadow-glow"
        aria-label="View cart"
      >
        <span class="text-lg">&#128722;</span>
        <span class="flex flex-col leading-tight">
          <strong class="text-sm font-extrabold">{{ cart.itemCount() }} items</strong>
          <small class="text-xs text-white/90">&#8377;{{ cart.total() }}</small>
        </span>
        <span class="text-sm font-bold">&#8594;</span>
      </a>
    </div>
  `,
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements AfterViewInit {
  @ViewChild('heroSwiper', { static: true }) private readonly heroSwiper?: ElementRef<HTMLElement & { initialize: () => void }>;

  protected readonly catalog = inject(CatalogService);
  protected readonly cart = inject(CartService);
  protected readonly favorites = inject(FavoritesService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);

  protected readonly activeCategory = signal('all');
  protected readonly query = signal('');

  protected readonly heroSlides: BannerSlide[] = [
    {
      badge: '50% OFF',
      ribbon: 'Pizza night',
      title: 'Cravings delivered fast, hot and cinematic.',
      copy: 'Golden crusts, warm cheese pulls, and comfort food that lands with a premium finish.',
      cta: 'Order Now',
      imageUrl: '/assets/images/hero-banners/pizza-offer.png?v=20260429',
    },
    {
      badge: 'Free Delivery',
      ribbon: 'Burger rush',
      title: 'Hot meals from top restaurants near you.',
      copy: 'Juicy burgers, crisp fries, and rich sauces with a warm glow and quick delivery promise.',
      cta: 'Explore Offers',
      imageUrl: '/assets/images/hero-banners/burger-deal.jpg?v=20260429',
    },
    {
      badge: 'Trending',
      ribbon: 'Late night',
      title: 'Fresh food. Faster delivery. Better mood.',
      copy: 'A cozy, premium banner built for midnight cravings, easy browsing, and a delicious feed.',
      cta: 'Start Ordering',
      imageUrl: '/assets/images/hero-banners/midnight-banner.jpg?v=20260429',
    },
  ];

  protected readonly categoryTiles: CategoryTile[] = [
    { id: 'pizza', label: 'Pizza', imageUrl: '/assets/images/categories/pizza.png?v=20260429', tone: 'orange' },
    { id: 'burgers', label: 'Burger', imageUrl: '/assets/images/categories/burger.jpg?v=20260429', tone: 'amber' },
    { id: 'biryani', label: 'Biryani', imageUrl: '/assets/images/categories/indian thali.png?v=20260429', tone: 'green' },
    { id: 'sandwich', label: 'Sandwich', imageUrl: '/assets/images/food-items/garlic-bread.jpg?v=20260429', tone: 'slate' },
    { id: 'drinks', label: 'Drinks', imageUrl: '/assets/images/food-items/mango-lassi.jpg?v=20260429', tone: 'green' },
    { id: 'dessert', label: 'Dessert', imageUrl: '/assets/images/restaurants/icecream-world.jpg?v=20260429', tone: 'orange' },
  ];

  protected readonly displayName = computed(() => {
    const user = this.session.user();
    return user ? user.firstName : 'Madhu';
  });

  protected readonly restaurantCards = computed(() => {
    const selected = this.activeCategory();
    const queryTerms = this.searchTerms(this.query());

    return this.catalog
      .restaurantList()
      .filter((restaurant) => {
        const matchesCategory = selected === 'all' || restaurant.category === selected;
        const matchesQuery = queryTerms.every((term) => this.normalize(this.restaurantIndex(restaurant)).includes(term));
        return matchesCategory && matchesQuery;
      })
      .sort((left, right) => right.rating - left.rating)
      .slice(0, 6);
  });

  protected readonly popularDishes = computed<DishCard[]>(() => {
    const selected = this.activeCategory();
    const queryTerms = this.searchTerms(this.query());

    return this.catalog
      .menuItemsSignal()
      .filter((item) => {
        const restaurant = this.catalog.restaurantById(item.restaurantId);
        const itemCategory = this.normalize(item.category);
        const matchesCategory =
          selected === 'all' || restaurant?.category === selected || itemCategory.includes(selected);
        const matchesQuery = queryTerms.every((term) => this.normalize(this.itemIndex(item)).includes(term));
        return matchesCategory && matchesQuery;
      })
      .sort((left, right) => right.rating - left.rating)
      .slice(0, 8)
      .map((item, index) => ({
        item,
        restaurant: this.catalog.restaurantById(item.restaurantId),
        deliveryTime: this.catalog.restaurantById(item.restaurantId)?.deliveryMinutes ?? `${22 + index * 2} min`,
        badge: index % 3 === 0 ? 'Top Rated' : index % 3 === 1 ? '30 Min' : 'Chef Pick',
        tone: index % 4 === 0 ? 'orange' : index % 4 === 1 ? 'green' : index % 4 === 2 ? 'amber' : 'slate',
      }));
  });

  ngAfterViewInit(): void {
    const swiperEl = this.heroSwiper?.nativeElement;
    if (!swiperEl) {
      return;
    }

    Object.assign(swiperEl, {
      modules: [Autoplay, Pagination, Navigation],
      slidesPerView: 1,
      spaceBetween: 16,
      loop: true,
      autoplay: {
        delay: 3600,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      },
      pagination: { clickable: true },
      navigation: true,
    });

    swiperEl.initialize();
  }

  protected onSearchChange(value: string): void {
    this.query.set(value);
    const category = this.categoryFromQuery(value);
    if (category) {
      this.activeCategory.set(category);
    }
  }

  protected setCategory(categoryId: string): void {
    void this.router.navigate(['/categories', categoryId]);
  }

  protected scrollToCategories(): void {
    document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected scrollToRestaurants(): void {
    document.getElementById('restaurants')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected toggleFavorite(id: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const item = this.catalog.menuItemsSignal().find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    this.favorites.toggle(item);
    void this.router.navigate(['/favorites']);
  }

  protected addToCart(item: MenuItem): void {
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
  }

  protected trackSlide(_index: number, slide: BannerSlide): string {
    return slide.title;
  }

  protected trackCategory(_index: number, category: CategoryTile): string {
    return category.id;
  }

  protected trackDish(_index: number, dish: DishCard): string {
    return dish.item.id;
  }

  protected trackRestaurant(_index: number, restaurant: Restaurant): string {
    return restaurant.id;
  }

  protected badgeClass(tone: TileTone): string {
    switch (tone) {
      case 'green':
        return 'bg-emerald-500/95';
      case 'amber':
        return 'bg-amber-500/95';
      case 'slate':
        return 'bg-slate-700/95';
      case 'orange':
      default:
        return 'bg-brand/95';
    }
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

    const match = this.categoryTiles.find((category) => this.normalize(category.label) === normalized);
    return match?.id ?? null;
  }
}
