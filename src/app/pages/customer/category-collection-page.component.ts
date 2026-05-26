import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MenuItem, Restaurant } from '../../core/app.models';
import { CatalogService } from '../../services/catalog.service';
import { FavoritesService } from '../../services/favorites.service';

interface CategoryGroup {
  id: string;
  label: string;
  icon: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-category-collection-page',
  imports: [NgClass, NgFor, NgIf, RouterLink],
  template: `
    <section class="grid gap-6">
      <div class="flex items-center justify-between">
        <a
          routerLink="/home"
          class="inline-flex w-fit rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-bold text-slate-600 shadow-soft transition hover:-translate-y-0.5 hover:text-brand"
        >
          &#8592; Back to home
        </a>
      </div>

      <header class="rounded-[30px] border border-white/70 bg-white/75 p-5 shadow-glow backdrop-blur-xl md:p-6">
        <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">Menu Collection</p>
        <div class="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 class="font-['Space_Grotesk'] text-3xl font-bold tracking-[-0.06em] text-ink">
              {{ categoryId() === 'all' ? 'All Food & Restaurants' : categoryLabel() }}
            </h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {{
                categoryId() === 'all'
                  ? 'Browse every category and restaurant across our kitchen network.'
                  : 'Discover all restaurants and signature dishes serving ' + categoryLabel() + '.'
              }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <div class="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                class="rounded-full px-3.5 py-1.5 text-xs font-bold transition"
                [ngClass]="catalog.vegFilter() === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'"
                (click)="catalog.setVegFilter('ALL')"
              >
                All
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition"
                [ngClass]="catalog.vegFilter() === 'VEG' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-emerald-700'"
                (click)="catalog.setVegFilter('VEG')"
              >
                <span class="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
                Veg Only
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition"
                [ngClass]="catalog.vegFilter() === 'NON_VEG' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-rose-700'"
                (click)="catalog.setVegFilter('NON_VEG')"
              >
                <span class="inline-block h-2 w-2 rounded-full bg-rose-400"></span>
                Non-Veg
              </button>
            </div>

            <div class="rounded-[20px] border border-white/70 bg-white/85 px-4 py-2 shadow-soft">
              <span class="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Showing</span>
              <strong class="block font-['Space_Grotesk'] text-lg text-ink">
                {{ matchingRestaurants().length }} kitchen(s) • {{ totalItemCount() }} items
              </strong>
            </div>
          </div>
        </div>
      </header>

      <!-- SECTION 1: RESTAURANTS OFFERING THIS CATEGORY (Always First!) -->
      <section class="rounded-[28px] border border-slate-100 bg-white/90 p-5 shadow-soft md:p-6" *ngIf="matchingRestaurants().length > 0">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span class="text-xs font-extrabold uppercase tracking-widest text-brand">Restaurant Selection</span>
            <h2 class="font-['Space_Grotesk'] text-2xl font-bold tracking-tight text-ink">
              Restaurants Serving {{ categoryLabel() }}
            </h2>
            <p class="text-xs text-slate-500">Select a restaurant to open its full menu and order.</p>
          </div>
          <span class="rounded-full bg-brand/10 px-3 py-1 text-xs font-extrabold text-brand">
            {{ matchingRestaurants().length }} Restaurants Available
          </span>
        </div>

        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <article
            *ngFor="let rest of matchingRestaurants()"
            class="group cursor-pointer overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-soft transition hover:-translate-y-1 hover:border-brand/50 hover:shadow-glow"
            [routerLink]="['/restaurants', rest.id]"
            [queryParams]="categoryId() !== 'all' ? { category: categoryId() } : {}"
          >
            <div class="relative aspect-[16/9] overflow-hidden rounded-[18px]">
              <img
                [src]="rest.imageUrl"
                [alt]="rest.name"
                class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
              <span class="absolute top-3 left-3 rounded-full bg-black/75 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
                ⏱ {{ rest.deliveryMinutes }} min
              </span>
              <span class="absolute top-3 right-3 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow">
                ★ {{ rest.rating.toFixed(1) }}
              </span>
            </div>

            <div class="mt-3">
              <div class="flex items-center justify-between">
                <h3 class="font-['Space_Grotesk'] text-lg font-bold text-ink">{{ rest.name }}</h3>
                <span class="text-xs font-semibold text-slate-500">₹{{ rest.minOrder }} min</span>
              </div>
              <p class="mt-1 text-xs text-slate-500 line-clamp-1">{{ rest.cuisine }}</p>

              <!-- Category Dishes Preview -->
              <div class="mt-2.5 flex flex-wrap gap-1.5" *ngIf="categoryId() !== 'all'">
                <span
                  *ngFor="let dishName of dishesPreviewInRest(rest.id)"
                  class="rounded-lg bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-brand"
                >
                  {{ dishName }}
                </span>
              </div>

              <div class="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <span class="text-xs font-bold text-brand">
                  {{ countDishesInRest(rest.id) }} {{ categoryLabel() }} dishes
                </span>
                <span class="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition group-hover:bg-brand">
                  {{ categoryId() !== 'all' ? ('Order ' + categoryLabel() + ' →') : 'View Menu →' }}
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- Empty State if no restaurants match -->
      <div *ngIf="matchingRestaurants().length === 0" class="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-soft">
        <span class="text-4xl">🍽️</span>
        <h3 class="mt-3 font-['Space_Grotesk'] text-lg font-bold text-ink">No restaurants found</h3>
        <p class="mt-1 text-sm text-slate-500">No restaurants currently serve {{ categoryLabel() }} matching your diet filter.</p>
        <a routerLink="/home" class="mt-4 inline-flex rounded-full bg-brand px-5 py-2 text-xs font-bold text-white shadow-soft">
          Browse All Restaurants
        </a>
      </div>

      <!-- SECTION 2: DISHES (Categorized by category or single view) -->
      <!-- View All Mode -->
      <div class="grid gap-10" *ngIf="categoryId() === 'all'">
        <section *ngFor="let group of categoryGroups()" class="category-block">
          <div class="mb-4 flex items-center justify-between border-b border-slate-200/90 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-2xl">{{ group.icon }}</span>
              <h2 class="font-['Space_Grotesk'] text-2xl font-bold tracking-tight text-ink">{{ group.label }}</h2>
              <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{{ group.items.length }} dishes</span>
            </div>
            <a [routerLink]="['/categories', group.id]" class="text-xs font-bold text-brand hover:underline">
              View only {{ group.label }} →
            </a>
          </div>

          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article *ngFor="let item of group.items; trackBy: trackItem" class="group overflow-hidden rounded-[28px] border border-white/70 bg-white/85 shadow-soft transition hover:-translate-y-1 hover:shadow-glow">
              <div class="relative aspect-[4/3] overflow-hidden">
                <img [src]="item.imageUrl" [alt]="item.name" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                <span class="absolute left-3 top-3 rounded-full bg-brand/90 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white shadow-soft">
                  {{ group.label }}
                </span>
                <div
                  class="absolute left-3 bottom-3 flex h-5 w-5 items-center justify-center rounded bg-white shadow"
                  [ngClass]="item.isVeg ? 'border border-emerald-600' : 'border border-rose-600'"
                >
                  <div class="h-2 w-2 rounded-full" [ngClass]="item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'"></div>
                </div>
                <button
                  type="button"
                  class="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-500 shadow-soft transition hover:-translate-y-0.5 hover:text-brand"
                  [class.text-brand]="favorites.isFavorite(item.id)"
                  (click)="toggleFavorite(item, $event)"
                  aria-label="Toggle favorite"
                >
                  {{ favorites.isFavorite(item.id) ? '♥' : '♡' }}
                </button>
              </div>

              <div class="grid gap-3 p-4">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h3 class="font-['Space_Grotesk'] text-base font-bold tracking-[-0.04em] text-ink">{{ item.name }}</h3>
                    <p class="mt-1 text-sm text-slate-500">{{ restaurantName(item) }}</p>
                  </div>
                  <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-600">
                    ★ {{ item.rating.toFixed(1) }}
                  </span>
                </div>
                <p class="text-sm leading-6 text-slate-600 line-clamp-2">{{ item.description }}</p>
                <div class="flex items-center justify-between gap-3 text-sm text-slate-500">
                  <span>{{ deliveryTime(item) }}</span>
                  <strong class="text-base text-ink">₹{{ item.price }}</strong>
                </div>
                <a
                  [routerLink]="['/restaurants', item.restaurantId]"
                  [queryParams]="{ dish: item.id }"
                  class="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-orange-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow"
                >
                  View in {{ restaurantName(item) }} &rarr;
                </a>
              </div>
            </article>
          </div>

          <div *ngIf="group.items.length === 0" class="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
            No {{ catalog.vegFilter() === 'VEG' ? 'vegetarian' : 'non-vegetarian' }} items in {{ group.label }}.
          </div>
        </section>
      </div>


    </section>
  `,
  styleUrl: './customer-pages.scss',
})
export class CategoryCollectionPageComponent {
  private readonly route = inject(ActivatedRoute);
  public readonly catalog = inject(CatalogService);
  protected readonly favorites = inject(FavoritesService);

