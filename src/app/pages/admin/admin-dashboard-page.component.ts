import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LiveRouteMapComponent } from '../../components/live-route-map.component';
import { Order } from '../../core/app.models';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { LocationService } from '../../services/location.service';
import { OrderService } from '../../services/order.service';
import { ReviewService } from '../../services/review.service';

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [NgClass, NgFor, NgIf, RouterLink, LiveRouteMapComponent],
  template: `
    <section class="ops-hero">
      <div>
        <span class="eyebrow">QuickBite admin control tower</span>
        <h1>Live platform operations</h1>
        <p>
          Monitor orders, restaurants, delivery capacity, payments, approvals, and support alerts
          from one operational cockpit.
        </p>
      </div>
      <div class="hero-actions">
        <button class="action-btn primary">Broadcast notification</button>
        <button class="action-btn">Export report</button>
      </div>
    </section>

    <section class="ops-strip">
      <article *ngFor="let item of liveSummary()" class="ops-pill">
        <span [class]="item.dot"></span>
        <div>
          <strong>{{ item.value }}</strong>
          <small>{{ item.label }}</small>
        </div>
      </article>
    </section>

    <section class="stats-grid admin-kpis">
      <article class="stat-card premium-card" *ngFor="let metric of kpis()">
        <div class="stat-card__top">
          <span class="stat-card__icon" [ngClass]="metric.tone">{{ metric.code }}</span>
          <span class="trend" [ngClass]="metric.trendTone">{{ metric.delta }}</span>
        </div>
        <strong>{{ metric.value }}</strong>
        <span>{{ metric.label }}</span>
        <div class="sparkline" aria-hidden="true">
          <i *ngFor="let point of metric.spark" [style.height.%]="point"></i>
        </div>
      </article>
    </section>

    <section class="ops-grid">
      <article class="premium-card chart-card revenue-card">
        <div class="section-head">
          <div>
            <h2>Revenue analytics</h2>
            <p>Weekly gross sales and platform commission movement.</p>
          </div>
          <span class="status-chip green">+18.4%</span>
        </div>
        <div class="revenue-chart">
          <div class="chart-axis">
            <span>Rs 80K</span>
            <span>Rs 40K</span>
            <span>Rs 0</span>
          </div>
          <div class="chart-bars">
            <div class="chart-bar" *ngFor="let bar of revenueBars()">
              <span [style.height.%]="bar.value"></span>
              <small>{{ bar.label }}</small>
            </div>
          </div>
        </div>
      </article>

      <article class="premium-card status-card">
        <div class="section-head compact">
          <div>
            <h2>Order status mix</h2>
            <p>Current delivery pipeline.</p>
          </div>
        </div>
        <div class="donut-wrap">
          <div class="donut"></div>
          <div class="donut-center">
            <strong>{{ admin.dashboard().totalOrders }}</strong>
            <span>Total orders</span>
          </div>
        </div>
        <div class="status-list">
          <span *ngFor="let row of statusMix()">
            <i [class]="row.tone"></i>{{ row.label }} <strong>{{ row.value }}</strong>
          </span>
        </div>
      </article>
    </section>

    <section class="ops-grid ops-grid--wide">
      <article class="premium-card live-panel">
        <div class="section-head">
          <div>
            <h2>Live operations feed</h2>
            <p>High-signal events from orders, restaurants, payments, and delivery teams.</p>
          </div>
          <a routerLink="/admin/orders" class="text-action">Open orders</a>
        </div>

        <div class="event-feed">
          <div class="event-row" *ngFor="let event of liveEvents()">
            <span [class]="event.tone"></span>
            <div>
              <strong>{{ event.title }}</strong>
              <p>{{ event.detail }}</p>
            </div>
            <small>{{ event.time }}</small>
          </div>
        </div>
      </article>

      <article class="premium-card quick-actions">
        <div class="section-head compact">
          <div>
            <h2>Quick actions</h2>
            <p>Common admin interventions.</p>
          </div>
        </div>
        <button *ngFor="let action of quickActions()" class="quick-action" type="button" (click)="action.action && action.action()">
          <span>{{ action.code }}</span>
          <strong>{{ action.label }}</strong>
          <small>{{ action.hint }}</small>
        </button>
      </article>
    </section>

    <app-live-route-map
      *ngIf="activeOrder() as order"
      title="Live delivery tracking"
      [subtitle]="order.restaurantName + ' to ' + (order.deliveryAddressLine ?? 'customer address')"
      [status]="order.status.replaceAll('_', ' ')"
      [pickup]="pickupPoint(order)"
      [drop]="dropPoint(order)"
      [routeStart]="pickupPoint(order)"
      [routeEnd]="dropPoint(order)"
    />

    <section class="premium-card table-panel">
      <div class="section-head">
        <div>
          <h2>Real-time orders</h2>
          <p>Filtered queue for active operations and escalation handling.</p>
        </div>
        <div class="table-tools">
          <input class="search-input" placeholder="Search order, customer, restaurant" />
          <button class="ghost-btn">Filter</button>
        </div>
      </div>
      <div class="table-scroll">
        <table class="card-table ops-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Restaurant</th>
              <th>Agent</th>
              <th>Total</th>
              <th>Status</th>
              <th>SLA</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of admin.dashboard().recentOrders">
              <td><strong>{{ row.id }}</strong><small>{{ row.time }}</small></td>
              <td>{{ row.customer }}</td>
              <td>{{ row.restaurant }}</td>
              <td>{{ row.agent }}</td>
              <td><strong>{{ row.total }}</strong></td>
              <td><span class="pill" [ngClass]="statusTone(row.status)">{{ row.status }}</span></td>
              <td><span class="sla">On track</span></td>
              <td><button class="ghost-btn small">Manage</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="ops-grid">
      <article class="premium-card issue-panel">
        <div class="section-head compact">
          <div>
            <h2>Alerts and issues</h2>
            <p>Needs admin attention today.</p>
          </div>
        </div>
        <div class="issue-row" *ngFor="let issue of issues()">
          <span [class]="issue.tone">{{ issue.code }}</span>
          <div>
            <strong>{{ issue.title }}</strong>
            <p>{{ issue.detail }}</p>
          </div>
        </div>
      </article>

      <article class="premium-card performance-panel">
        <div class="section-head compact">
          <div>
            <h2>Restaurant performance</h2>
            <p>Rating, demand, and review health.</p>
          </div>
        </div>
        <div class="rank-row" *ngFor="let item of restaurantRatingRows().slice(0, 5); let i = index">
          <span>#{{ i + 1 }}</span>
          <div>
            <strong>{{ item.name }}</strong>
            <small>{{ item.rating }}/5 average rating</small>
          </div>
          <i [style.width.%]="item.rating * 20"></i>
        </div>
      </article>
    </section>
  `,
  styleUrl: './admin-pages.scss',
})
export class AdminDashboardPageComponent {
  protected readonly admin = inject(AdminDashboardService);
  private readonly orders = inject(OrderService);
  private readonly locations = inject(LocationService);
  protected readonly reviewService = inject(ReviewService);

