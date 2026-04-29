import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';

import { AdminDashboardService } from '../../services/admin-dashboard.service';

@Component({
  selector: 'app-admin-orders-page',
  imports: [NgClass, NgFor, NgIf],
  template: `
    <section class="page-head">
      <div>
        <h1>All Orders</h1>
      </div>
      <div class="admin-toolbar">
        <input class="search-input" placeholder="🔎 Search orders..." />
        <select class="toolbar-btn">
          <option>All Status</option>
          <option>Pending</option>
          <option>Confirmed</option>
          <option>Preparing</option>
          <option>On the Way</option>
          <option>Delivered</option>
          <option>Cancelled</option>
        </select>
        <button class="search-btn primary">Filter</button>
      </div>
    </section>

    <section class="card panel">
      <div class="filters">
        <button class="chip-button active">All ({{ admin.dashboard().totalOrdersCount }})</button>
        <button class="chip-button">Pending</button>
        <button class="chip-button">Active</button>
        <button class="chip-button">Delivered</button>
        <button class="chip-button">Cancelled</button>
      </div>

      <table class="card-table" *ngIf="admin.dashboard().recentOrders.length > 0; else emptyOrders">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Restaurant</th>
            <th>Items</th>
            <th>Total</th>
            <th>Agent</th>
            <th>Time</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of admin.dashboard().recentOrders">
            <td>
              <strong>{{ row.id }}</strong>
            </td>
            <td>{{ row.customer }}</td>
            <td>{{ row.restaurant }}</td>
            <td>{{ row.items }}</td>
            <td>
              <strong>{{ row.total }}</strong>
            </td>
            <td>{{ row.agent }}</td>
            <td>{{ row.time }}</td>
            <td>
              <span class="pill" [ngClass]="statusTone(row.status)">{{ row.status }}</span>
            </td>
            <td><button class="ghost-btn">View</button></td>
          </tr>
        </tbody>
      </table>

      <ng-template #emptyOrders>
        <div class="empty-state">
          <strong>No orders yet</strong>
          <p>New customer orders will appear here once checkout starts creating them.</p>
        </div>
      </ng-template>
    </section>
  `,
  styleUrl: './admin-pages.scss',
})
export class AdminOrdersPageComponent {
  protected readonly admin = inject(AdminDashboardService);

  statusTone(status: string): string {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'green';
      case 'on the way':
        return 'purple';
      case 'preparing':
        return 'orange';
      case 'confirmed':
        return 'blue';
      case 'pending':
        return 'orange';
      case 'cancelled':
        return 'red';
      default:
        return 'green';
    }
  }
}
