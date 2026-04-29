import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { AdminUserResponse } from '../../core/app.models';
import { AuthApiService } from '../../services/auth-api.service';
import { AdminDashboardService } from '../../services/admin-dashboard.service';

@Component({
  selector: 'app-admin-customers-page',
  imports: [NgClass, NgFor, NgIf],
  template: `
    <section class="page-head">
      <div>
        <h1>Customers</h1>
      </div>
      <input
        class="search-input"
        [value]="query()"
        (input)="query.set($any($event.target).value)"
        placeholder="🔎 Search customers..."
      />
    </section>

    <section class="card panel">
      <table class="card-table" *ngIf="filteredCustomers().length > 0; else emptyState">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Email</th>
            <th>Orders</th>
            <th>Total Spent</th>
            <th>Joined</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of filteredCustomers()">
            <td>
              <strong>{{ row.name }}</strong>
            </td>
            <td>{{ row.email }}</td>
            <td>
              <strong>{{ row.orders }}</strong>
            </td>
            <td>
              <strong>{{ row.spent }}</strong>
            </td>
            <td>{{ row.joined }}</td>
            <td>
              <span class="pill" [ngClass]="row.status === 'active' ? 'green' : 'gray'">{{
                row.status
              }}</span>
            </td>
            <td><button class="ghost-btn" type="button" (click)="view(row.email)">View</button></td>
          </tr>
        </tbody>
      </table>

      <ng-template #emptyState>
        <div class="empty-state">
          <strong>No customers found</strong>
          <p>Try another search term.</p>
        </div>
      </ng-template>
    </section>

    <section class="card panel" style="margin-top:1rem;" *ngIf="pendingOwners().length > 0">
      <div class="section-head">
        <div>
          <h2>Owner Approvals</h2>
          <p>Approve restaurant owners after verifying their restaurant details.</p>
        </div>
      </div>

      <table class="card-table">
        <thead>
          <tr>
            <th>Owner</th>
            <th>Restaurant</th>
            <th>Email</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let owner of pendingOwners()">
            <td>
              <strong>{{ owner.firstName }} {{ owner.lastName }}</strong>
            </td>
            <td>{{ owner.restaurantName || owner.restaurantId || 'Unassigned' }}</td>
            <td>{{ owner.email }}</td>
            <td>
              <span class="pill orange">{{ owner.approvalStatus || 'PENDING' }}</span>
            </td>
            <td class="list-actions">
              <button class="ghost-btn" type="button" (click)="approve(owner.id)">Approve</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  `,
  styleUrl: './admin-pages.scss',
})
export class AdminCustomersPageComponent {
  protected readonly admin = inject(AdminDashboardService);
  private readonly auth = inject(AuthApiService);
  protected readonly query = signal('');
  protected readonly pendingOwners = signal<AdminUserResponse[]>([]);
  protected readonly filteredCustomers = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.admin.dashboard().customers.filter((customer) => {
      if (!q) {
        return true;
      }

      return [
        customer.name,
        customer.email,
        customer.orders,
        customer.spent,
        customer.joined,
        customer.status,
      ].some((value) => String(value).toLowerCase().includes(q));
    });
  });

  constructor() {
    this.loadPendingOwners();
  }

  private loadPendingOwners(): void {
    this.auth.listAdminUsers().subscribe({
      next: (users) => {
        this.pendingOwners.set(
          users.filter((user) => user.role === 'RESTAURANT_OWNER' && user.enabled === false),
        );
      },
    });
  }

  view(email: string): void {
    const customer = this.admin.dashboard().customers.find((row) => row.email === email);
    if (!customer) {
      return;
    }

    window.alert(
      [
        `Customer: ${customer.name}`,
        `Email: ${customer.email}`,
        `Orders: ${customer.orders}`,
        `Spent: ${customer.spent}`,
        `Joined: ${customer.joined}`,
        `Status: ${customer.status}`,
      ].join('\n'),
    );
  }

  approve(id: number): void {
    this.auth.setUserEnabled(id, true).subscribe({
      next: () => this.loadPendingOwners(),
    });
  }
}
