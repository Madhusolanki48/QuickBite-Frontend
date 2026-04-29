import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { Restaurant } from '../../core/app.models';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { CatalogService } from '../../services/catalog.service';

type RestaurantDraft = {
  name: string;
  cuisine: string;
  category: string;
  rating: number;
  deliveryMinutes: string;
  minOrder: number;
  status: Restaurant['status'];
  heroEmoji: string;
  description: string;
  imageUrl: string;
};

const blankDraft = (): RestaurantDraft => ({
  name: '',
  cuisine: '',
  category: 'burgers',
  rating: 4.5,
  deliveryMinutes: '25-35',
  minOrder: 150,
  status: 'OPEN',
  heroEmoji: '🍔',
  description: 'Fresh food, fast delivery',
  imageUrl: '',
});

@Component({
  selector: 'app-admin-restaurants-page',
  imports: [NgClass, NgFor, NgIf],
  template: `
    <section class="page-head">
      <div>
        <h1>Restaurants</h1>
      </div>
      <button class="action-btn primary" type="button" (click)="startOnboard()">
        + Onboard Restaurant
      </button>
    </section>

    <section *ngIf="editorMode() === 'create'" class="card panel" style="margin-bottom:1rem;">
      <div class="section-head">
        <div>
          <h2>Onboard Restaurant</h2>
          <p>Add a new restaurant record and photo from a local file.</p>
        </div>
        <div class="section-actions">
          <button class="ghost-btn" type="button" (click)="cancelEditor()">Cancel</button>
          <button class="action-btn primary" type="button" (click)="save()">
            Create Restaurant
          </button>
        </div>
      </div>

      <div class="form-grid restaurant-form">
        <label
          >Restaurant Name<input
            [value]="draft().name"
            (input)="patch('name', $any($event.target).value)"
        /></label>
        <label
          >Cuisine<input
            [value]="draft().cuisine"
            (input)="patch('cuisine', $any($event.target).value)"
        /></label>
        <label
          >Category<input
            [value]="draft().category"
            (input)="patch('category', $any($event.target).value)"
        /></label>
        <label
          >Rating<input
            type="number"
            step="0.1"
            [value]="draft().rating"
            (input)="patchNumber('rating', $any($event.target).value)"
        /></label>
        <label
          >Delivery Time<input
            [value]="draft().deliveryMinutes"
            (input)="patch('deliveryMinutes', $any($event.target).value)"
        /></label>
        <label
          >Minimum Order<input
            type="number"
            [value]="draft().minOrder"
            (input)="patchNumber('minOrder', $any($event.target).value)"
        /></label>
        <label
          >Status
          <select [value]="draft().status" (change)="patch('status', $any($event.target).value)">
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </label>
        <label
          >Emoji<input
            [value]="draft().heroEmoji"
            (input)="patch('heroEmoji', $any($event.target).value)"
        /></label>
        <label class="full"
          >Description<textarea
            rows="3"
            [value]="draft().description"
            (input)="patch('description', $any($event.target).value)"
          ></textarea>
        </label>
        <label class="full"
          >Restaurant Photo<input type="file" accept="image/*" (change)="uploadImage($event)"
        /></label>
        <div class="full media-preview" *ngIf="draft().imageUrl">
          <img [src]="draft().imageUrl" [alt]="draft().name || 'Restaurant preview'" />
        </div>
      </div>
    </section>

    <p *ngIf="notice()" class="save-note">{{ notice() }}</p>

    <section class="stats-grid">
      <article class="card stat-card">
        <div class="stat-card__icon green">✅</div>
        <div class="stat-meta"><strong>128</strong><span>Active</span></div>
      </article>
      <article class="card stat-card">
        <div class="stat-card__icon gold">⏳</div>
        <div class="stat-meta"><strong>12</strong><span>Pending Approval</span></div>
      </article>
      <article class="card stat-card">
        <div class="stat-card__icon blue">🟢</div>
        <div class="stat-meta"><strong>94</strong><span>Open Now</span></div>
      </article>
      <article class="card stat-card">
        <div class="stat-card__icon pink">🚫</div>
        <div class="stat-meta"><strong>4</strong><span>Suspended</span></div>
      </article>
    </section>

    <section class="card panel">
      <table class="card-table">
        <thead>
          <tr>
            <th>Restaurant</th>
            <th>Cuisine</th>
            <th>Owner</th>
            <th>Rating</th>
            <th>Orders (30d)</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <ng-container *ngFor="let row of admin.dashboard().restaurants">
            <tr>
              <td>
                <strong>{{ row.name }}</strong>
              </td>
              <td>{{ row.cuisine }}</td>
              <td>{{ row.owner }}</td>
              <td>⭐ {{ row.rating }}</td>
              <td>
                <strong>{{ row.orders }}</strong>
              </td>
              <td>
                <span class="pill" [ngClass]="row.status === 'Open' ? 'green' : 'gray'">{{
                  row.status
                }}</span>
              </td>
              <td class="list-actions">
                <button class="ghost-btn" type="button" (click)="edit(row.id)">Edit</button>
                <button
                  class="toolbar-btn"
                  type="button"
                  style="color:#ef4444;"
                  (click)="toggleStatus(row.id)"
                >
                  {{ row.status === 'Open' ? 'Suspend' : 'Restore' }}
                </button>
              </td>
            </tr>
            <tr *ngIf="editorMode() === 'edit' && editingId() === row.id" class="inline-editor-row">
              <td colspan="7">
                <div class="inline-editor">
                  <div class="section-head">
                    <div>
                      <h2>Edit Restaurant</h2>
                      <p>Change restaurant details and replace the photo if needed.</p>
                    </div>
                    <div class="section-actions">
                      <button class="ghost-btn" type="button" (click)="cancelEditor()">
                        Cancel
                      </button>
                      <button class="action-btn primary" type="button" (click)="save()">
                        Save Changes
                      </button>
                    </div>
                  </div>

                  <div class="form-grid restaurant-form">
                    <label
                      >Restaurant Name<input
                        [value]="draft().name"
                        (input)="patch('name', $any($event.target).value)"
                    /></label>
                    <label
                      >Cuisine<input
                        [value]="draft().cuisine"
                        (input)="patch('cuisine', $any($event.target).value)"
                    /></label>
                    <label
                      >Category<input
                        [value]="draft().category"
                        (input)="patch('category', $any($event.target).value)"
                    /></label>
                    <label
                      >Rating<input
                        type="number"
                        step="0.1"
                        [value]="draft().rating"
                        (input)="patchNumber('rating', $any($event.target).value)"
                    /></label>
                    <label
                      >Delivery Time<input
                        [value]="draft().deliveryMinutes"
                        (input)="patch('deliveryMinutes', $any($event.target).value)"
                    /></label>
                    <label
                      >Minimum Order<input
                        type="number"
                        [value]="draft().minOrder"
                        (input)="patchNumber('minOrder', $any($event.target).value)"
                    /></label>
                    <label
                      >Status
                      <select
                        [value]="draft().status"
                        (change)="patch('status', $any($event.target).value)"
                      >
                        <option value="OPEN">Open</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </label>
                    <label
                      >Emoji<input
                        [value]="draft().heroEmoji"
                        (input)="patch('heroEmoji', $any($event.target).value)"
                    /></label>
                    <label class="full"
                      >Description<textarea
                        rows="3"
                        [value]="draft().description"
                        (input)="patch('description', $any($event.target).value)"
                      ></textarea>
                    </label>
                    <label class="full"
                      >Restaurant Photo<input
                        type="file"
                        accept="image/*"
                        (change)="uploadImage($event)"
                    /></label>
                    <div class="full media-preview" *ngIf="draft().imageUrl">
                      <img [src]="draft().imageUrl" [alt]="draft().name || 'Restaurant preview'" />
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </ng-container>
        </tbody>
      </table>
    </section>
  `,
  styleUrl: './admin-pages.scss',
})
export class AdminRestaurantsPageComponent {
  protected readonly admin = inject(AdminDashboardService);
  private readonly catalog = inject(CatalogService);
  protected readonly editorMode = signal<'idle' | 'create' | 'edit'>('idle');
  protected readonly editingId = signal('');
  protected readonly draft = signal<RestaurantDraft>(blankDraft());
  protected readonly notice = signal('');

