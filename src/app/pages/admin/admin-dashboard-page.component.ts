import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { LiveRouteMapComponent } from '../../components/live-route-map.component';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LiveRouteMapComponent],
  template: `
    <!-- Top Action-Oriented Header -->
    <section class="page-head" style="align-items: center;">
      <div>
        <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.35rem;">
          <span class="status-chip green" style="font-size: 0.75rem;">● System Live</span>
          <span style="color: var(--muted); font-size: 0.85rem;">QuickBite Ops Center</span>
        </div>
        <h1>Platform Overview</h1>
        <p>Real-time telemetry, active orders, live capacity, approvals, and revenue stream.</p>
      </div>

      <div class="admin-toolbar">
        <a routerLink="/admin/orders" class="action-btn primary" style="text-decoration: none;">
          🛍️ Live Orders ({{ admin.activeOrdersCount() }})
        </a>
        <button class="action-btn" type="button" (click)="refresh()">
          🔄 Refresh
        </button>
      </div>
    </section>

    <!-- Urgent Action Alert Banners (Clickable) -->
    <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;">
      <!-- Pending Approvals Banner -->
      <div
        *ngIf="admin.pendingApprovalCount() > 0"
        (click)="goToApprovals()"
        class="card"
        style="padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 16px; cursor: pointer; transition: transform 0.2s;"
      >
        <div style="display: flex; align-items: center; gap: 0.85rem;">
          <span style="font-size: 1.4rem;">⚠️</span>
          <div>
            <strong style="color: #d97706; font-size: 0.95rem;">
              {{ admin.pendingApprovalCount() }} Account Applications Pending Approval
            </strong>
            <p style="margin: 0.15rem 0 0; font-size: 0.82rem; color: var(--muted);">
              {{ admin.pendingOwnerApprovals().length }} Restaurant Owners and {{ admin.pendingDeliveryApprovals().length }} Delivery Partners waiting for verification.
            </p>
          </div>
        </div>
        <span class="action-btn primary" style="padding: 0.4rem 0.85rem; font-size: 0.82rem; background: #d97706; border-color: #d97706;">
          Review Now →
        </span>
      </div>

      <!-- Pending Refunds Banner -->
      <div
        *ngIf="admin.pendingRefundsCount() > 0"
        routerLink="/admin/refunds"
        class="card"
        style="padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 16px; cursor: pointer; transition: transform 0.2s;"
      >
        <div style="display: flex; align-items: center; gap: 0.85rem;">
          <span style="font-size: 1.4rem;">🔄</span>
          <div>
            <strong style="color: #dc2626; font-size: 0.95rem;">
              {{ admin.pendingRefundsCount() }} Customer Refund Claims Awaiting Resolution
            </strong>
            <p style="margin: 0.15rem 0 0; font-size: 0.82rem; color: var(--muted);">
              Review order dispute details and approve or reject refunds directly.
            </p>
          </div>
        </div>
        <span class="action-btn" style="padding: 0.4rem 0.85rem; font-size: 0.82rem; color: #dc2626; border-color: rgba(220, 38, 38, 0.4);">
          Manage Refunds →
        </span>
      </div>

      <!-- Delayed Orders Warning -->
      <div
        *ngIf="admin.delayedOrders().length > 0"
        routerLink="/admin/orders"
        class="card"
        style="padding: 0.85rem 1.25rem; display: flex; justify-content: space-between; align-items: center; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 16px; cursor: pointer;"
      >
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-size: 1.2rem;">⏱️</span>
          <div>
            <strong style="color: #2563eb; font-size: 0.9rem;">
              {{ admin.delayedOrders().length }} Orders Exceeding Standard Prep/Delivery Time (>30 mins)
            </strong>
          </div>
        </div>
        <span style="font-size: 0.82rem; font-weight: 700; color: #2563eb;">View Delayed Orders →</span>
      </div>
    </div>

    <!-- 6 Primary Actionable KPI Cards -->
    <section class="stats-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
      <!-- Total Orders Card -->
      <article class="card stat-card" routerLink="/admin/orders" style="cursor: pointer;">
        <div class="stat-card__icon gold">🛍️</div>
        <div class="stat-meta">
          <strong>{{ dashboard().totalOrders }}</strong>
          <span>Total Orders</span>
          <small class="delta">View All Orders →</small>
        </div>
      </article>

      <!-- Today's Revenue Card -->
      <article class="card stat-card" routerLink="/admin/payments" style="cursor: pointer;">
        <div class="stat-card__icon green">💰</div>
        <div class="stat-meta">
          <strong>{{ dashboard().todayRevenue }}</strong>
          <span>Today's Revenue</span>
          <small class="delta">Total: {{ dashboard().totalRevenue }} →</small>
        </div>
      </article>

      <!-- Active Orders Card -->
      <article class="card stat-card" routerLink="/admin/orders" style="cursor: pointer;">
        <div class="stat-card__icon pink">🔥</div>
        <div class="stat-meta">
          <strong>{{ admin.activeOrdersCount() }}</strong>
          <span>Active Live Orders</span>
          <small class="delta" style="color: #ff5a00;">Kitchen & Transit →</small>
        </div>
      </article>

      <!-- Online Restaurants Card -->
      <article class="card stat-card" routerLink="/admin/restaurants" style="cursor: pointer;">
        <div class="stat-card__icon blue">🍽️</div>
        <div class="stat-meta">
          <strong>{{ dashboard().activeRestaurants }} / {{ dashboard().totalRestaurants }}</strong>
          <span>Online Restaurants</span>
          <small class="delta">Manage Kitchens →</small>
        </div>
      </article>

      <!-- Active Agents Card -->
      <article class="card stat-card" routerLink="/admin/delivery-agents" style="cursor: pointer;">
        <div class="stat-card__icon green">🛵</div>
        <div class="stat-meta">
          <strong>{{ dashboard().activeDeliveryAgents }} / {{ dashboard().deliveryAgentsCount }}</strong>
          <span>Active Delivery Agents</span>
          <small class="delta">Fleet Dispatch →</small>
        </div>
      </article>

      <!-- Total Customers Card -->
      <article class="card stat-card" routerLink="/admin/customers" style="cursor: pointer;">
        <div class="stat-card__icon pink">👥</div>
        <div class="stat-meta">
          <strong>{{ dashboard().totalCustomers }}</strong>
          <span>Registered Customers</span>
          <small class="delta">Customer Directory →</small>
        </div>
      </article>
    </section>

    <!-- Split Grid: Chart + Live Route Tracking -->
    <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 1.25rem; margin-bottom: 1.5rem;">
      <!-- Order & Revenue Velocity Chart -->
      <article class="card section-card" style="padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <div>
            <h3 style="margin: 0; font-size: 1.2rem;">Revenue & Order Trends</h3>
            <p style="margin: 0.2rem 0 0; color: var(--muted); font-size: 0.85rem;">Platform volume across recent business cycles</p>
          </div>
          <a routerLink="/admin/analytics" class="ghost-btn" style="text-decoration: none; font-size: 0.82rem; padding: 0.4rem 0.8rem;">
            Full Analytics →
          </a>
        </div>

        <div style="display: flex; align-items: flex-end; gap: 1.25rem; height: 180px; padding: 1rem 0; border-bottom: 1px solid var(--line);">
          <div *ngFor="let col of chartColumns()" style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; height: 100%; justify-content: flex-end;">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text);">₹{{ col.amount }}</span>
            <div
              style="width: 100%; max-width: 42px; border-radius: 8px 8px 0 0; background: linear-gradient(180deg, #ff5a00, #ff8c42); transition: height 0.4s ease;"
              [style.height.%]="col.pct"
            ></div>
            <span style="font-size: 0.78rem; color: var(--muted); font-weight: 600;">{{ col.day }}</span>
          </div>
        </div>
      </article>

      <!-- Live Dispatch Map Preview -->
      <article class="card section-card" style="padding: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <div>
            <h3 style="margin: 0; font-size: 1.1rem;">Live Fleet Dispatch</h3>
            <p style="margin: 0.2rem 0 0; color: var(--muted); font-size: 0.82rem;">GPS tracking of active delivery riders</p>
          </div>
          <span class="status-chip green" style="font-size: 0.75rem;">GPS Sync</span>
        </div>

        <app-live-route-map
          [title]="'Fleet Radar'"
          [subtitle]="'Active routes across zones'"
          [status]="'Online'"
          [pickup]="activeRoute().pickup"
          [drop]="activeRoute().drop"
          [agent]="activeRoute().agent"
        />
      </article>
    </div>

    <!-- Recent Orders Live Table -->
    <article class="card section-card" style="padding: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <div>
          <h3 style="margin: 0; font-size: 1.25rem;">Recent Order Activity</h3>
          <p style="margin: 0.25rem 0 0; color: var(--muted); font-size: 0.88rem;">Real-time feed of newly placed and active orders</p>
        </div>
        <a routerLink="/admin/orders" class="action-btn" style="text-decoration: none; font-size: 0.85rem; padding: 0.5rem 1rem;">
          View All Orders ({{ dashboard().totalOrdersCount }}) →
        </a>
      </div>

      <div class="table-responsive">
        <table class="admin-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 0.85rem;">
              <th style="padding: 0.85rem 1rem;">Order ID</th>
              <th style="padding: 0.85rem 1rem;">Customer</th>
              <th style="padding: 0.85rem 1rem;">Restaurant</th>
              <th style="padding: 0.85rem 1rem;">Items</th>
              <th style="padding: 0.85rem 1rem;">Total</th>
              <th style="padding: 0.85rem 1rem;">Payment</th>
              <th style="padding: 0.85rem 1rem;">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let order of dashboard().recentOrders" style="border-bottom: 1px solid var(--line);">
              <td style="padding: 1rem; font-weight: 700;">
                <a routerLink="/admin/orders" style="color: #ff5a00; text-decoration: none;">
                  {{ order.id }}
                </a>
              </td>
              <td style="padding: 1rem; font-weight: 600;">{{ order.customer }}</td>
              <td style="padding: 1rem;">{{ order.restaurant }}</td>
              <td style="padding: 1rem; max-width: 220px; font-size: 0.88rem; color: var(--muted);">
                {{ order.items }}
              </td>
              <td style="padding: 1rem; font-weight: 700;">{{ order.total }}</td>
              <td style="padding: 1rem;">
                <span class="status-chip" [class.green]="order.paymentStatus === 'SUCCESS'" [class.gold]="order.paymentStatus === 'PENDING'">
                  {{ order.paymentMethod }} · {{ order.paymentStatus }}
                </span>
              </td>
              <td style="padding: 1rem;">
                <span
                  class="status-chip"
                  [class.green]="order.rawStatus === 'DELIVERED'"
                  [class.gold]="order.rawStatus === 'PLACED' || order.rawStatus === 'CONFIRMED'"
                  [class.blue]="order.rawStatus === 'PREPARING' || order.rawStatus === 'READY' || order.rawStatus === 'ON_THE_WAY'"
                  [class.pink]="order.rawStatus === 'CANCELLED'"
                >
                  {{ order.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  `,
  styleUrl: './admin-pages.scss',
})
export class AdminDashboardPageComponent {
  protected readonly admin = inject(AdminDashboardService);
  private readonly router = inject(Router);

  readonly dashboard = computed(() => this.admin.dashboard());

  readonly chartColumns = computed(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
    const gross = this.admin.grossRevenueValue() || 5000;
    return days.map((day, i) => {
      const mult = (i + 4) / 10;
      const amount = Math.round((gross * mult) / 3);
      return {
        day,
        amount,
        pct: Math.min(100, Math.max(20, Math.round(mult * 85))),
      };
    });
  });

  readonly activeRoute = computed(() => ({
    pickup: { lat: 28.5543, lng: 77.2177 },
    drop: { lat: 28.5672, lng: 77.2365 },
    agent: { lat: 28.559, lng: 77.225 },
  }));

  refresh(): void {
    this.admin.refreshApprovalUsers();
    this.admin.refreshAllUsers();
  }

  goToApprovals(): void {
    if (this.admin.pendingOwnerApprovals().length > 0) {
      void this.router.navigate(['/admin/restaurants'], { queryParams: { tab: 'PENDING' } });
    } else {
      void this.router.navigate(['/admin/delivery-agents'], { queryParams: { tab: 'PENDING' } });
    }
  }
}
