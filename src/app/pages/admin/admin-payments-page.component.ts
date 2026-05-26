import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-admin-payments-page',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <section class="page-head">
      <div>
        <h1>Payments & Financial Revenue</h1>
        <p>Real backend transaction ledger, platform commissions, restaurant settlements, and tax withholdings.</p>
      </div>
      <div class="admin-toolbar">
        <button class="action-btn primary" type="button" (click)="exportSummary()">
          📥 Export Payout Ledger
        </button>
      </div>
    </section>

    <!-- Financial Breakdown Cards -->
    <section class="stats-grid">
      <article class="card stat-card">
        <div class="stat-card__icon green">💵</div>
        <div class="stat-meta">
          <strong>₹{{ grossRevenue() | number: '1.0-0' }}</strong>
          <span>Gross Revenue (GMV)</span>
          <small class="delta">Total Captured</small>
        </div>
      </article>

      <article class="card stat-card">
        <div class="stat-card__icon gold">💼</div>
        <div class="stat-meta">
          <strong>₹{{ commission() | number: '1.0-0' }}</strong>
          <span>Platform Commission</span>
          <small class="delta">{{ settings().commission }}% Platform Take</small>
        </div>
      </article>

      <article class="card stat-card">
        <div class="stat-card__icon blue">🏪</div>
        <div class="stat-meta">
          <strong>₹{{ restaurantPayouts() | number: '1.0-0' }}</strong>
          <span>Restaurant Payouts</span>
          <small class="delta">Net Merchant Payout</small>
        </div>
      </article>

      <article class="card stat-card">
        <div class="stat-card__icon pink">🛵</div>
        <div class="stat-meta">
          <strong>₹{{ deliveryEarnings() | number: '1.0-0' }}</strong>
          <span>Delivery Partner Fees</span>
          <small class="delta">Rider Disbursements</small>
        </div>
      </article>
    </section>

    <!-- Tax and Refund Sub-row -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.5rem;">
      <article class="card section-card" style="padding: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="color: var(--muted); font-size: 0.88rem; font-weight: 600;">Government GST (18%)</span>
          <h3 style="margin: 0.35rem 0 0; font-size: 1.5rem;">₹{{ taxes() | number: '1.0-0' }}</h3>
        </div>
        <span class="status-chip green">Automated Invoicing</span>
      </article>

      <article class="card section-card" style="padding: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="color: var(--muted); font-size: 0.88rem; font-weight: 600;">Settled & Pending Refunds</span>
          <h3 style="margin: 0.35rem 0 0; font-size: 1.5rem; color: #ef4444;">₹{{ totalRefunds() | number: '1.0-0' }}</h3>
        </div>
        <span class="status-chip" [class.gold]="pendingRefundCount() > 0" [class.green]="pendingRefundCount() === 0">
          {{ pendingRefundCount() }} Pending Approvals
        </span>
      </article>
    </div>

    <!-- Transaction Ledger Table -->
    <article class="card section-card" style="padding: 1.5rem;">
      <div class="card-head" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <h3 style="margin: 0; font-size: 1.25rem;">Live Transaction Ledger</h3>
          <p style="margin: 0.25rem 0 0; color: var(--muted); font-size: 0.88rem;">Every order transaction linked to payment gateways and settlement channels</p>
        </div>
        <div class="filter-pills">
          <button type="button" class="pill" [class.active]="filter() === 'ALL'" (click)="filter.set('ALL')">All</button>
          <button type="button" class="pill" [class.active]="filter() === 'ONLINE'" (click)="filter.set('ONLINE')">Online / UPI</button>
          <button type="button" class="pill" [class.active]="filter() === 'COD'" (click)="filter.set('COD')">Cash on Delivery</button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="admin-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 0.85rem;">
              <th style="padding: 0.85rem 1rem;">Transaction / Order</th>
              <th style="padding: 0.85rem 1rem;">Customer</th>
              <th style="padding: 0.85rem 1rem;">Restaurant</th>
              <th style="padding: 0.85rem 1rem;">Method</th>
              <th style="padding: 0.85rem 1rem;">Amount</th>
              <th style="padding: 0.85rem 1rem;">Commission</th>
              <th style="padding: 0.85rem 1rem;">Payout Net</th>
              <th style="padding: 0.85rem 1rem;">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let tx of transactions()" style="border-bottom: 1px solid var(--line);">
              <td style="padding: 1rem;">
                <strong style="display: block; font-size: 0.95rem;">{{ tx.orderId }}</strong>
                <small style="color: var(--muted);">{{ tx.time }}</small>
              </td>
              <td style="padding: 1rem; font-weight: 600;">{{ tx.customer }}</td>
              <td style="padding: 1rem;">{{ tx.restaurant }}</td>
              <td style="padding: 1rem;">
                <span class="status-chip" [class.blue]="tx.method !== 'COD'" [class.gold]="tx.method === 'COD'">
                  {{ tx.method }}
                </span>
              </td>
              <td style="padding: 1rem; font-weight: 700;">₹{{ tx.amount }}</td>
              <td style="padding: 1rem; color: #10b981; font-weight: 600;">₹{{ tx.commission }}</td>
              <td style="padding: 1rem; font-weight: 600;">₹{{ tx.netPayout }}</td>
              <td style="padding: 1rem;">
                <span
                  class="status-chip"
                  [class.green]="tx.status === 'SUCCESS'"
                  [class.gold]="tx.status === 'PENDING'"
                  [class.pink]="tx.status === 'REFUNDED'"
                >
                  {{ tx.status }}
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
export class AdminPaymentsPageComponent {
  private readonly admin = inject(AdminDashboardService);
  private readonly orders = inject(OrderService);

  readonly filter = signal<'ALL' | 'ONLINE' | 'COD'>('ALL');

  readonly settings = computed(() => this.admin.dashboard().settings);
  readonly grossRevenue = computed(() => this.admin.grossRevenueValue());
  readonly commission = computed(() => this.admin.commissionValue());
  readonly restaurantPayouts = computed(() => this.admin.restaurantPayoutsValue());
  readonly deliveryEarnings = computed(() => this.admin.deliveryEarningsValue());
  readonly taxes = computed(() => Math.round((this.grossRevenue() * 18) / 100));

  readonly totalRefunds = computed(() => {
    return this.admin.refunds().reduce((sum, r) => sum + r.amount, 0);
  });

  readonly pendingRefundCount = computed(() => this.admin.pendingRefundsCount());

  readonly transactions = computed(() => {
    const list = this.orders.orders();
    const commPct = this.settings().commission || 18;
    const f = this.filter();

    return list
      .filter((o) => {
        if (f === 'ALL') return true;
        if (f === 'COD') return o.paymentMethod === 'COD';
        return o.paymentMethod !== 'COD';
      })
      .map((o) => {
        const amt = o.total || 0;
        const comm = Math.round((amt * commPct) / 100);
        const net = Math.max(0, amt - comm);
        return {
          orderId: o.id,
          customer: o.customerName || 'QuickBite User',
          restaurant: o.restaurantName,
          method: o.paymentMethod || 'UPI',
          amount: amt,
          commission: comm,
          netPayout: net,
          status: o.paymentStatus || (o.paymentMethod === 'COD' ? 'PENDING' : 'SUCCESS'),
          time: o.time || 'Today',
        };
      });
  });

  exportSummary(): void {
    const data = JSON.stringify(this.transactions(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QuickBite_Financial_Ledger_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
