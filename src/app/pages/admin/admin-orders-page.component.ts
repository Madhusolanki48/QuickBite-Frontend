import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Order } from '../../core/app.models';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-admin-orders-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-head">
      <div>
        <h1>Order Operations Center</h1>
        <p>Comprehensive live order management, lifecycle tracking, kitchen stages, and dispatch controls.</p>
      </div>
      <div class="admin-toolbar">
        <span class="status-chip green">
          ● {{ liveOrdersCount() }} Live Orders in Pipeline
        </span>
      </div>
    </section>

    <!-- Top Summary KPI Grid -->
    <section class="stats-grid">
      <article class="card stat-card" (click)="tab.set('ALL')" style="cursor: pointer;">
        <div class="stat-card__icon gold">🛍️</div>
        <div class="stat-meta">
          <strong>{{ allOrders().length }}</strong>
          <span>Total Orders</span>
          <small class="delta">All Channels</small>
        </div>
      </article>

      <article class="card stat-card" (click)="tab.set('LIVE')" style="cursor: pointer;">
        <div class="stat-card__icon orange">⚡</div>
        <div class="stat-meta">
          <strong>{{ liveOrdersCount() }}</strong>
          <span>Live In-Flight</span>
          <small class="delta" style="color: #ff5a00;">Active Now</small>
        </div>
      </article>

      <article class="card stat-card" (click)="tab.set('COMPLETED')" style="cursor: pointer;">
        <div class="stat-card__icon green">✅</div>
        <div class="stat-meta">
          <strong>{{ completedOrdersCount() }}</strong>
          <span>Completed</span>
          <small class="delta">Delivered</small>
        </div>
      </article>

      <article class="card stat-card" (click)="tab.set('CANCELLED')" style="cursor: pointer;">
        <div class="stat-card__icon pink">✕</div>
        <div class="stat-meta">
          <strong>{{ cancelledOrdersCount() }}</strong>
          <span>Cancelled / Refund</span>
          <small class="delta" style="color: #ef4444;">Intervened</small>
        </div>
      </article>
    </section>

    <!-- Table Panel & Filters -->
    <article class="card section-card" style="padding: 1.5rem;">
      <div class="card-head" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <div class="filter-pills">
          <button type="button" class="pill" [class.active]="tab() === 'ALL'" (click)="tab.set('ALL')">
            All ({{ allOrders().length }})
          </button>
          <button type="button" class="pill" [class.active]="tab() === 'LIVE'" (click)="tab.set('LIVE')">
            Live ({{ liveOrdersCount() }})
          </button>
          <button type="button" class="pill" [class.active]="tab() === 'COMPLETED'" (click)="tab.set('COMPLETED')">
            Completed ({{ completedOrdersCount() }})
          </button>
          <button type="button" class="pill" [class.active]="tab() === 'CANCELLED'" (click)="tab.set('CANCELLED')">
            Cancelled ({{ cancelledOrdersCount() }})
          </button>
        </div>

        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
          <input
            type="search"
            class="search-input"
            placeholder="Search Order ID, customer, restaurant, items..."
            [(ngModel)]="searchQuery"
            style="min-width: 280px;"
          />

          <select class="search-input" [(ngModel)]="paymentFilter" style="padding: 0.85rem 1rem;">
            <option value="ALL">All Payments</option>
            <option value="UPI">UPI</option>
            <option value="COD">Cash on Delivery</option>
            <option value="CARD">Card / NetBanking</option>
          </select>
        </div>
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
              <th style="padding: 0.85rem 1rem;">Delivery Agent</th>
              <th style="padding: 0.85rem 1rem;">Status</th>
              <th style="padding: 0.85rem 1rem; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let order of filteredOrders()" style="border-bottom: 1px solid var(--line);">
              <td style="padding: 1rem;">
                <strong style="display: block; font-size: 0.95rem;">{{ order.id }}</strong>
                <small style="color: var(--muted);">{{ order.time || 'Today' }}</small>
              </td>
              <td style="padding: 1rem;">
                <strong>{{ order.customerName || 'Customer' }}</strong>
                <small *ngIf="order.customerPhone" style="display: block; color: var(--muted);">{{ order.customerPhone }}</small>
              </td>
              <td style="padding: 1rem; font-weight: 600;">{{ order.restaurantName }}</td>
              <td style="padding: 1rem; max-width: 220px; font-size: 0.88rem; color: var(--text);">
                {{ order.items }}
              </td>
              <td style="padding: 1rem; font-weight: 700;">₹{{ order.total }}</td>
              <td style="padding: 1rem;">
                <span class="status-chip" [class.green]="order.paymentStatus === 'SUCCESS'" [class.gold]="order.paymentStatus !== 'SUCCESS'">
                  {{ order.paymentMethod || 'UPI' }} · {{ order.paymentStatus || 'PENDING' }}
                </span>
              </td>
              <td style="padding: 1rem;">
                <span *ngIf="order.deliveryAgentName || order.agent" style="font-weight: 600;">
                  🛵 {{ order.deliveryAgentName || order.agent }}
                </span>
                <span *ngIf="!order.deliveryAgentName && !order.agent" style="color: var(--muted); font-size: 0.85rem;">
                  Unassigned
                </span>
              </td>
              <td style="padding: 1rem;">
                <span
                  class="status-chip"
                  [class.green]="order.status === 'DELIVERED'"
                  [class.gold]="order.status === 'PLACED' || order.status === 'CONFIRMED'"
                  [class.blue]="order.status === 'PREPARING' || order.status === 'READY' || order.status === 'ON_THE_WAY'"
                  [class.pink]="order.status === 'CANCELLED'"
                >
                  {{ prettyStatus(order.status) }}
                </span>
              </td>
              <td style="padding: 1rem; text-align: right;">
                <button
                  type="button"
                  class="action-btn"
                  style="padding: 0.45rem 0.85rem; font-size: 0.82rem;"
                  (click)="viewOrder(order)"
                >
                  Details →
                </button>
              </td>
            </tr>

            <tr *ngIf="filteredOrders().length === 0">
              <td colspan="9" style="padding: 3rem; text-align: center; color: var(--muted);">
                No orders match your filter criteria.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <!-- Detailed Order Timeline & Management Modal -->
    <div
      *ngIf="selectedOrder as order"
      class="modal-backdrop"
      style="position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 999; backdrop-filter: blur(4px);"
    >
      <div
        class="card modal-card"
        style="width: min(92%, 620px); max-height: 90vh; overflow-y: auto; padding: 2rem; background: var(--surface);"
      >
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
          <div>
            <span class="status-chip green" style="font-size: 0.75rem;">Order Management</span>
            <h2 style="margin: 0.35rem 0 0; font-size: 1.4rem;">{{ order.id }}</h2>
            <p style="margin: 0.2rem 0 0; color: var(--muted); font-size: 0.85rem;">
              Placed with <strong>{{ order.restaurantName }}</strong>
            </p>
          </div>
          <button
            type="button"
            class="action-btn"
            style="padding: 0.4rem 0.75rem; border-radius: 50%; font-size: 1rem;"
            (click)="selectedOrder = null"
          >
            ✕
          </button>
        </div>

        <!-- Visual Order Lifecycle Timeline -->
        <div style="background: var(--surface-2); padding: 1.25rem; border-radius: 16px; margin-bottom: 1.5rem;">
          <h4 style="margin: 0 0 1rem; font-size: 0.95rem;">Live Order Lifecycle</h4>
          <div style="display: flex; justify-content: space-between; position: relative;">
            <div
              *ngFor="let step of orderSteps; let i = index"
              style="display: flex; flex-direction: column; align-items: center; gap: 0.35rem; flex: 1; text-align: center;"
            >
              <div
                style="width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 0.75rem; font-weight: 700;"
                [style.background]="getStepIndex(order.status) >= i ? '#ff5a00' : 'var(--line)'"
                [style.color]="getStepIndex(order.status) >= i ? '#fff' : 'var(--muted)'"
              >
                {{ i + 1 }}
              </div>
              <span style="font-size: 0.75rem; font-weight: 600;" [style.color]="getStepIndex(order.status) >= i ? 'var(--text)' : 'var(--muted)'">
                {{ step }}
              </span>
            </div>
          </div>
        </div>

        <!-- Details Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
          <div class="card" style="padding: 1rem; border: 1px solid var(--line);">
            <span style="color: var(--muted); font-size: 0.8rem; font-weight: 700;">Customer Details</span>
            <strong style="display: block; margin-top: 0.25rem;">{{ order.customerName || 'Customer' }}</strong>
            <small *ngIf="order.customerEmail" style="display: block; color: var(--muted);">{{ order.customerEmail }}</small>
            <small *ngIf="order.customerPhone" style="display: block; color: var(--muted);">{{ order.customerPhone }}</small>
            <p style="margin: 0.5rem 0 0; font-size: 0.85rem; color: var(--text);">
              📍 {{ order.deliveryAddressLine || 'Delivery address on record' }}
            </p>
          </div>

          <div class="card" style="padding: 1rem; border: 1px solid var(--line);">
            <span style="color: var(--muted); font-size: 0.8rem; font-weight: 700;">Payment & Dispatch</span>
            <strong style="display: block; margin-top: 0.25rem;">₹{{ order.total }}</strong>
            <small style="display: block; color: var(--muted);">Method: {{ order.paymentMethod || 'UPI' }}</small>
            <small style="display: block; color: var(--muted);">Status: {{ order.paymentStatus || 'SUCCESS' }}</small>
            <p style="margin: 0.5rem 0 0; font-size: 0.85rem;">
              🛵 Rider: <strong>{{ order.deliveryAgentName || order.agent || 'Not Assigned' }}</strong>
            </p>
          </div>
        </div>

        <!-- Items Ordered -->
        <div style="background: var(--surface-2); padding: 1rem 1.25rem; border-radius: 14px; margin-bottom: 1.5rem;">
          <span style="color: var(--muted); font-size: 0.8rem; font-weight: 700;">Ordered Dishes</span>
          <p style="margin: 0.35rem 0 0; font-size: 0.95rem; font-weight: 600;">{{ order.items }}</p>
        </div>

        <!-- Administrative Controls -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--line); padding-top: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <label style="font-size: 0.85rem; font-weight: 600;">Status Override:</label>
            <select
              class="search-input"
              style="padding: 0.45rem 0.75rem; font-size: 0.85rem;"
              [ngModel]="order.status"
              (ngModelChange)="updateStatus(order.id, $event)"
            >
              <option value="PLACED">PLACED</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="PREPARING">PREPARING</option>
              <option value="READY">READY</option>
              <option value="ON_THE_WAY">OUT FOR DELIVERY</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div style="display: flex; gap: 0.75rem;">
            <button
              *ngIf="order.status !== 'CANCELLED' && order.status !== 'DELIVERED'"
              type="button"
              class="action-btn"
              style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4);"
              (click)="cancelOrder(order.id)"
            >
              Cancel Order
            </button>
            <button
              type="button"
              class="action-btn primary"
              (click)="selectedOrder = null"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './admin-pages.scss',
})
export class AdminOrdersPageComponent {
  private readonly admin = inject(AdminDashboardService);
  private readonly orderService = inject(OrderService);

