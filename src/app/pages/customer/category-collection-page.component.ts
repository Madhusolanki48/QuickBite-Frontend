import { NgFor, NgIf } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CartItem, MenuItem } from '../../core/app.models';
import { CartService } from '../../services/cart.service';
import { CatalogService } from '../../services/catalog.service';
import { FavoritesService } from '../../services/favorites.service';

@Component({
  selector: 'app-category-collection-page',
  imports: [NgFor, NgIf, RouterLink],
  template: `
    <section class="grid gap-4">
      <a routerLink="/home" class="inline-flex w-fit rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-bold text-slate-600 shadow-soft transition hover:-translate-y-0.5 hover:text-brand">
        &#8592; Back to home
      </a>

      <header class="rounded-[30px] border border-white/70 bg-white/75 p-4 shadow-glow backdrop-blur-xl md:p-5">
        <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">Category</p>
        <div class="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 class="font-['Space_Grotesk'] text-3xl font-bold tracking-[-0.06em] text-ink">
              {{ categoryLabel() }}
            </h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Browse every {{ categoryLabel().toLowerCase() }} item in a dedicated premium collection view.
            </p>
          </div>
          <div class="rounded-[24px] border border-white/70 bg-white/85 px-4 py-3 shadow-soft">
            <span class="block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Items found</span>
            <strong class="mt-1 block font-['Space_Grotesk'] text-xl text-ink">{{ items().length }}</strong>
          </div>
        </div>
      </header>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article *ngFor="let item of items(); trackBy: trackItem" class="group overflow-hidden rounded-[28px] border border-white/70 bg-white/85 shadow-soft transition hover:-translate-y-1 hover:shadow-glow">
          <div class="relative aspect-[4/3] overflow-hidden">
            <img [src]="item.imageUrl" [alt]="item.name" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            <span class="absolute left-3 top-3 rounded-full bg-brand/90 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white shadow-soft">
              {{ categoryLabel() }}
            </span>
            <button
              type="button"
              class="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-500 shadow-soft transition hover:-translate-y-0.5 hover:text-brand"
              [class.text-brand]="favorites.isFavorite(item.id)"
              (click)="toggleFavorite(item, $event)"
              aria-label="Toggle favorite"
            >
              &#9825;
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
            <p class="text-sm leading-6 text-slate-600">{{ item.description }}</p>
            <div class="flex items-center justify-between gap-3 text-sm text-slate-500">
              <span>{{ deliveryTime(item) }}</span>
              <span>₹{{ item.price }}</span>
            </div>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-orange-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:-translate-y-0.5"
              (click)="addToCart(item)"
            >
              Add to cart
            </button>
          </div>
        </article>
      </section>

      <div *ngIf="items().length === 0" class="rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500">
        No items found in this category yet.
      </div>
    </section>
  `,
  styleUrl: './customer-pages.scss',
})
export class CategoryCollectionPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly catalog = inject(CatalogService);
  protected readonly cart = inject(CartService);
  protected readonly favorites = inject(FavoritesService);

  protected readonly categoryId = this.route.snapshot.paramMap.get('id') ?? 'pizza';

  protected readonly categoryLabel = computed(
    () => this.catalog.categoryList().find((category) => category.id === this.categoryId)?.label ?? 'Category',
  );

  protected readonly items = computed(() =>
    this.catalog
      .menuItemsSignal()
      .filter((item) => this.catalog.matchesDishCategory(item, this.categoryId))
      .sort((left, right) => right.rating - left.rating),
  );

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
}
