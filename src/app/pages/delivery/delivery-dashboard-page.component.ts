import { Component, inject } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';

import { LiveRouteMapComponent } from '../../components/live-route-map.component';
import { DeliveryDashboardService } from '../../services/delivery-dashboard.service';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-delivery-dashboard-page',
  imports: [NgFor, NgClass, NgIf, LiveRouteMapComponent],
  template: `
    <section class="page-head">
      <div>
        <h1>My Deliveries &#128690;</h1>
        <p>Active and upcoming deliveries for your signed-in account.</p>
      </div>
      <div class="toolbar">
        <span class="online-label">{{ dashboard.isOnline() ? 'Available' : 'Unavailable' }}</span>
        <button
          class="toggle"
          type="button"
          [class.off]="!dashboard.isOnline()"
          (click)="toggleOnline()"
        ></button>
        <span class="online-label">{{
          dashboard.currentLocation() ? 'GPS live' : 'Waiting for GPS'
        }}</span>
      </div>
    </section>

    <section class="card delivery-context">
      <div>
        <h2>{{ session.user()?.firstName || 'Delivery partner' }}</h2>
        <p>{{ session.user()?.email }}</p>
      </div>
      <p class="delivery-context__note">
        Turn availability on when you are ready. The restaurant owner assigns orders from the
        available agent list.
      </p>
    </section>

    <section class="stats-row">
      <div class="card stat-card">
        <div class="stat-card__icon">&#128230;</div>
        <div class="stat-card__meta">
          <strong>{{ dashboard.activeDeliveries().length }}</strong
          ><span>Active Order</span>
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-card__icon green">&#9989;</div>
        <div class="stat-card__meta">
          <strong>{{ dashboard.history().length }}</strong
          ><span>Today's Deliveries</span>
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-card__icon gold">&#128176;</div>
        <div class="stat-card__meta">
          <strong>{{ dashboard.earnings().today }}</strong
          ><span>Today's Earnings</span>
        </div>
      </div>
    </section>

    <article *ngFor="let delivery of dashboard.activeDeliveries()" class="card delivery-card">
      <div class="delivery-card__header">
        <div>
          <h2>{{ delivery.id }}</h2>
          <p>{{ delivery.restaurantShort }}</p>
          <p>{{ delivery.payment }}: {{ rupeeSymbol }}{{ delivery.amount }}</p>
        </div>
        <span
          class="status-pill"
          [ngClass]="
            delivery.status === 'DELIVERED'
              ? 'success'
              : delivery.status === 'ON_THE_WAY'
                ? 'warning'
                : delivery.status === 'READY'
                  ? 'ready'
                  : 'pending'
          "
        >
          {{ prettyStatus(delivery.status) }}
        </span>
      </div>
      <p class="delivery-card__hint">{{ deliveryHint(delivery.status) }}</p>

      <app-live-route-map
        [title]="delivery.routeLabel"
        [subtitle]="delivery.eta + ' - ' + delivery.restaurantShort"
        [status]="dashboard.isOnline() ? 'Agent online' : 'Agent offline'"
        [pickup]="delivery.pickupLocation"
        [drop]="delivery.dropLocation"
        [agent]="delivery.agentLocation"
        [routeStart]="delivery.routeStart"
        [routeEnd]="delivery.routeEnd"
      />

      <div class="delivery-grid">
        <div class="spot">
          <span>&#128100; Customer</span>
          <h3>{{ delivery.customerName }}</h3>
          <p>{{ delivery.customerPhone }}</p>
        </div>
        <div class="spot">
          <span>&#127968; Address</span>
          <h3>{{ delivery.dropAddress }}</h3>
          <p>{{ delivery.customerAddress }}</p>
        </div>
      </div>

      <div class="delivery-grid">
        <div class="spot">
          <span>&#128205; Pickup</span>
          <h3>{{ delivery.restaurantName }}</h3>
        </div>
        <div class="spot">
          <span>&#128278; Delivery note</span>
          <h3>{{ delivery.routeLabel }}</h3>
          <p>{{ delivery.restaurantShort }}</p>
        </div>
      </div>

      <div class="delivery-actions">
        <button
          *ngIf="delivery.status === 'READY'"
          type="button"
          class="primary-action"
          (click)="pickup(delivery.id)"
        >
          Mark Picked Up
        </button>
        <button
          *ngIf="delivery.status === 'ON_THE_WAY'"
          type="button"
          class="primary-action"
          (click)="deliver(delivery.id)"
        >
          Mark Delivered
        </button>
        <button type="button" class="ghost-action">Call Customer</button>
        <button type="button" class="ghost-action">Call Restaurant</button>
      </div>
    </article>
  `,
  styleUrl: './delivery-pages.scss',
})
export class DeliveryDashboardPageComponent {
  protected readonly dashboard = inject(DeliveryDashboardService);
  protected readonly session = inject(SessionService);
  protected readonly rupeeSymbol = '\u20B9';

  prettyStatus(status: string): string {
    if (status === 'PLACED') {
      return 'New request';
    }
    if (status === 'READY') {
      return 'Ready for pickup';
    }
    if (status === 'PREPARING') {
      return 'Preparing at restaurant';
    }
    if (status === 'CONFIRMED') {
      return 'Accepted by restaurant';
    }
    if (status === 'ON_THE_WAY') {
      return 'Picked up';
    }
    return status.replaceAll('_', ' ');
  }

  deliveryHint(status: string): string {
    if (status === 'PLACED') {
      return 'The restaurant has not accepted this order yet. Keep it open and wait for the kitchen to confirm.';
    }
    if (status === 'READY') {
      return 'Head to the restaurant, collect the order, then tap Mark Picked Up when you leave.';
    }
    if (status === 'CONFIRMED' || status === 'PREPARING') {
      return 'The restaurant is still preparing. Keep this request open so you do not miss the pickup.';
    }
    if (status === 'ON_THE_WAY') {
      return 'You already picked it up. Follow the route to the customer and mark it delivered when complete.';
    }
    return 'This order is active in your account.';
  }

  deliver(orderId: string): void {
    this.dashboard.markDelivered(orderId);
  }

  pickup(orderId: string): void {
    this.dashboard.markPickedUp(orderId);
  }

  toggleOnline(): void {
    this.dashboard.toggleOnline();
  }
}
