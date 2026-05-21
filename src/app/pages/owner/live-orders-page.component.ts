import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { Order } from '../../core/app.models';
import { DeliveryAgentDirectoryService } from '../../services/delivery-agent-directory.service';
import { OwnerDashboardService } from '../../services/owner-dashboard.service';

@Component({
  selector: 'app-live-orders-page',
  imports: [NgClass, NgFor, NgIf],
  template: `
    <section class="page-head">
      <div>
        <h1>Live Orders</h1>
        <p>Accept, prepare, and hand off orders with clear kitchen timing.</p>
      </div>
      <div class="owner-toolbar">
        <span
          class="owner-status"
          [attr.title]="
            dashboard.restaurantProfile().open
              ? 'Customers can place orders now'
              : 'Customers cannot order while the restaurant is closed'
          "
          [ngClass]="dashboard.restaurantProfile().open ? 'status-open' : 'status-closed'"
        >
          {{
            dashboard.restaurantProfile().open
              ? 'Open - accepting orders'
              : 'Closed - orders paused'
          }}
        </span>
        <button
          class="toggle"
          type="button"
          [class.off]="!dashboard.restaurantProfile().open"
          (click)="toggleOpen()"
        ></button>
      </div>
    </section>

    <section class="order-tabs card">
      <button type="button" class="active">New</button>
      <button type="button">Preparing</button>
      <button type="button">Ready</button>
      <button type="button">Out for delivery</button>
      <button type="button">Completed</button>
    </section>

    <section class="status-note card section-card">
      <div class="status-note__row">
        <strong>{{ dashboard.restaurantProfile().open ? 'Open' : 'Closed' }}</strong>
        <span>{{ dashboard.restaurantProfile().open ? 'Accepting orders' : 'Orders paused' }}</span>
      </div>
      <p>
        {{
          dashboard.restaurantProfile().open
            ? 'Customers can order from your menu right now.'
            : 'Customers cannot order until you reopen the restaurant.'
        }}
      </p>
    </section>

    <section class="stats-row">
      <div class="card stat-card">
        <div class="stat-card__icon">🧾</div>
        <div class="stat-card__meta">
          <strong>{{ countByStatus('PLACED') }}</strong
          ><span>New</span>
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-card__icon pink">👨‍🍳</div>
        <div class="stat-card__meta">
          <strong>{{ countByStatus('PREPARING') }}</strong
          ><span>Preparing</span>
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-card__icon green">✅</div>
        <div class="stat-card__meta">
          <strong>{{ countByStatus('READY') }}</strong
          ><span>Ready</span>
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-card__icon">🛵</div>
        <div class="stat-card__meta">
          <strong>{{ countWithAgent() }}</strong
          ><span>Agent assigned</span>
        </div>
      </div>
    </section>

    <ng-container *ngIf="loading(); else orderContent">
      <section class="card-stack">
        <article class="card section-card skeleton-card" *ngFor="let _ of skeletons">
          <div class="skeleton skeleton-line short"></div>
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line medium"></div>
          <div class="skeleton skeleton-block"></div>
        </article>
      </section>
    </ng-container>

    <ng-template #orderContent>
      <section class="empty-state card section-card" *ngIf="!orders().length">
        <div class="empty-state__visual">
          <img src="/assets/images/hero-banners/free-delivery.jpg" alt="No active orders" />
        </div>
        <h2>No active orders</h2>
        <p>New customer orders will appear here automatically.</p>
        <button class="action-btn primary" type="button">Promote today's specials</button>
      </section>

      <section class="card-stack" *ngIf="orders().length">
        <article
          class="card section-card order-card"
          *ngFor="let order of orders()"
          [ngClass]="priorityClass(order)"
          (click)="toggleExpanded(order.id)"
        >
          <div class="status-line order-card__top">
            <div class="order-heading">
              <div class="order-heading__title">
                <h2>{{ order.id }}</h2>
                <span class="status-chip" [ngClass]="statusTone(order.status)">{{
                  prettyStatus(order.status)
                }}</span>
              </div>
              <p>{{ order.customerName }} · {{ order.time }}</p>
              <p class="order-items">{{ order.items }}</p>
              <div class="detail-pills">
                <span>Paid online</span>
                <span>Kitchen timer {{ prepCountdown(order) }}</span>
                <span>{{ order.deliveryAgentName || 'Partner pending' }}</span>
              </div>
            </div>
            <div class="owner-toolbar order-summary">
              <strong>Rs {{ order.total }}</strong>
              <div class="tiny-meta">
                <span>Placed {{ orderAge(order) }}</span>
                <span *ngIf="order.customerDistanceKm !== undefined"
                  >Customer {{ order.customerDistanceKm }} km away</span
                >
              </div>
            </div>
          </div>

          <div class="order-timeline">
            <span [class.done]="stageIndex(order.status) >= 0">New</span>
            <span [class.done]="stageIndex(order.status) >= 1">Accepted</span>
            <span [class.done]="stageIndex(order.status) >= 2">Preparing</span>
            <span [class.done]="stageIndex(order.status) >= 3">Ready</span>
            <span [class.done]="stageIndex(order.status) >= 4">Picked</span>
          </div>

          <div class="order-actions sticky-actions" (click)="$event.stopPropagation()">
            <button
              *ngIf="order.status === 'PLACED'"
              class="action-btn primary"
              type="button"
              (click)="dashboard.acceptOrder(order.id)"
            >
              Accept
            </button>
            <button
              *ngIf="order.status === 'CONFIRMED'"
              class="action-btn primary"
              type="button"
              (click)="prepareAndAssign(order.id)"
            >
              Preparing
            </button>
            <button
              *ngIf="order.status === 'PREPARING' && !order.deliveryAgentName"
              class="action-btn primary"
              type="button"
              (click)="toggleExpanded(order.id)"
            >
              Choose Agent
            </button>
            <button
              *ngIf="order.status === 'PREPARING' && order.deliveryAgentName"
              class="action-btn primary"
              type="button"
              (click)="dashboard.markReady(order.id)"
            >
              Mark Ready
            </button>
            <button *ngIf="order.status === 'READY'" class="ghost-btn" type="button">
              Waiting for pickup
            </button>
            <button
              class="ghost-btn"
              type="button"
              (click)="toggleExpanded(order.id); $event.stopPropagation()"
            >
              {{ isExpanded(order.id) ? 'Collapse' : 'Expand' }}
            </button>
            <button
              *ngIf="order.status !== 'DELIVERED' && order.status !== 'CANCELLED'"
              class="ghost-btn danger-text"
              type="button"
              (click)="cancelOrder(order.id); $event.stopPropagation()"
              style="color: #dc3545; border-color: rgba(220, 53, 69, 0.2);"
            >
              Cancel Order
            </button>
            <button class="ghost-btn" type="button">Call</button>
            <button class="ghost-btn" type="button">Chat</button>
          </div>

          <section class="order-details" *ngIf="isExpanded(order.id)">
            <div class="detail-grid">
              <div class="detail-card">
                <span>Customer</span>
                <strong>{{ order.customerName || 'Customer' }}</strong>
                <small *ngIf="order.customerEmail">{{ order.customerEmail }}</small>
                <small *ngIf="order.customerPhone">{{ order.customerPhone }}</small>
                <small *ngIf="order.customerDistanceKm !== undefined"
                  >Drop distance: {{ order.customerDistanceKm }} km</small
                >
              </div>
              <div class="detail-card">
                <span>Address</span>
                <strong>{{ order.deliveryAddressLine || 'Not provided' }}</strong>
                <small>{{ order.note || 'No special instructions' }}</small>
              </div>
              <div class="detail-card">
                <span>Kitchen timer</span>
                <strong>{{ prepCountdown(order) }}</strong>
                <small>Target within 15:00</small>
              </div>
            </div>

            <p class="note-highlight" *ngIf="order.note">
              <strong>Order notes:</strong> {{ order.note }}
            </p>

            <div
              *ngIf="order.status === 'PREPARING' || order.deliveryAgentName"
              style="margin-top:1rem;padding:1rem;border-radius:20px;border:1px solid rgba(255,90,0,.14);background:linear-gradient(180deg,#fffaf4,#fff4ec);display:grid;gap:1rem;"
            >
              <div
                style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;"
              >
                <div>
                  <span style="display:block;color:var(--muted);font-size:.84rem;font-weight:700;"
                    >Delivery partner</span
                  >
                  <strong style="display:block;font-family:'Space Grotesk',sans-serif;">
                    {{ order.deliveryAgentName || 'Choose an available agent' }}
                  </strong>
                  <small style="color:var(--muted);">
                    {{
                      order.deliveryAgentName
                        ? 'Assigned partner and trip stats.'
                        : 'Compare live availability before assigning.'
                    }}
                  </small>
                </div>
                <span
                  class="status-chip"
                  [ngClass]="order.deliveryAgentName ? 'status-ready' : 'status-preparing'"
                >
                  {{ order.deliveryAgentName ? 'Assigned' : 'Ready to assign' }}
                </span>
              </div>

              <div
                *ngIf="!order.deliveryAgentName"
                style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem;"
              >
                <article
                  *ngFor="let agent of agents.agents()"
                  style="display:grid;gap:.65rem;padding:1rem;border-radius:18px;background:rgba(255,255,255,.9);border:1px solid rgba(255,90,0,.12);"
                >
                  <div
                    style="display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;"
                  >
                    <div>
                      <strong style="display:block;">{{ agent.name }}</strong>
                      <small style="color:var(--muted);">{{ agent.zone }}</small>
                    </div>
                    <span class="status-chip" [ngClass]="agent.available ? 'status-ready' : 'status-danger'">{{ agent.available ? '🟢 Active' : '🔴 Offline' }}</span>
                  </div>
                  <div style="display:grid;gap:.25rem;color:var(--muted);font-size:.88rem;">
                    <span>{{ agent.phone }}</span>
                    <span>{{ agent.email }}</span>
                    <span>{{ agent.rating }}</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:0.5rem;justify-content:space-between;width:100%;margin-top:0.4rem;border-top:1px solid rgba(0,0,0,0.04);padding-top:0.6rem;">
                    <button
                      class="ghost-btn"
                      type="button"
                      style="font-size:0.75rem;padding:0.35rem 0.5rem;"
                      (click)="toggleAgentAvailability(agent.email, agent.available); $event.stopPropagation()"
                    >
                      {{ agent.available ? 'Set Offline' : 'Set Active' }}
                    </button>
                    <button
                    class="action-btn primary"
                    type="button"
                    style="font-size:0.75rem;padding:0.35rem 0.6rem;"
                    [disabled]="!agent.available"
                    (click)="assignAgent(order.id, agent.email); $event.stopPropagation()"
                  >
                    Assign Agent
                  </button>
                  </div>
                </article>
              </div>

              <div
                *ngIf="order.deliveryAgentName"
                style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.75rem;"
              >
                <div
                  style="display:grid;gap:.2rem;padding:.85rem 1rem;border-radius:16px;background:#fff;border:1px solid rgba(255,90,0,.1);"
                >
                  <small style="color:var(--muted);font-weight:700;">Phone</small>
                  <strong>{{ order.deliveryAgentPhone || 'Phone pending' }}</strong>
                </div>
                <div
                  style="display:grid;gap:.2rem;padding:.85rem 1rem;border-radius:16px;background:#fff;border:1px solid rgba(255,90,0,.1);"
                >
                  <small style="color:var(--muted);font-weight:700;">ETA</small>
                  <strong>{{
                    order.deliveryAgentEtaMinutes
                      ? order.deliveryAgentEtaMinutes + ' min'
                      : 'Pending'
                  }}</strong>
                </div>
                <div
                  style="display:grid;gap:.2rem;padding:.85rem 1rem;border-radius:16px;background:#fff;border:1px solid rgba(255,90,0,.1);"
                >
                  <small style="color:var(--muted);font-weight:700;">Distance</small>
                  <strong>{{
                    order.deliveryAgentDistanceKm
                      ? order.deliveryAgentDistanceKm + ' km'
                      : 'Pending'
                  }}</strong>
                </div>
                <div
                  style="display:grid;gap:.2rem;padding:.85rem 1rem;border-radius:16px;background:#fff;border:1px solid rgba(255,90,0,.1);"
                >
                  <small style="color:var(--muted);font-weight:700;">Earnings</small>
                  <strong>{{
                    order.deliveryAgentEarnings ? 'Rs ' + order.deliveryAgentEarnings : 'Pending'
                  }}</strong>
                </div>
              </div>
            </div>
          </section>
        </article>
      </section>
    </ng-template>
  `,
  styleUrl: './owner-pages.scss',
})
export class LiveOrdersPageComponent {
  protected readonly dashboard = inject(OwnerDashboardService);
  protected readonly agents = inject(DeliveryAgentDirectoryService);
  protected readonly loading = signal(true);
  protected readonly expanded = signal<Record<string, boolean>>({});
  protected readonly skeletons = [1, 2, 3];