  protected readonly activeOrder = computed(
    () => this.orders.activeOrders()[0] ?? this.orders.orders()[0] ?? null,
  );

  protected kpis() {
    const dashboard = this.admin.dashboard();
    const cancelled = this.orders.orders().filter((order) => order.status === 'CANCELLED').length;
    return [
      { label: 'Total Orders', value: dashboard.totalOrders, delta: '+12.5%', trendTone: 'up', tone: 'blue', code: 'OR', spark: [28, 44, 34, 58, 72, 64, 82] },
      { label: 'Revenue', value: dashboard.totalRevenue, delta: '+18.4%', trendTone: 'up', tone: 'green', code: 'RV', spark: [36, 42, 48, 54, 68, 74, 90] },
      { label: 'Active Restaurants', value: String(dashboard.activeRestaurants), delta: 'Live', trendTone: 'info', tone: 'orange', code: 'RS', spark: [46, 48, 48, 52, 54, 57, 60] },
      { label: 'Online Agents', value: String(dashboard.deliveryAgentsCount), delta: '+6 online', trendTone: 'up', tone: 'purple', code: 'AG', spark: [18, 22, 35, 44, 38, 52, 56] },
      { label: 'Pending Orders', value: String(dashboard.pendingOrders), delta: 'Watch', trendTone: 'warn', tone: 'yellow', code: 'PN', spark: [58, 46, 52, 41, 35, 44, 38] },
      { label: 'Cancelled Orders', value: String(cancelled), delta: '-2.1%', trendTone: 'down', tone: 'red', code: 'CN', spark: [44, 38, 36, 30, 24, 26, 18] },
      { label: 'Refund Requests', value: String(Math.max(1, Math.round(cancelled * 0.4))), delta: '2 urgent', trendTone: 'warn', tone: 'red', code: 'RF', spark: [12, 22, 18, 30, 26, 34, 28] },
      { label: 'Customer Satisfaction', value: `${this.averageRating()}/5`, delta: '+0.3', trendTone: 'up', tone: 'green', code: 'CS', spark: [62, 66, 64, 70, 74, 78, 82] },
    ];
  }

  protected liveSummary() {
    const dashboard = this.admin.dashboard();
    return [
      { label: 'Live orders', value: dashboard.pendingOrders, dot: 'dot blue' },
      { label: 'Agents online', value: dashboard.deliveryAgentsCount, dot: 'dot green' },
      { label: 'Failed payments', value: Math.max(0, this.orders.orders().filter((order) => order.paymentStatus === 'FAILED').length), dot: 'dot red' },
      { label: 'Peak hour', value: '8-10 PM', dot: 'dot orange' },
    ];
  }

