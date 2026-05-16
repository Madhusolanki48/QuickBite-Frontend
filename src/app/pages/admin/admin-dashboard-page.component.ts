import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LiveRouteMapComponent } from '../../components/live-route-map.component';
import { Order } from '../../core/app.models';
import { LocationService } from '../../services/location.service';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { OrderService } from '../../services/order.service';
import { ReviewService } from '../../services/review.service';

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [NgClass, NgFor, NgIf, RouterLink, LiveRouteMapComponent],
  template: `
    <section class="page-head">
      <div>
        <h1>Admin Dashboard</h1>
        <p>Platform-wide overview · Last updated just now</p>
      </div>
      <div class="admin-toolbar">
        <button class="toolbar-btn">⬇ Export Report</button>
      </div>
    </section>

    <section class="card panel approval-banner" *ngIf="admin.pendingApprovalCount() > 0">
      <div class="approval-banner__badge">{{ admin.pendingApprovalCount() }}</div>
      <div class="approval-banner__copy">
        <h2>Approval queue needs attention</h2>
        <p>
          {{ admin.pendingOwnerApprovals().length }} restaurant owner(s) and
          {{ admin.pendingDeliveryApprovals().length }} delivery partner(s) are waiting for
          approval.
        </p>
      </div>
      <a routerLink="/admin/customers" class="approval-banner__action">Review approvals</a>
    </section>

    <section class="stats-grid">
      <article class="card stat-card" *ngFor="let metric of admin.dashboard().metrics">
        <div class="stat-card__icon green">📦</div>
        <div class="stat-meta">
          <strong>{{ metric.value }}</strong>
          <span>{{ metric.label }}</span>
          <span class="delta">{{ metric.delta }}</span>
        </div>
      </article>
    </section>

    <section class="two-col">
      <article class="card panel">
        <h2>Order Volume (Last 7 Days)</h2>
        <div class="bars">
          <div style="height:22%"></div>
          <div style="height:36%"></div>
          <div style="height:18%"></div>
          <div style="height:58%"></div>
          <div style="height:72%"></div>
          <div style="height:48%"></div>
          <div style="height:66%"></div>
        </div>
      </article>

      <article class="card panel">
        <h2>Quick Actions</h2>
        <div class="form-grid">
          <button class="chip-button">📋 View Pending Orders (23)</button>
          <button class="chip-button">🏪 Approve New Restaurants</button>
          <button class="chip-button">🚴 Manage Delivery Agents</button>
          <button class="chip-button">⚙ Platform Settings</button>
        </div>
      </article>
    </section>

    <app-live-route-map
      *ngIf="activeOrder() as order"
      title="Live Platform Delivery"
      [subtitle]="order.restaurantName + ' → ' + (order.deliveryAddressLine ?? 'Delivery address')"
      [status]="order.status.replaceAll('_', ' ')"
      [pickup]="pickupPoint(order)"
      [drop]="dropPoint(order)"
      [routeStart]="pickupPoint(order)"
      [routeEnd]="dropPoint(order)"
    />

    <section class="card panel" style="margin-top:1rem;">
      <h2>Recent Orders</h2>
      <table class="card-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Restaurant</th>
            <th>Agent</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of admin.dashboard().recentOrders">
            <td>
              <strong>{{ row.id }}</strong>
            </td>
            <td>{{ row.customer }}</td>
            <td>{{ row.restaurant }}</td>
            <td>{{ row.agent }}</td>
            <td>
              <strong>{{ row.total }}</strong>
            </td>
            <td>
              <span class="pill" [ngClass]="statusTone(row.status)">{{ row.status }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="card panel" style="margin-top:1rem;">
      <h2>Recent Reviews</h2>
      <div class="review-feed__item" *ngFor="let review of reviewService.reviews().slice(0, 4)">
        <strong>{{ review.restaurantName }}</strong>
        <span
          >{{ review.customerName }} · Food {{ review.restaurantRating ?? 'n/a' }}/5 · Delivery
          {{ review.deliveryAgentRating ?? 'n/a' }}/5 · Overall
          {{ review.overallRating ?? 'n/a' }}/5</span
        >
        <p>{{ review.comment }}</p>
        <div class="review-response" *ngIf="review.responses.length">
          <strong>Responses</strong>
          <p *ngFor="let response of review.responses">
            {{ response.byRole }}: {{ response.text }}
          </p>
        </div>
        <div class="row-actions">
          <button class="ghost-btn" type="button" (click)="flag(review.id)">Flag</button>
          <button class="ghost-btn" type="button" (click)="remove(review.id)">Delete</button>
          <button
            class="ghost-btn"
            type="button"
            (click)="block(review.customerEmail || review.customerName)"
          >
            Block User
          </button>
        </div>
      </div>
    </section>

    <section class="two-col" style="margin-top:1rem;">
      <article class="card panel">
        <h2>Average Ratings by Restaurant</h2>
        <div class="review-feed__item" *ngFor="let item of restaurantRatingRows()">
          <strong>{{ item.name }}</strong>
          <span>{{ item.rating }}/5 average</span>
        </div>
      </article>
      <article class="card panel">
        <h2>Average Ratings by Delivery Agent</h2>
        <div class="review-feed__item" *ngFor="let item of deliveryRatingRows()">
          <strong>{{ item.name }}</strong>
          <span>{{ item.rating }}/5 average</span>
        </div>
      </article>
    </section>

    <section class="card panel" style="margin-top:1rem;">
      <h2>Flagged Reviews</h2>
      <div class="review-feed__item" *ngFor="let review of reviewService.flaggedReviews()">
        <strong>{{ review.restaurantName }}</strong>
        <span>{{ review.flagReason ?? 'Flagged for moderation' }}</span>
        <p>{{ review.comment }}</p>
      </div>
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

  pickupPoint(order: Order) {
    return (
      order.pickupLocation ??
      this.locations.restaurantLocation(order.restaurantId ?? order.restaurantName)
    );
  }

  dropPoint(order: Order) {
    return (
      order.deliveryLocation ??
      this.locations.addressLocation(order.deliveryAddressLine ?? order.customerName ?? order.id)
    );
  }

  flag(reviewId: string): void {
    this.reviewService.flagReview(reviewId, 'Needs moderation');
  }

  remove(reviewId: string): void {
    this.reviewService.deleteReview(reviewId);
  }

  block(identifier?: string): void {
    if (identifier) {
      this.reviewService.blockUser(identifier);
    }
  }

  restaurantRatingRows(): Array<{ name: string; rating: number }> {
    return this.admin.dashboard().restaurants.map((restaurant) => ({
      name: restaurant.name,
      rating: this.reviewService.averageRestaurantRating(restaurant.name),
    }));
  }

  deliveryRatingRows(): Array<{ name: string; rating: number }> {
    return this.admin.dashboard().deliveryAgents.map((agent) => ({
      name: agent.name,
      rating: this.reviewService.averageDeliveryRating(agent.name),
    }));
  }
}