  readonly orders = computed(() =>
    this.dashboard
      .liveOrders()
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );

  constructor() {
    window.setTimeout(() => this.loading.set(false), 250);
  }

  toggleOpen(): void {
    this.dashboard.updateRestaurantOpen(!this.dashboard.restaurantProfile().open);
  }

  toggleExpanded(orderId: string): void {
    this.expanded.update((state) => ({ ...state, [orderId]: !state[orderId] }));
  }

  prepareAndAssign(orderId: string): void {
    this.dashboard.startPreparing(orderId);
    this.expanded.update((state) => ({ ...state, [orderId]: true }));
  }

  cancelOrder(orderId: string): void {
    if (confirm('Are you sure you want to cancel this order?')) {
      this.dashboard.cancelOrder(orderId);
    }
  }

  assignAgent(orderId: string, agentEmail: string): void {
    this.dashboard.assignDeliveryAgent(orderId, agentEmail);
  }

  toggleAgentAvailability(email: string, currentStatus: boolean): void {
    this.agents.setAvailability(email, !currentStatus);
  }

  isExpanded(orderId: string): boolean {
    return this.expanded()[orderId] ?? false;
  }

  countByStatus(status: Order['status']): number {
    return this.orders().filter((order) => order.status === status).length;
  }

  countWithAgent(): number {
    return this.orders().filter((order) => !!order.deliveryAgentName).length;
  }

