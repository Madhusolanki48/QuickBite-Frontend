import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminUserResponse, Order } from '../../core/app.models';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-admin-customers-page',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule],
  template: `
    <section class="page-head">
      <div>
        <h1>Customer Directory & Accounts</h1>
        <p>Manage consumer accounts, inspect purchasing history, handle refunds, and toggle account access.</p>
      </div>
      <div class="admin-toolbar">
        <span class="status-chip green">
          ● {{ activeCustomersCount() }} Active Customers
        </span>
      </div>
    </section>

    <!-- KPI Summary Grid -->
    <section class="stats-grid">
      <article class="card stat-card">
        <div class="stat-card__icon purple">👥</div>
        <div class="stat-meta">
          <strong>{{ customers().length }}</strong>
          <span>Total Customers</span>
          <small class="delta">Platform Registrations</small>
        </div>
      </article>

      <article class="card stat-card">
        <div class="stat-card__icon green">🟢</div>
        <div class="stat-meta">
          <strong>{{ activeCustomersCount() }}</strong>
          <span>Active Accounts</span>
          <small class="delta">In Good Standing</small>
        </div>
      </article>

      <article class="card stat-card">
        <div class="stat-card__icon pink">🛑</div>
        <div class="stat-meta">
          <strong>{{ suspendedCustomersCount() }}</strong>
          <span>Suspended Accounts</span>
          <small class="delta" style="color: #ef4444;">Access Disabled</small>
        </div>
      </article>

      <article class="card stat-card">
        <div class="stat-card__icon gold">💰</div>
        <div class="stat-meta">
          <strong>₹{{ totalCustomerSpend() | number: '1.0-0' }}</strong>
          <span>Cumulative Spend</span>
          <small class="delta">Customer Lifetime Value</small>
        </div>
      </article>
    </section>

    <!-- Customer Directory Table -->
    <article class="card section-card" style="padding: 1.5rem;">
      <div class="card-head" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <div class="filter-pills">
          <button type="button" class="pill" [class.active]="tab() === 'ALL'" (click)="tab.set('ALL')">
            All ({{ customers().length }})
          </button>
          <button type="button" class="pill" [class.active]="tab() === 'ACTIVE'" (click)="tab.set('ACTIVE')">
            Active ({{ activeCustomersCount() }})
          </button>
          <button type="button" class="pill" [class.active]="tab() === 'SUSPENDED'" (click)="tab.set('SUSPENDED')">
            Suspended ({{ suspendedCustomersCount() }})
          </button>
        </div>

        <input
          type="search"
          class="search-input"
          placeholder="Search customer by name, email, or phone..."
          [(ngModel)]="searchQuery"
          style="min-width: 280px;"
        />
      </div>

      <div class="table-responsive">
        <table class="admin-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 0.85rem;">
              <th style="padding: 0.85rem 1rem;">Customer Name</th>
              <th style="padding: 0.85rem 1rem;">Email & Phone</th>
              <th style="padding: 0.85rem 1rem;">Orders Placed</th>
              <th style="padding: 0.85rem 1rem;">Total Spent</th>
              <th style="padding: 0.85rem 1rem;">Account Status</th>
              <th style="padding: 0.85rem 1rem; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let cust of filteredCustomers()" style="border-bottom: 1px solid var(--line);">
              <td style="padding: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <div
                    style="width: 38px; height: 38px; border-radius: 50%; background: #3b82f6; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 0.9rem;"
                  >
                    {{ cust.firstName.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <strong style="display: block; font-size: 0.95rem;">{{ cust.firstName }} {{ cust.lastName }}</strong>
                    <small style="color: var(--muted);">&#64;{{ cust.username || cust.email.split('@')[0] }}</small>
                  </div>
                </div>
              </td>
              <td style="padding: 1rem;">
                <div>{{ cust.email }}</div>
                <small style="color: var(--muted);">{{ cust.phoneNumber || 'Phone not provided' }}</small>
              </td>
              <td style="padding: 1rem; font-weight: 600;">
                {{ getOrdersForCustomer(cust.email).length }} orders
              </td>
              <td style="padding: 1rem; font-weight: 700; color: #10b981;">
                ₹{{ getCustomerSpend(cust.email) | number: '1.0-0' }}
              </td>
              <td style="padding: 1rem;">
                <span class="status-chip" [class.green]="cust.enabled !== false" [class.pink]="cust.enabled === false">
                  {{ cust.enabled !== false ? '🟢 Active' : '🔴 Suspended' }}
                </span>
              </td>
              <td style="padding: 1rem; text-align: right;">
                <div style="display: inline-flex; gap: 0.5rem;">
                  <button
                    type="button"
                    class="action-btn"
                    style="padding: 0.45rem 0.8rem; font-size: 0.82rem;"
                    (click)="selectedCustomer = cust"
                  >
                    View History
                  </button>
                  <button
                    type="button"
                    class="action-btn"
                    style="padding: 0.45rem 0.8rem; font-size: 0.82rem;"
                    [style.color]="cust.enabled !== false ? '#ef4444' : '#10b981'"
                    (click)="toggleCustomer(cust)"
                  >
                    {{ cust.enabled !== false ? 'Suspend' : 'Reactivate' }}
                  </button>
                </div>
              </td>
            </tr>

            <tr *ngIf="filteredCustomers().length === 0">
              <td colspan="6" style="padding: 3rem; text-align: center; color: var(--muted);">
                No customer accounts found matching criteria.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <!-- Customer Dossier Modal -->
    <div
      *ngIf="selectedCustomer as c"
      class="modal-backdrop"
      style="position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 999; backdrop-filter: blur(4px);"
    >
      <div
        class="card modal-card"
        style="width: min(92%, 620px); max-height: 90vh; overflow-y: auto; padding: 2rem; background: var(--surface);"
      >
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
          <div>
            <span class="status-chip green" style="font-size: 0.75rem;">Customer Account</span>
            <h2 style="margin: 0.35rem 0 0; font-size: 1.4rem;">{{ c.firstName }} {{ c.lastName }}</h2>
            <p style="margin: 0.2rem 0 0; color: var(--muted); font-size: 0.85rem;">
              {{ c.email }} · {{ c.phoneNumber || 'No phone' }}
            </p>
          </div>
          <button type="button" class="action-btn" (click)="selectedCustomer = null">✕</button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
          <div class="card" style="padding: 1rem; border: 1px solid var(--line);">
            <span style="color: var(--muted); font-size: 0.8rem; font-weight: 700;">Total Orders Placed</span>
            <h3 style="margin: 0.25rem 0 0; font-size: 1.3rem;">{{ getOrdersForCustomer(c.email).length }}</h3>
          </div>
          <div class="card" style="padding: 1rem; border: 1px solid var(--line);">
            <span style="color: var(--muted); font-size: 0.8rem; font-weight: 700;">Lifetime Spend</span>
            <h3 style="margin: 0.25rem 0 0; font-size: 1.3rem; color: #10b981;">₹{{ getCustomerSpend(c.email) | number: '1.0-0' }}</h3>
          </div>
        </div>

        <h4 style="margin: 0 0 0.75rem; font-size: 1rem;">Customer Order History</h4>
        <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 250px; overflow-y: auto; margin-bottom: 1.5rem;">
          <div
            *ngFor="let ord of getOrdersForCustomer(c.email)"
            style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: var(--surface-2); border-radius: 12px;"
          >
            <div>
              <strong style="font-size: 0.9rem;">{{ ord.id }} · {{ ord.restaurantName }}</strong>
              <small style="display: block; color: var(--muted);">{{ ord.items }}</small>
            </div>
            <div style="text-align: right;">
              <strong style="display: block; font-size: 0.95rem;">₹{{ ord.total }}</strong>
              <span class="status-chip" style="font-size: 0.72rem; padding: 0.2rem 0.5rem;">{{ ord.status }}</span>
            </div>
          </div>

          <div *ngIf="getOrdersForCustomer(c.email).length === 0" style="padding: 1.5rem; text-align: center; color: var(--muted);">
            No order history recorded for this customer yet.
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--line); padding-top: 1.25rem;">
          <button
            type="button"
            class="action-btn"
            [style.color]="c.enabled !== false ? '#ef4444' : '#10b981'"
            (click)="toggleCustomer(c); selectedCustomer = null"
          >
            {{ c.enabled !== false ? 'Suspend Account' : 'Reactivate Account' }}
          </button>
          <button type="button" class="action-btn primary" (click)="selectedCustomer = null">Close</button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './admin-pages.scss',
})
export class AdminCustomersPageComponent {
  private readonly admin = inject(AdminDashboardService);
  private readonly orders = inject(OrderService);

  readonly tab = signal<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  searchQuery = '';
  selectedCustomer: AdminUserResponse | null = null;

  readonly customers = computed(() => {
    const list = this.admin.allCustomers();
    if (list.length > 0) return list;
    // Fallback if DB only has current session
    return [
      {
        id: 1,
        firstName: 'Aarav',
        lastName: 'Mehta',
        username: 'aarav',
        email: 'aarav.mehta@gmail.com',
        phoneNumber: '+91 98765 43210',
        role: 'CUSTOMER' as const,
        enabled: true,
        createdAt: '2026-01-15T10:00:00Z',
      },
      {
        id: 2,
        firstName: 'Priya',
        lastName: 'Sharma',
        username: 'priya',
        email: 'priya.s@gmail.com',
        phoneNumber: '+91 98111 22334',
        role: 'CUSTOMER' as const,
        enabled: true,
        createdAt: '2026-02-10T10:00:00Z',
      },
    ];
  });

  readonly activeCustomersCount = computed(() =>
    this.customers().filter((c) => c.enabled !== false).length,
  );

  readonly suspendedCustomersCount = computed(() =>
    this.customers().filter((c) => c.enabled === false).length,
  );

  readonly totalCustomerSpend = computed(() => {
    return this.orders.orders()
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.total || 0), 0);
  });

  readonly filteredCustomers = computed(() => {
    const list = this.customers();
    const currentTab = this.tab();
    const q = this.searchQuery.toLowerCase().trim();

    return list.filter((c) => {
      if (currentTab === 'ACTIVE' && c.enabled === false) return false;
      if (currentTab === 'SUSPENDED' && c.enabled !== false) return false;

      if (q) {
        const fullName = `${c.firstName} ${c.lastName || ''}`.toLowerCase();
        const matchName = fullName.includes(q);
        const matchEmail = c.email.toLowerCase().includes(q);
        const matchPhone = (c.phoneNumber || '').includes(q);
        if (!matchName && !matchEmail && !matchPhone) return false;
      }

      return true;
    });
  });

  getOrdersForCustomer(email: string): Order[] {
    return this.orders.orders().filter((o) => o.customerEmail?.toLowerCase() === email.toLowerCase());
  }

  getCustomerSpend(email: string): number {
    return this.getOrdersForCustomer(email)
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.total || 0), 0);
  }

  toggleCustomer(c: AdminUserResponse): void {
    const isCurrentlyEnabled = c.enabled !== false;
    const action = isCurrentlyEnabled ? 'Suspend' : 'Reactivate';
    if (confirm(`${action} customer account for ${c.firstName} ${c.lastName || ''}?`)) {
      this.admin.toggleCustomerStatus(c.id, isCurrentlyEnabled, `${c.firstName} ${c.lastName || ''}`);
    }
  }
}
