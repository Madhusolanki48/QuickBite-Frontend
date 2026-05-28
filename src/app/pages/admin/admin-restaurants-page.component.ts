import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { MenuItem, Restaurant } from '../../core/app.models';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { CatalogService } from '../../services/catalog.service';
import { OrderService } from '../../services/order.service';

const OWNER_RESTAURANT_IDS: Record<string, string> = {
  'owner.urbanbites@quickbite.com': 'urban-bites',
  'owner.crustco@quickbite.com': 'crust-and-co',
  'owner.royaltadka@quickbite.com': 'royal-tadka',
  'owner.wokbowl@quickbite.com': 'wok-and-bowl',
  'owner.greenspoon@quickbite.com': 'green-spoon',
  'owner.foodyard@quickbite.com': 'the-food-yard',
  'burger-palace-owner@quickbite.dev': 'urban-bites',
  'pizza-hut-owner@quickbite.dev': 'crust-and-co',
  'sushi-zen-owner@quickbite.dev': 'wok-and-bowl',
  'spice-garden-owner@quickbite.dev': 'royal-tadka',
  'taco-fiesta-owner@quickbite.dev': 'the-food-yard',
  'noodle-house-owner@quickbite.dev': 'green-spoon',
};

const NUMERIC_TO_SLUG: Record<string, string> = {
  '1': 'urban-bites',
  '2': 'crust-and-co',
  '3': 'royal-tadka',
  '4': 'wok-and-bowl',
  '5': 'green-spoon',
  '6': 'the-food-yard',
};

const RESTAURANT_OWNER_CONTACTS: Record<string, { name: string; email: string }> = {
  'urban-bites': { name: 'Aarav Mehta', email: 'owner.urbanbites@quickbite.com' },
  'crust-and-co': { name: 'Ishita Sharma', email: 'owner.crustco@quickbite.com' },
  'royal-tadka': { name: 'Meera Iyer', email: 'owner.royaltadka@quickbite.com' },
  'wok-and-bowl': { name: 'Ken Tanaka', email: 'owner.wokbowl@quickbite.com' },
  'green-spoon': { name: 'Lily Chen', email: 'owner.greenspoon@quickbite.com' },
  'the-food-yard': { name: 'Diego Lopez', email: 'owner.foodyard@quickbite.com' },
};