  protected revenueBars() {
    return [
      { label: 'Mon', value: 38 },
      { label: 'Tue', value: 52 },
      { label: 'Wed', value: 44 },
      { label: 'Thu', value: 68 },
      { label: 'Fri', value: 82 },
      { label: 'Sat', value: 74 },
      { label: 'Sun', value: 92 },
    ];
  }

  protected statusMix() {
    const orders = this.orders.orders();
    const count = (status: Order['status']) => orders.filter((order) => order.status === status).length;
    return [
      { label: 'Delivered', value: count('DELIVERED'), tone: 'legend green' },
      { label: 'Preparing', value: count('PREPARING') + count('READY'), tone: 'legend orange' },
      { label: 'Out for delivery', value: count('ON_THE_WAY'), tone: 'legend blue' },
      { label: 'Cancelled', value: count('CANCELLED'), tone: 'legend red' },
    ];
  }

  protected liveEvents() {
    const recent = this.admin.dashboard().recentOrders.slice(0, 4);
    const events = recent.map((order) => ({
      title: `${order.id} ${order.status}`,
      detail: `${order.restaurant} for ${order.customer} · ${order.total}`,
      time: order.time || 'Now',
      tone: `event-dot ${this.statusTone(order.status)}`,
    }));
    return events.length
      ? events
      : [
          { title: 'No live orders yet', detail: 'New paid orders will appear here immediately.', time: 'Now', tone: 'event-dot blue' },
          { title: 'Restaurant network online', detail: `${this.admin.dashboard().activeRestaurants} restaurants are accepting orders.`, time: 'Now', tone: 'event-dot green' },
        ];
  }

  protected quickActions() {
    return [
      { code: 'AP', label: 'Approve Restaurant', hint: `${this.admin.pendingOwnerApprovals().length} pending owners`, action: null },
      { code: 'SA', label: 'Suspend Restaurant', hint: 'Pause risky outlets', action: null },
      { code: 'WIPE', label: 'Reset System', hint: 'Clear test orders & reviews', action: () => this.wipeSystem() },
      { code: 'RF', label: 'Process Refund', hint: 'Resolve payment issues', action: null },
      { code: 'BN', label: 'Broadcast', hint: 'Send platform alert', action: null },
    ];
  }

  wipeSystem(): void {
    if (confirm('Are you sure you want to clear all orders and reviews across all dashboards?')) {
      localStorage.removeItem('quickbite.reviews');
      localStorage.removeItem('quickbite.order.overrides');
      localStorage.removeItem('quickbite.hiddenOrders');
      localStorage.removeItem('quickbite.sync.orders');
      localStorage.removeItem('quickbite.sync.reviews');
      window.location.reload();
    }
  }

  protected issues() {
    return [
      { code: 'PAY', title: 'Payment failure watchlist', detail: 'Monitor Razorpay verification and refunds queue.', tone: 'issue-code red' },
      { code: 'SLA', title: 'Delayed delivery risk', detail: `${this.admin.dashboard().pendingOrders} active orders need SLA tracking.`, tone: 'issue-code orange' },
      { code: 'RST', title: 'Restaurant approval queue', detail: `${this.admin.pendingOwnerApprovals().length} restaurant requests awaiting review.`, tone: 'issue-code blue' },
      { code: 'AGT', title: 'Agent capacity', detail: `${this.admin.dashboard().deliveryAgentsCount} agents synced for current demand.`, tone: 'issue-code green' },
    ];
  }

  statusTone(status: string): string {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'green';
      case 'on the way':
        return 'blue';
      case 'preparing':
      case 'ready':
        return 'orange';
      case 'confirmed':
      case 'pending':
        return 'yellow';
      case 'cancelled':
        return 'red';
      default:
        return 'blue';
    }
  }

  pickupPoint(order: Order) {
    return (
      order.pickupLocation ??
      this.locations.restaurantLocation(order.restaurantId ?? order.restaurantName)
    );
  }

  dropPoint(order: Order) {
    return (
      order.deliveryLocation ?? this.locations.addressLocation(order.deliveryAddressLine ?? order.customerName ?? order.id)
    );
  }

  restaurantRatingRows(): Array<{ name: string; rating: number }> {
    return this.admin.dashboard().restaurants.map((restaurant) => ({
      name: restaurant.name,
      rating: this.reviewService.averageRestaurantRating(restaurant.name),
    }));
  }

  private averageRating(): number {
    const ratings = this.restaurantRatingRows().map((row) => row.rating).filter((rating) => rating > 0);
    if (!ratings.length) {
      return 4.7;
    }
    return Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1));
  }
}
