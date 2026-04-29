import { NgClass, NgFor } from '@angular/common';
import { Component, inject } from '@angular/core';

import { DeliveryDashboardService } from '../../services/delivery-dashboard.service';

@Component({
  selector: 'app-delivery-history-page',
  imports: [NgClass, NgFor],
  template: `
    <section class="page-head">
      <div>
        <h1>Delivery History</h1>
      </div>
      <div class="toolbar">
        <button
          class="ghost-action"
          [class.active]="dashboard.historyPeriod() === 'today'"
          (click)="setPeriod('today')"
        >
          Today
        </button>
        <button
          class="ghost-action"
          [class.active]="dashboard.historyPeriod() === 'week'"
          (click)="setPeriod('week')"
        >
          This Week
        </button>
        <button
          class="ghost-action"
          [class.active]="dashboard.historyPeriod() === 'month'"
          (click)="setPeriod('month')"
        >
          This Month
        </button>
      </div>
    </section>

    <section class="card info-card">
      <table class="history-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Restaurant</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of dashboard.history()">
            <td>
              <strong>{{ item.id }}</strong>
            </td>
            <td>{{ item.restaurant }}</td>
            <td>{{ item.customer }}</td>
            <td>
              <strong>₹{{ item.amount }}</strong>
            </td>
            <td>
              <span class="status-pill" [ngClass]="pillTone(item.status)">{{
                prettyStatus(item.status)
              }}</span>
            </td>
            <td>{{ item.time }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  `,
  styleUrl: './delivery-pages.scss',
})
export class DeliveryHistoryPageComponent {
  protected readonly dashboard = inject(DeliveryDashboardService);

  setPeriod(period: 'today' | 'week' | 'month'): void {
    this.dashboard.setHistoryPeriod(period);
  }

  prettyStatus(status: string): string {
    return status.replaceAll('_', ' ');
  }

  pillTone(status: string): string {
    if (status === 'DELIVERED') return 'success';
    if (status === 'ON_THE_WAY') return 'warning';
    return 'pending';
  }
}