  prettyStatus(status: string): string {
    switch (status) {
      case 'PLACED':
        return 'New';
      case 'CONFIRMED':
        return 'Accepted';
      case 'PREPARING':
        return 'Preparing';
      case 'READY':
        return 'Ready';
      case 'ON_THE_WAY':
        return 'Picked';
      case 'DELIVERED':
        return 'Delivered';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status.replaceAll('_', ' ');
    }
  }

  statusTone(status: string): string {
    switch (status) {
      case 'PLACED':
        return 'status-new';
      case 'CONFIRMED':
        return 'status-accepted';
      case 'PREPARING':
        return 'status-preparing';
      case 'READY':
        return 'status-ready';
      case 'ON_THE_WAY':
        return 'status-pickup';
      case 'DELIVERED':
        return 'status-success';
      case 'CANCELLED':
        return 'status-danger';
      default:
        return 'status-ready';
    }
  }

  priorityClass(order: Order): string {
    const age = this.ageMinutes(order);
    if (age >= 25) {
      return 'priority-late';
    }
    if (age <= 4) {
      return 'priority-new';
    }
    return '';
  }

  orderAge(order: Order): string {
    return `${this.ageMinutes(order)} min ago`;
  }

  prepCountdown(order: Order): string {
    const age = this.ageMinutes(order);
    const remaining = Math.max(15 - age, 0);
    const minutes = String(Math.floor(remaining)).padStart(2, '0');
    const seconds = String(Math.round((remaining % 1) * 60)).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  stageIndex(status: Order['status']): number {
    switch (status) {
      case 'PLACED':
        return 0;
      case 'CONFIRMED':
        return 1;
      case 'PREPARING':
        return 2;
      case 'READY':
        return 3;
      case 'ON_THE_WAY':
      case 'DELIVERED':
        return 4;
      default:
        return -1;
    }
  }

  private ageMinutes(order: Order): number {
    const created = new Date(order.createdAt).getTime();
    if (Number.isNaN(created)) {
      return 0;
    }
    return Math.max(Math.floor((Date.now() - created) / 60000), 0);
  }
}