  readonly tab = signal<'ALL' | 'LIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  searchQuery = '';
  paymentFilter = 'ALL';
  selectedOrder: Order | null = null;

  readonly orderSteps = ['Placed', 'Confirmed', 'Preparing', 'Ready', 'Transit', 'Delivered'];

  readonly allOrders = computed(() => this.orderService.orders());

  readonly liveOrdersCount = computed(() => {
    return this.allOrders().filter(
      (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED',
    ).length;
  });

  readonly completedOrdersCount = computed(() => {
    return this.allOrders().filter((o) => o.status === 'DELIVERED').length;
  });

  readonly cancelledOrdersCount = computed(() => {
    return this.allOrders().filter((o) => o.status === 'CANCELLED').length;
  });

  readonly filteredOrders = computed(() => {
    const list = this.allOrders();
    const currentTab = this.tab();
    const q = this.searchQuery.toLowerCase().trim();
    const pm = this.paymentFilter;

    return list.filter((order) => {
      // Tab filter
      if (currentTab === 'LIVE' && (order.status === 'DELIVERED' || order.status === 'CANCELLED')) {
        return false;
      }
      if (currentTab === 'COMPLETED' && order.status !== 'DELIVERED') {
        return false;
      }
      if (currentTab === 'CANCELLED' && order.status !== 'CANCELLED') {
        return false;
      }

      // Payment filter
      if (pm !== 'ALL' && order.paymentMethod !== pm) {
        return false;
      }

      // Query filter
      if (q) {
        const matchId = order.id.toLowerCase().includes(q);
        const matchCust = (order.customerName || '').toLowerCase().includes(q);
        const matchRest = (order.restaurantName || '').toLowerCase().includes(q);
        const matchAgent = (order.deliveryAgentName || order.agent || '').toLowerCase().includes(q);
        const matchItems = (order.items || '').toLowerCase().includes(q);
        if (!matchId && !matchCust && !matchRest && !matchAgent && !matchItems) {
          return false;
        }
      }

      return true;
    });
  });

  getStepIndex(status: string): number {
    switch (status) {
      case 'PLACED': return 0;
      case 'CONFIRMED': return 1;
      case 'PREPARING': return 2;
      case 'READY': return 3;
      case 'ON_THE_WAY': return 4;
      case 'DELIVERED': return 5;
      default: return 0;
    }
  }

  prettyStatus(status: string): string {
    return this.admin.prettyStatus(status);
  }

  viewOrder(order: Order): void {
    this.selectedOrder = order;
  }

  updateStatus(orderId: string, status: Order['status']): void {
    this.orderService.updateOrderStatus(orderId, status);
    if (this.selectedOrder && this.selectedOrder.id === orderId) {
      this.selectedOrder = { ...this.selectedOrder, status };
    }
    this.admin.addAuditEntry('Order Status Override', 'ORDER', `Admin updated Order #${orderId} status to ${status}`);
  }

  cancelOrder(orderId: string): void {
    if (confirm(`Cancel Order ${orderId}?`)) {
      this.orderService.updateOrderStatus(orderId, 'CANCELLED');
      if (this.selectedOrder) {
        this.selectedOrder = { ...this.selectedOrder, status: 'CANCELLED' };
      }
      this.admin.addAuditEntry('Cancelled Order', 'ORDER', `Admin cancelled Order #${orderId}`);
    }
  }
}