  public readonly categoryId = signal(
    this.route.snapshot.paramMap.get('id') ?? 'all',
  );

  // Exact categories separated: Burger, Pizza, Pasta first, then others
  private readonly orderedCategoryDefinitions = [
    { id: 'burger', label: 'Burger', icon: '🍔' },
    { id: 'pizza', label: 'Pizza', icon: '🍕' },
    { id: 'pasta', label: 'Pasta', icon: '🍝' },
    { id: 'quick-bites', label: 'Quick Bites', icon: '🥪' },
    { id: 'indian', label: 'Indian', icon: '🍛' },
    { id: 'asian', label: 'Asian', icon: '🥡' },
    { id: 'sides', label: 'Sides', icon: '🍟' },
    { id: 'healthy', label: 'Healthy', icon: '🥗' },
    { id: 'desserts', label: 'Desserts', icon: '🍰' },
    { id: 'drinks', label: 'Drinks', icon: '🥤' },
  ];

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.categoryId.set(id);
      }
    });
  }

  protected readonly categoryLabel = computed(() => {
    return this.catalog.categoryLabel(this.categoryId());
  });

  protected readonly matchingRestaurants = computed<Restaurant[]>(() => {
    const catId = this.categoryId();
    const vegPref = this.catalog.vegFilter();
    const rests = this.catalog.restaurantsForCategory(catId);

    if (vegPref === 'ALL') {
      return rests;
    }

    return rests.filter((r) => {
      const dishes = this.catalog
        .menuForRestaurant(r.id)
        .filter((it) => this.catalog.matchesDishCategory(it, catId));
      if (vegPref === 'VEG') {
        return dishes.some((it) => it.isVeg === true);
      }
      return dishes.some((it) => it.isVeg === false);
    });
  });

  // Grouped category by category for "View All"
  protected readonly categoryGroups = computed<CategoryGroup[]>(() => {
    const vegPref = this.catalog.vegFilter();
    const allItems = this.catalog.menuItemsSignal();

    return this.orderedCategoryDefinitions.map((def) => {
      let items = allItems.filter((item) =>
        this.catalog.matchesDishCategory(item, def.id),
      );

      if (vegPref === 'VEG') {
        items = items.filter((item) => item.isVeg === true);
      } else if (vegPref === 'NON_VEG') {
        items = items.filter((item) => item.isVeg === false);
      }

      return {
        id: def.id,
        label: def.label,
        icon: def.icon,
        items: items.slice().sort((a, b) => b.rating - a.rating),
      };
    });
  });

  // Items for single category view
  protected readonly singleCategoryItems = computed<MenuItem[]>(() => {
    const catId = this.categoryId();
    const vegPref = this.catalog.vegFilter();
    let list = this.catalog
      .menuItemsSignal()
      .filter((item) => this.catalog.matchesDishCategory(item, catId));

    if (vegPref === 'VEG') {
      list = list.filter((item) => item.isVeg === true);
    } else if (vegPref === 'NON_VEG') {
      list = list.filter((item) => item.isVeg === false);
    }

    return list.slice().sort((left, right) => right.rating - left.rating);
  });

  protected readonly totalItemCount = computed(() => {
    if (this.categoryId() === 'all') {
      return this.categoryGroups().reduce((acc, g) => acc + g.items.length, 0);
    }
    return this.singleCategoryItems().length;
  });

  countDishesInRest(restaurantId: string): number {
    const catId = this.categoryId();
    const vegPref = this.catalog.vegFilter();
    let list = this.catalog
      .menuForRestaurant(restaurantId)
      .filter((it) => this.catalog.matchesDishCategory(it, catId));

    if (vegPref === 'VEG') {
      list = list.filter((it) => it.isVeg === true);
    } else if (vegPref === 'NON_VEG') {
      list = list.filter((it) => it.isVeg === false);
    }

    return list.length;
  }

  dishesPreviewInRest(restaurantId: string): string[] {
    const catId = this.categoryId();
    const vegPref = this.catalog.vegFilter();
    let list = this.catalog
      .menuForRestaurant(restaurantId)
      .filter((it) => this.catalog.matchesDishCategory(it, catId));

    if (vegPref === 'VEG') {
      list = list.filter((it) => it.isVeg === true);
    } else if (vegPref === 'NON_VEG') {
      list = list.filter((it) => it.isVeg === false);
    }

    return list.map((it) => it.name).slice(0, 3);
  }

  protected trackItem(_index: number, item: MenuItem): string {
    return item.id;
  }

  protected restaurantName(item: MenuItem): string {
    return this.catalog.restaurantById(item.restaurantId)?.name ?? 'QuickBite Kitchen';
  }

  protected deliveryTime(item: MenuItem): string {
    return this.catalog.restaurantById(item.restaurantId)?.deliveryMinutes ?? `${18 + (item.price % 10)} min`;
  }

  protected toggleFavorite(item: MenuItem, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.favorites.toggle(item);
  }
}
