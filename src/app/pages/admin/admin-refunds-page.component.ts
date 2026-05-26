import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminDashboardService, AdminRefund } from '../../services/admin-dashboard.service';

@Component({
  selector: 'app-admin-refunds-page',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule],
  template: `
    <section class="page-head">
      <div>
        <h1>Refund Operations</h1>
        <p>Review customer dispute claims, verify order history, and approve or reject refunds.</p>
      </div>
      <div class="admin-toolbar">
        <span class="status-chip gold" *ngIf="pendingCount() > 0">
          ⚠️ {{ pendingCount() }} Pending Reviews
        </span>
        <span class="status-chip green" *ngIf="pendingCount() === 0">
          ✅ All Refunds Processed
        </span>
      </div>
    </section>

    <!-- KPI Summary -->
    <section class="stats-grid">
      <article class="card stat-card">
        <div class="stat-card__icon gold">⏳</div>
        <div class="stat-meta">
          <strong>{{ pendingCount() }}</strong>
          <span>Pending Claims</span>
          <small class="delta">Awaiting Action</small>
        </div>
      </article>

      <article class="card stat-card">
        <div class="stat-card__icon green">✅</div>
        <div class="stat-meta">
          <strong>{{ approvedCount() }}</strong>
          <span>Approved Refunds</span>
          <small class="delta">Settled to Customers</small>
        </div>
      </article>

      <article class="card stat-card">
        <div class="stat-card__icon pink">🚫</div>
        <div class="stat-meta">
          <strong>{{ rejectedCount() }}</strong>
          <span>Rejected Requests</span>
          <small class="delta">Disallowed</small>
        </div>
      </article>

      <article class="card stat-card">
        <div class="stat-card__icon blue">💳</div>
        <div class="stat-meta">
          <strong>₹{{ totalRefundedAmount() | number: '1.0-0' }}</strong>
          <span>Total Refunded</span>
          <small class="delta">All Time</small>
        </div>
      </article>
    </section>

    <!-- Main List & Tabs -->
    <article class="card section-card" style="padding: 1.5rem;">
      <div class="card-head" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <div class="filter-pills">
          <button type="button" class="pill" [class.active]="tab() === 'ALL'" (click)="tab.set('ALL')">
            All ({{ allRefunds().length }})
          </button>
          <button type="button" class="pill" [class.active]="tab() === 'PENDING'" (click)="tab.set('PENDING')">
            Pending ({{ pendingCount() }})
          </button>
          <button type="button" class="pill" [class.active]="tab() === 'APPROVED'" (click)="tab.set('APPROVED')">
            Approved ({{ approvedCount() }})
          </button>
          <button type="button" class="pill" [class.active]="tab() === 'REJECTED'" (click)="tab.set('REJECTED')">
            Rejected ({{ rejectedCount() }})
          </button>
        </div>

        <input
          type="search"
          class="search-input"
          placeholder="Search by Order ID, Customer, or Restaurant..."
          [(ngModel)]="searchQuery"
          style="min-width: 280px;"
        />
      </div>

      <div class="table-responsive">
        <table class="admin-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 0.85rem;">
              <th style="padding: 0.85rem 1rem;">Refund / Order</th>
              <th style="padding: 0.85rem 1rem;">Customer</th>
              <th style="padding: 0.85rem 1rem;">Restaurant</th>
              <th style="padding: 0.85rem 1rem;">Amount</th>
              <th style="padding: 0.85rem 1rem;">Reason / Details</th>
              <th style="padding: 0.85rem 1rem;">Status</th>
              <th style="padding: 0.85rem 1rem; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let ref of filteredRefunds()" style="border-bottom: 1px solid var(--line);">
              <td style="padding: 1rem;">
                <strong style="display: block;">#{{ ref.id }}</strong>
                <small style="color: var(--muted);">{{ ref.orderId }}</small>
                <small style="display: block; color: var(--muted); font-size: 0.75rem;">{{ ref.requestedAt }}</small>
              </td>
              <td style="padding: 1rem;">
                <strong>{{ ref.customerName }}</strong>
                <small style="display: block; color: var(--muted);">{{ ref.customerEmail }}</small>
              </td>
              <td style="padding: 1rem; font-weight: 600;">{{ ref.restaurantName }}</td>
              <td style="padding: 1rem; font-weight: 700; color: #ef4444; font-size: 1.05rem;">
                ₹{{ ref.amount }}
              </td>
              <td style="padding: 1rem; max-width: 250px;">
                <p style="margin: 0; font-size: 0.88rem; line-height: 1.4;">{{ ref.reason }}</p>
                <small *ngIf="ref.notes" style="display: block; margin-top: 0.25rem; color: #10b981; font-weight: 600;">
                  Note: {{ ref.notes }}
                </small>
              </td>
              <td style="padding: 1rem;">
                <span
                  class="status-chip"
                  [class.gold]="ref.status === 'PENDING'"
                  [class.green]="ref.status === 'APPROVED'"
                  [class.pink]="ref.status === 'REJECTED'"
                >
                  {{ ref.status }}
                </span>
              </td>
              <td style="padding: 1rem; text-align: right;">
                <div *ngIf="ref.status === 'PENDING'" style="display: inline-flex; gap: 0.5rem;">
                  <button
                    type="button"
                    class="action-btn primary"
                    style="padding: 0.5rem 0.9rem; font-size: 0.82rem; background: #10b981; border-color: #10b981;"
                    (click)="approve(ref)"
                  >
                    ✓ Approve
                  </button>
                  <button
                    type="button"
                    class="action-btn"
                    style="padding: 0.5rem 0.9rem; font-size: 0.82rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);"
                    (click)="promptReject(ref)"
                  >
                    ✕ Reject
                  </button>
                </div>
                <span *ngIf="ref.status !== 'PENDING'" style="color: var(--muted); font-size: 0.85rem;">
                  Reviewed
                </span>
              </td>
            </tr>

            <tr *ngIf="filteredRefunds().length === 0">
              <td colspan="7" style="padding: 3rem; text-align: center; color: var(--muted);">
                No refunds found matching your filter or search.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <!-- Reject Reason Modal Dialog -->
    <div
      *ngIf="selectedRejectRefund"
      class="modal-backdrop"
      style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 999; backdrop-filter: blur(4px);"
    >
      <div class="card modal-card" style="width: min(90%, 460px); padding: 1.75rem; background: var(--surface);">
        <h3 style="margin: 0 0 0.5rem;">Reject Refund Request</h3>
        <p style="margin: 0 0 1rem; color: var(--muted); font-size: 0.9rem;">
          Provide a reason for rejecting refund #{{ selectedRejectRefund.id }} ({{ selectedRejectRefund.customerName }}).
        </p>

        <textarea
          rows="3"
          class="search-input"
          style="width: 100%; border-radius: 12px; margin-bottom: 1rem; resize: vertical;"
          placeholder="e.g. Delivery tracking confirms order was handed over successfully..."
          [(ngModel)]="rejectReason"
        ></textarea>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button type="button" class="action-btn" (click)="selectedRejectRefund = null">Cancel</button>
          <button
            type="button"
            class="action-btn"
            style="background: #ef4444; color: #fff; border-color: #ef4444;"
            (click)="confirmReject()"
          >
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './admin-pages.scss',
})
export class AdminRefundsPageComponent {
  private readonly admin = inject(AdminDashboardService);

  readonly tab = signal<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  searchQuery = '';
  selectedRejectRefund: AdminRefund | null = null;
  rejectReason = '';

  readonly allRefunds = computed(() => this.admin.refunds());

  readonly pendingCount = computed(() => this.allRefunds().filter((r) => r.status === 'PENDING').length);
  readonly approvedCount = computed(() => this.allRefunds().filter((r) => r.status === 'APPROVED').length);
  readonly rejectedCount = computed(() => this.allRefunds().filter((r) => r.status === 'REJECTED').length);

  readonly totalRefundedAmount = computed(() => {
    return this.allRefunds()
      .filter((r) => r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.amount, 0);
  });

  readonly filteredRefunds = computed(() => {
    const list = this.allRefunds();
    const currentTab = this.tab();
    const query = this.searchQuery.toLowerCase().trim();

    return list.filter((r) => {
      const matchTab = currentTab === 'ALL' || r.status === currentTab;
      const matchQuery =
        !query ||
        r.id.toLowerCase().includes(query) ||
        r.orderId.toLowerCase().includes(query) ||
        r.customerName.toLowerCase().includes(query) ||
        r.restaurantName.toLowerCase().includes(query);
      return matchTab && matchQuery;
    });
  });

  approve(ref: AdminRefund): void {
    if (confirm(`Approve refund of ₹${ref.amount} for Order ${ref.orderId}?`)) {
      this.admin.approveRefund(ref.id);
    }
  }

  promptReject(ref: AdminRefund): void {
    this.selectedRejectRefund = ref;
    this.rejectReason = 'Claim does not meet refund policy criteria';
  }

  confirmReject(): void {
    if (!this.selectedRejectRefund) return;
    this.admin.rejectRefund(this.selectedRejectRefund.id, this.rejectReason);
    this.selectedRejectRefund = null;
    this.rejectReason = '';
  }
}