@Component({
  selector: 'app-admin-restaurants-page',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule],
  template: `
    <section class="page-head">
      <div>
        <h1>Restaurants & Merchant Control</h1>
        <p>Merchant partner approvals, active kitchen operations, menu catalogs, and suspension management.</p>
      </div>
      <div class="admin-toolbar">
        <button class="action-btn primary" type="button" (click)="showOnboardModal = true">
          + Onboard New Kitchen
        </button>
      </div>
    </section>

    <!-- Top Summary KPI Grid -->
    <section class="stats-grid">
      <article class="card stat-card" (click)="tab.set('ALL')" style="cursor: pointer;">
        <div class="stat-card__icon gold">🏪</div>
        <div class="stat-meta">
          <strong>{{ allRestaurants().length }}</strong>
          <span>Total Restaurants</span>
          <small class="delta">Partner Kitchens</small>
        </div>
      </article>

      <article class="card stat-card" (click)="tab.set('PENDING')" style="cursor: pointer;">
        <div class="stat-card__icon orange">📋</div>
        <div class="stat-meta">
          <strong>{{ pendingApprovals().length }}</strong>
          <span>Pending Approval</span>
          <small class="delta" style="color: #ff5a00;">Action Required</small>
        </div>
      </article>

      <article class="card stat-card" (click)="tab.set('ACTIVE')" style="cursor: pointer;">
        <div class="stat-card__icon green">🟢</div>
        <div class="stat-meta">
          <strong>{{ activeCount() }}</strong>
          <span>Active & Open</span>
          <small class="delta">Accepting Orders</small>
        </div>
      </article>

      <article class="card stat-card" (click)="tab.set('SUSPENDED')" style="cursor: pointer;">
        <div class="stat-card__icon pink">🛑</div>
        <div class="stat-meta">
          <strong>{{ suspendedCount() }}</strong>
          <span>Suspended / Closed</span>
          <small class="delta" style="color: #ef4444;">Paused</small>
        </div>
      </article>
    </section>

    <!-- Main Panel -->
    <article class="card section-card" style="padding: 1.5rem;">
      <div class="card-head" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <div class="filter-pills">
          <button type="button" class="pill" [class.active]="tab() === 'ALL'" (click)="tab.set('ALL')">
            All ({{ allRestaurants().length }})
          </button>
          <button type="button" class="pill" [class.active]="tab() === 'PENDING'" (click)="tab.set('PENDING')">
            Pending Approval ({{ pendingApprovals().length }})
          </button>
          <button type="button" class="pill" [class.active]="tab() === 'ACTIVE'" (click)="tab.set('ACTIVE')">
            Active ({{ activeCount() }})
          </button>
          <button type="button" class="pill" [class.active]="tab() === 'SUSPENDED'" (click)="tab.set('SUSPENDED')">
            Suspended ({{ suspendedCount() }})
          </button>
        </div>

        <input
          type="search"
          class="search-input"
          placeholder="Search restaurants, cuisines, owners..."
          [(ngModel)]="searchQuery"
          style="min-width: 280px;"
        />
      </div>

      <!-- Pending Approvals View -->
      <div *ngIf="tab() === 'PENDING'" class="table-responsive">
        <table class="admin-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 0.85rem;">
              <th style="padding: 0.85rem 1rem;">Applicant Name</th>
              <th style="padding: 0.85rem 1rem;">Email & Phone</th>
              <th style="padding: 0.85rem 1rem;">Assigned Restaurant</th>
              <th style="padding: 0.85rem 1rem;">KYC Status</th>
              <th style="padding: 0.85rem 1rem; text-align: right;">Review Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let applicant of pendingApprovals()" style="border-bottom: 1px solid var(--line);">
              <td style="padding: 1rem;">
                <strong style="display: block; font-size: 0.95rem;">{{ applicant.firstName }} {{ applicant.lastName }}</strong>
                <small style="color: var(--muted);">&#64;{{ applicant.username || applicant.email.split('@')[0] }}</small>
              </td>
              <td style="padding: 1rem;">
                <div>{{ applicant.email }}</div>
                <small style="color: var(--muted);">{{ applicant.phoneNumber || 'Phone not provided' }}</small>
              </td>
              <td style="padding: 1rem; font-weight: 600;">
                {{ applicant.restaurantName || applicant.restaurantId || 'New Restaurant Application' }}
              </td>
              <td style="padding: 1rem;">
                <span class="status-chip gold">Pending Admin Approval</span>
              </td>
              <td style="padding: 1rem; text-align: right;">
                <div style="display: inline-flex; gap: 0.5rem;">
                  <button
                    type="button"
                    class="action-btn primary"
                    style="padding: 0.45rem 0.9rem; font-size: 0.82rem; background: #10b981; border-color: #10b981;"
                    (click)="approveOwner(applicant.id, applicant.firstName + ' ' + applicant.lastName)"
                  >
                    ✓ Approve Application
                  </button>
                  <button
                    type="button"
                    class="action-btn"
                    style="padding: 0.45rem 0.9rem; font-size: 0.82rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);"
                    (click)="rejectOwner(applicant.id)"
                  >
                    ✕ Reject
                  </button>
                </div>
              </td>
            </tr>

            <tr *ngIf="pendingApprovals().length === 0">
              <td colspan="5" style="padding: 3rem; text-align: center; color: var(--muted);">
                🎉 No pending restaurant owner applications! All applications are processed.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Regular Restaurants View (All / Active / Suspended) -->
      <div *ngIf="tab() !== 'PENDING'" class="table-responsive">
        <table class="admin-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 0.85rem;">
              <th style="padding: 0.85rem 1rem;">Restaurant</th>
              <th style="padding: 0.85rem 1rem;">Cuisine & Min Order</th>
              <th style="padding: 0.85rem 1rem;">Rating</th>
              <th style="padding: 0.85rem 1rem;">Orders & Sales</th>
              <th style="padding: 0.85rem 1rem;">Owner Contact</th>
              <th style="padding: 0.85rem 1rem;">Operating Status</th>
              <th style="padding: 0.85rem 1rem; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of filteredRestaurants()" style="border-bottom: 1px solid var(--line);">
              <td style="padding: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <img
                    *ngIf="r.imageUrl"
                    [src]="r.imageUrl"
                    [alt]="r.name"
                    style="width: 44px; height: 44px; border-radius: 10px; object-fit: cover; border: 1px solid var(--line);"
                  />
                  <div>
                    <strong style="display: block; font-size: 0.95rem;">{{ r.name }}</strong>
                    <small style="color: var(--muted);">{{ r.deliveryMinutes }} mins prep/transit</small>
                  </div>
                </div>
              </td>
              <td style="padding: 1rem;">
                <strong>{{ r.cuisine }}</strong>
                <small style="display: block; color: var(--muted);">Min order: ₹{{ r.minOrder }}</small>
              </td>
              <td style="padding: 1rem;">
                <span style="color: #f59e0b; font-weight: 700;">★ {{ r.rating }}</span>
              </td>
              <td style="padding: 1rem;">
                <strong>{{ getOrdersCount(r.id) }} orders</strong>
                <small style="display: block; color: #10b981; font-weight: 600;">₹{{ getSalesVolume(r.id) | number: '1.0-0' }}</small>
              </td>
              <td style="padding: 1rem;">
                <span>{{ getOwnerName(r.id) }}</span>
                <small style="display: block; color: var(--muted);">{{ getOwnerEmail(r.id) }}</small>
              </td>
              <td style="padding: 1rem;">
                <span class="status-chip" [class.green]="r.status === 'OPEN'" [class.pink]="r.status !== 'OPEN'">
                  {{ r.status === 'OPEN' ? '🟢 Active & Open' : '🔴 Suspended / Closed' }}
                </span>
              </td>
              <td style="padding: 1rem; text-align: right;">
                <div style="display: inline-flex; gap: 0.5rem;">
                  <button
                    type="button"
                    class="action-btn"
                    style="padding: 0.45rem 0.8rem; font-size: 0.82rem;"
                    (click)="openDetails(r)"
                  >
                    Menu & Details
                  </button>
                  <button
                    type="button"
                    class="action-btn"
                    style="padding: 0.45rem 0.8rem; font-size: 0.82rem;"
                    [style.color]="r.status === 'OPEN' ? '#ef4444' : '#10b981'"
                    (click)="toggleStatus(r)"
                  >
                    {{ r.status === 'OPEN' ? 'Suspend' : 'Reactivate' }}
                  </button>
                </div>
              </td>
            </tr>

            <tr *ngIf="filteredRestaurants().length === 0">
              <td colspan="7" style="padding: 3rem; text-align: center; color: var(--muted);">
                No restaurants found matching this criteria.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <!-- Restaurant Details Modal (Menu, Orders, Reviews) -->
    <div
      *ngIf="selectedRestaurant as rest"
      class="modal-backdrop"
      style="position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 999; backdrop-filter: blur(4px);"
    >
      <div
        class="card modal-card"
        style="width: min(92%, 720px); max-height: 90vh; overflow-y: auto; padding: 2rem; background: var(--surface);"
      >
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
          <div>
            <span class="status-chip green" style="font-size: 0.75rem;">Merchant Information</span>
            <h2 style="margin: 0.35rem 0 0; font-size: 1.4rem;">{{ rest.name }}</h2>
            <p style="margin: 0.2rem 0 0; color: var(--muted); font-size: 0.85rem;">
              {{ rest.cuisine }} · {{ rest.description }}
            </p>
          </div>
          <button
            type="button"
            class="action-btn"
            style="padding: 0.4rem 0.75rem; border-radius: 50%; font-size: 1rem;"
            (click)="selectedRestaurant = null"
          >
            ✕
          </button>
        </div>

        <!-- Quick Stats Banner -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
          <div class="card" style="padding: 1rem; border: 1px solid var(--line);">
            <span style="color: var(--muted); font-size: 0.8rem; font-weight: 700;">Total Orders</span>
            <h3 style="margin: 0.25rem 0 0; font-size: 1.3rem;">{{ getOrdersCount(rest.id) }}</h3>
          </div>
          <div class="card" style="padding: 1rem; border: 1px solid var(--line);">
            <span style="color: var(--muted); font-size: 0.8rem; font-weight: 700;">Gross Sales</span>
            <h3 style="margin: 0.25rem 0 0; font-size: 1.3rem; color: #10b981;">₹{{ getSalesVolume(rest.id) | number: '1.0-0' }}</h3>
          </div>
          <div class="card" style="padding: 1rem; border: 1px solid var(--line);">
            <span style="color: var(--muted); font-size: 0.8rem; font-weight: 700;">Catalog Items</span>
            <h3 style="margin: 0.25rem 0 0; font-size: 1.3rem;">{{ getRestaurantMenu(rest.id).length }} dishes</h3>
          </div>
        </div>

        <!-- Menu Preview -->
        <h4 style="margin: 0 0 0.75rem; font-size: 1rem;">Menu Catalog Preview</h4>
        <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 250px; overflow-y: auto; margin-bottom: 1.5rem;">
          <div
            *ngFor="let item of getRestaurantMenu(rest.id)"
            style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 1rem; background: var(--surface-2); border-radius: 10px;"
          >
            <div>
              <strong style="font-size: 0.9rem;">{{ item.name }}</strong>
              <small style="display: block; color: var(--muted);">{{ item.category }} · {{ item.isVeg ? '🥬 Veg' : '🍗 Non-Veg' }}</small>
            </div>
            <span style="font-weight: 700; color: #ff5a00;">₹{{ item.price }}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--line); padding-top: 1.25rem;">
          <button
            type="button"
            class="action-btn"
            [style.color]="rest.status === 'OPEN' ? '#ef4444' : '#10b981'"
            (click)="toggleStatus(rest); selectedRestaurant = null"
          >
            {{ rest.status === 'OPEN' ? 'Suspend Restaurant' : 'Reactivate Restaurant' }}
          </button>
          <button type="button" class="action-btn primary" (click)="selectedRestaurant = null">Close</button>
        </div>
      </div>
    </div>

    <!-- Onboard Restaurant Modal -->
    <div
      *ngIf="showOnboardModal"
      class="modal-backdrop"
      style="position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 999; backdrop-filter: blur(4px);"
    >
      <div class="card modal-card" style="width: min(92%, 520px); padding: 2rem; background: var(--surface);">
        <h3 style="margin: 0 0 0.5rem;">Onboard New Restaurant Kitchen</h3>
        <p style="margin: 0 0 1.25rem; color: var(--muted); font-size: 0.88rem;">Register a new culinary partner onto the QuickBite platform.</p>

        <form (ngSubmit)="saveOnboard()" style="display: flex; flex-direction: column; gap: 0.85rem;">
          <label style="font-weight: 700; font-size: 0.88rem;">
            Restaurant Name
            <input class="search-input" style="width: 100%; margin-top: 0.3rem;" [(ngModel)]="newRestName" name="name" required placeholder="e.g. Spice Route" />
          </label>

          <label style="font-weight: 700; font-size: 0.88rem;">
            Cuisine Specialization
            <input class="search-input" style="width: 100%; margin-top: 0.3rem;" [(ngModel)]="newRestCuisine" name="cuisine" required placeholder="e.g. North Indian & Mughlai" />
          </label>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <label style="font-weight: 700; font-size: 0.88rem;">
              Prep Time
              <input class="search-input" style="width: 100%; margin-top: 0.3rem;" [(ngModel)]="newRestPrep" name="prep" placeholder="25-35 mins" />
            </label>
            <label style="font-weight: 700; font-size: 0.88rem;">
              Min Order (₹)
              <input type="number" class="search-input" style="width: 100%; margin-top: 0.3rem;" [(ngModel)]="newRestMinOrder" name="minOrder" placeholder="150" />
            </label>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
            <button type="button" class="action-btn" (click)="showOnboardModal = false">Cancel</button>
            <button type="submit" class="action-btn primary" [disabled]="!newRestName.trim() || !newRestCuisine.trim()">
              Create Kitchen
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styleUrl: './admin-pages.scss',
})
export class AdminRestaurantsPageComponent {
  protected readonly admin = inject(AdminDashboardService);
  private readonly catalog = inject(CatalogService);
  private readonly orders = inject(OrderService);
  private readonly route = inject(ActivatedRoute);

  readonly tab = signal<'ALL' | 'PENDING' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  searchQuery = '';
  selectedRestaurant: Restaurant | null = null;
  showOnboardModal = false;

  newRestName = '';
  newRestCuisine = '';
  newRestPrep = '25-35';
  newRestMinOrder = 150;

  readonly allRestaurants = computed(() => this.catalog.restaurantList());
  readonly pendingApprovals = computed(() => this.admin.pendingOwnerApprovals());

  readonly activeCount = computed(() => this.allRestaurants().filter((r) => r.status === 'OPEN').length);
  readonly suspendedCount = computed(() => this.allRestaurants().filter((r) => r.status !== 'OPEN').length);

  readonly filteredRestaurants = computed(() => {
    const list = this.allRestaurants();
    const currentTab = this.tab();
    const q = this.searchQuery.toLowerCase().trim();

    return list.filter((r) => {
      if (currentTab === 'ACTIVE' && r.status !== 'OPEN') return false;
      if (currentTab === 'SUSPENDED' && r.status === 'OPEN') return false;

      if (q) {
        const matchName = r.name.toLowerCase().includes(q);
        const matchCuisine = r.cuisine.toLowerCase().includes(q);
        const matchOwner = this.getOwnerName(r.id).toLowerCase().includes(q);
        const matchOwnerEmail = this.getOwnerEmail(r.id).toLowerCase().includes(q);
        if (!matchName && !matchCuisine && !matchOwner && !matchOwnerEmail) return false;
      }
      return true;
    });
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const tabParam = params.get('tab');
      if (tabParam === 'PENDING') {
        this.tab.set('PENDING');
      }
    });
  }

  getOrdersCount(restaurantId: string): number {
    const restaurant = this.catalog.restaurantById(restaurantId);
    return this.orders.orders().filter((o) => this.orderBelongsToRestaurant(o, restaurantId, restaurant?.backendId)).length;
  }

  getSalesVolume(restaurantId: string): number {
    const restaurant = this.catalog.restaurantById(restaurantId);
    return this.orders.orders()
      .filter((o) => this.orderBelongsToRestaurant(o, restaurantId, restaurant?.backendId) && o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.total || 0), 0);
  }

  getOwnerName(restaurantId: string): string {
    const owner = this.findOwnerForRestaurant(restaurantId);
    return owner
      ? `${owner.firstName} ${owner.lastName || ''}`.trim() || owner.email
      : RESTAURANT_OWNER_CONTACTS[restaurantId]?.name ?? 'Kitchen Manager';
  }

  getOwnerEmail(restaurantId: string): string {
    const owner = this.findOwnerForRestaurant(restaurantId);
    return owner ? owner.email : RESTAURANT_OWNER_CONTACTS[restaurantId]?.email ?? 'kitchen@quickbite.com';
  }

  getRestaurantMenu(restaurantId: string): MenuItem[] {
    return this.catalog.menuForRestaurant(restaurantId);
  }

  openDetails(r: Restaurant): void {
    this.selectedRestaurant = r;
  }

  toggleStatus(r: Restaurant): void {
    this.admin.toggleRestaurantStatus(r.id);
  }

  approveOwner(userId: number, name: string): void {
    if (confirm(`Approve owner application for ${name}?`)) {
      this.admin.approveUser(userId, name);
    }
  }

  rejectOwner(userId: number): void {
    const reason = prompt('Please enter rejection reason:');
    if (reason) {
      this.admin.rejectUser(userId, reason);
    }
  }

  saveOnboard(): void {
    const id = this.newRestName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    this.catalog.addRestaurant({
      id,
      name: this.newRestName.trim(),
      cuisine: this.newRestCuisine.trim(),
      category: 'quick-bites',
      rating: 4.8,
      deliveryMinutes: this.newRestPrep,
      minOrder: this.newRestMinOrder,
      status: 'OPEN',
      heroEmoji: '🍽️',
      description: 'Handcrafted gourmet dining delivered fresh.',
      imageUrl: '/assets/images/restaurants/urban%20bites.jpg',
    });
    this.admin.addAuditEntry('Created Restaurant', 'RESTAURANT', `Onboarded kitchen ${this.newRestName}`);
    this.showOnboardModal = false;
    this.newRestName = '';
    this.newRestCuisine = '';
  }

  private findOwnerForRestaurant(restaurantId: string) {
    const restaurant = this.catalog.restaurantById(restaurantId);
    const targetSlug = this.normalizeRestaurantId(restaurantId);
    const targetBackendId = restaurant?.backendId ? String(restaurant.backendId) : undefined;
    const targetName = restaurant?.name.toLowerCase().trim();

    return this.admin.allRestaurantOwners().find((owner) => {
      const ownerRestaurantSlug = this.normalizeRestaurantId(owner.restaurantId ?? undefined);
      const ownerRestaurantId = owner.restaurantId?.trim();
      const ownerRestaurantName = owner.restaurantName?.toLowerCase().trim();
      const mappedSeedRestaurant = OWNER_RESTAURANT_IDS[owner.email.toLowerCase().trim()];

      return (
        ownerRestaurantSlug === targetSlug ||
        mappedSeedRestaurant === targetSlug ||
        (targetBackendId && ownerRestaurantId === targetBackendId) ||
        (targetName && ownerRestaurantName === targetName)
      );
    });
  }

  private normalizeRestaurantId(value?: string): string {
    const normalized = value?.toLowerCase().trim() ?? '';
    return NUMERIC_TO_SLUG[normalized] ?? normalized;
  }

  private orderBelongsToRestaurant(
    order: { restaurantId?: string; restaurantName?: string; backendRestaurantId?: number },
    restaurantId: string,
    backendId?: number,
  ): boolean {
    const orderRestaurantId = this.normalizeRestaurantId(order.restaurantId);
    if (orderRestaurantId === restaurantId) {
      return true;
    }
    if (backendId && order.backendRestaurantId === backendId) {
      return true;
    }

    const restaurant = this.catalog.restaurantById(restaurantId);
    return Boolean(
      restaurant?.name &&
        order.restaurantName?.toLowerCase().trim() === restaurant.name.toLowerCase().trim(),
    );
  }
}