  startOnboard(): void {
    this.editingId.set('');
    this.editorMode.set('create');
    this.draft.set(blankDraft());
    this.notice.set('');
  }

  cancelEditor(): void {
    this.editorMode.set('idle');
    this.editingId.set('');
    this.draft.set(blankDraft());
  }

  patch(field: keyof RestaurantDraft, value: string): void {
    this.draft.update((current) => ({ ...current, [field]: value }));
  }

  patchNumber(field: 'rating' | 'minOrder', value: string): void {
    const parsed = Number(value);
    this.draft.update((current) => ({
      ...current,
      [field]: Number.isFinite(parsed) ? parsed : current[field],
    }));
  }

  uploadImage(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.draft.update((current) => ({ ...current, imageUrl: String(reader.result ?? '') }));
    };
    reader.readAsDataURL(file);
  }

  save(): void {
    const current = this.draft();
    const name = current.name.trim();
    if (!name) {
      return;
    }

    const restaurant: Restaurant = {
      id: this.editingId() || `${this.slugify(name)}-${Date.now().toString(36)}`,
      name,
      cuisine: current.cuisine.trim() || 'Custom',
      category: current.category.trim().toLowerCase() || 'burgers',
      rating: Number.isFinite(current.rating) ? current.rating : 4.5,
      deliveryMinutes: current.deliveryMinutes.trim() || '25-35',
      minOrder: Number.isFinite(current.minOrder) ? current.minOrder : 150,
      status: current.status,
      heroEmoji: current.heroEmoji.trim() || '🍔',
      description: current.description.trim() || 'Fresh food, fast delivery',
      imageUrl: current.imageUrl || undefined,
    };

    if (this.editorMode() === 'edit' && this.editingId()) {
      this.catalog.updateRestaurant(this.editingId(), restaurant);
    } else {
      this.catalog.addRestaurant(restaurant);
    }

    this.notice.set('Restaurant saved.');
    this.cancelEditor();
    window.setTimeout(() => this.notice.set(''), 1800);
  }

  edit(id: string): void {
    const restaurant = this.catalog.restaurantById(id);
    if (!restaurant) {
      return;
    }

    this.editingId.set(id);
    this.editorMode.set('edit');
    this.draft.set({
      name: restaurant.name,
      cuisine: restaurant.cuisine,
      category: restaurant.category,
      rating: restaurant.rating,
      deliveryMinutes: restaurant.deliveryMinutes,
      minOrder: restaurant.minOrder,
      status: restaurant.status,
      heroEmoji: restaurant.heroEmoji,
      description: restaurant.description,
      imageUrl: restaurant.imageUrl ?? '',
    });
    this.notice.set('');
  }

  toggleStatus(id: string): void {
    const restaurant = this.catalog.restaurantById(id);
    if (!restaurant) {
      return;
    }

    this.catalog.updateRestaurantAvailability(id, restaurant.status === 'OPEN' ? 'CLOSED' : 'OPEN');
  }

  private slugify(value: string): string {
    const base = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return base || `restaurant-${Date.now()}`;
  }
}
