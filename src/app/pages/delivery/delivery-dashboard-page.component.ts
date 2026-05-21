import { Component, inject } from '@angular/core';
import { NgClass, NgFor } from '@angular/common';

import { LiveRouteMapComponent } from '../../components/live-route-map.component';
import { DeliveryDashboardService } from '../../services/delivery-dashboard.service';
import { SessionService } from '../../services/session.service';

interface DashboardMetric {
  label: string;
  value: string;
  delta: string;
  tone: 'orange' | 'green' | 'blue' | 'amber' | 'red';
  icon: string;
  spark: number[];
}

interface QuickOrder {
  restaurant: string;
  customer: string;
  pickup: string;
  drop: string;
  distance: string;
  eta: string;
  value: string;
  status: 'Pending' | 'Picked Up' | 'Delivered' | 'Delayed';
}

@Component({
  selector: 'app-delivery-dashboard-page',
  imports: [NgFor, NgClass, LiveRouteMapComponent],
  template: `
    <section class="delivery-console">
      <div class="console-main">
        <header class="console-header card">
          <div>
            <span class="section-kicker">Live shift</span>
            <h1>Good Evening, {{ session.user()?.firstName || 'Maxwell' }}</h1>
            <p>Stay sharp. 2 more deliveries unlock Rs 250 bonus in your zone.</p>
            <div class="hero-badges">
              <span>Peak demand nearby</span>
              <span>Next goal: 2 deliveries</span>
              <span>Updated 18 sec ago</span>
            </div>
          </div>
          <div class="shift-summary">
            <span>Shift timer</span>
            <strong>04:28:16</strong>
            <small>Live since 5:02 PM</small>
          </div>
        </header>

        <section class="stats-row ops-stats">
          <article class="card stat-card metric-card" *ngFor="let metric of keyMetrics" [ngClass]="metric.tone">
            <div class="stat-card__icon">{{ metric.icon }}</div>
            <div class="stat-card__meta">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
              <small>{{ metric.delta }}</small>
            </div>
          </article>
        </section>

        <section class="ops-grid">
          @if (dashboard.activeDeliveries().length > 0) {
            <article class="card live-ops-panel">
              <div class="section-head">
                <div>
                  <span class="section-kicker">Current order</span>
                  <h2>{{ displayDelivery().restaurantName }} to {{ displayDelivery().customerName }}</h2>
                </div>
                <span class="status-pill ready">ETA {{ displayDelivery().eta }}</span>
              </div>
              <div class="order-brief">
                <div>
                  <span>Pickup</span>
                  <strong>{{ displayDelivery().restaurantName }}</strong>
                  <p>{{ displayDelivery().restaurantShort }}</p>
                </div>
                <div>
                  <span>Drop</span>
                  <strong>{{ displayDelivery().customerName }}</strong>
                  <p>{{ displayDelivery().dropAddress }}</p>
                </div>
                <div class="countdown">
                  <span>Pickup SLA</span>
                  <strong>00:17:42</strong>
                  <p>Ready to collect</p>
                </div>
              </div>
              <div class="order-intel">
                <span>Earn Rs {{ displayDelivery().amount }}</span>
                <span>3.2 km left</span>
                <span class="warning">Kitchen delay +4m</span>
              </div>
              <div class="progress-timeline">
                <div class="timeline-step done" *ngFor="let step of completedSteps">
                  <span></span>
                  <p>{{ step }}</p>
                </div>
                <div class="timeline-step active">
                  <span></span>
                  <p>Out for Delivery</p>
                </div>
                <div class="timeline-step">
                  <span></span>
                  <p>Delivered</p>
                </div>
              </div>
              <div class="delivery-actions compact-actions">
                @if (displayDelivery().status !== 'ON_THE_WAY') {
                  <button
                    class="primary-action swipe-action"
                    type="button"
                    [disabled]="displayDelivery().status !== 'READY'"
                    (click)="pickup(displayDelivery().id)"
                  >
                    <span>Swipe</span> Mark Picked Up
                  </button>
                } @else {
                  <button
                    class="primary-action swipe-action success"
                    type="button"
                    (click)="deliver(displayDelivery().id)"
                    style="background: #28a745;"
                  >
                    <span>Swipe</span> Mark Delivered
                  </button>
                }
                <button class="ghost-action nav-action" type="button">Navigate</button>
                <button class="ghost-action" type="button">Call</button>
                <button class="ghost-action" type="button">Restaurant</button>
                <button class="ghost-action danger" type="button">Issue</button>
              </div>
            </article>
          } @else {
            <article class="card live-ops-panel waiting-panel" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 3rem 2rem; min-height: 380px;">
              <div style="font-size: 4rem; margin-bottom: 1.5rem; animation: pulse 2s infinite;">🛵</div>
              <h2 style="font-size: 1.6rem; font-weight: 700; margin-bottom: 0.5rem; font-family: 'Space Grotesk', sans-serif;">Waiting for Assignments</h2>
              <p style="color: var(--muted); font-size: 0.95rem; max-width: 320px; margin-bottom: 1.5rem;">
                {{ dashboard.isOnline() ? 'You are online and active. Keep this dashboard open to receive real-time delivery requests from nearby restaurants.' : 'You are currently offline. Toggle your status to Online to start receiving delivery requests.' }}
              </p>
              <button class="primary-action" type="button" (click)="toggleOnline()" [style.background]="dashboard.isOnline() ? '#dc3545' : '#ff5a00'">
                {{ dashboard.isOnline() ? 'Go Offline' : 'Go Online' }}
              </button>
            </article>
          }

          <app-live-route-map
            class="map-shell"
            [title]="'Live Route'"
            [subtitle]="'Agent - pickup - customer'"
            [status]="dashboard.isOnline() ? 'Online' : 'Offline'"
            [pickup]="displayDelivery().pickupLocation"
            [drop]="displayDelivery().dropLocation"
            [agent]="displayDelivery().agentLocation"
            [routeStart]="displayDelivery().routeStart"
            [routeEnd]="displayDelivery().routeEnd"
          />
        </section>
      </div>

      <aside class="console-side">
        <article class="card queue-panel">
          <div class="section-head">
            <div>
              <span class="section-kicker">Queue</span>
              <h2>Orders</h2>
            </div>
            <button class="ghost-action tight" type="button">Optimize</button>
          </div>
          <div class="queue-list">
            @if (activeOrders().length > 0) {
              <div class="queue-item" *ngFor="let order of activeOrders()">
                <span class="queue-logo">{{ order.restaurant.charAt(0) }}</span>
                <div>
                  <div class="queue-title">
                    <strong>{{ order.restaurant }}</strong>
                    <small>{{ priorityFor(order.status) }}</small>
                  </div>
                  <p>{{ order.customer }} - {{ order.distance }} - {{ order.eta }} - {{ order.value }}</p>
                </div>
                <div class="queue-actions">
                  <span class="status-pill" [ngClass]="orderStatusTone(order.status)">{{ order.status }}</span>
                  <button type="button">Accept</button>
                  <button type="button" class="reject">Reject</button>
                </div>
              </div>
            } @else {
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1rem; color: var(--muted); text-align: center; min-height: 180px;">
                <span style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.7;">📥</span>
                <strong style="display: block; font-size: 0.95rem; margin-bottom: 0.25rem;">No active deliveries</strong>
                <p style="font-size: 0.84rem; max-width: 200px; margin: 0 auto; line-height: 1.4;">Active route requests will appear in your queue here.</p>
              </div>
            }
          </div>
        </article>

        <article class="card earnings-panel">
          <div class="section-head">
            <div>
              <span class="section-kicker">Earnings</span>
              <h2>{{ dashboard.earnings().today }}</h2>
            </div>
            <span class="status-pill success">67%</span>
          </div>
          <div class="earning-bars">
            <div class="earning-ring">
              <span>Target</span>
              <strong>67%</strong>
              <small>Rs 420 bonus in 42m</small>
            </div>
            <div class="weekly-bars" aria-label="Weekly earnings trend">
              <i *ngFor="let bar of weeklyBars" [style.height.%]="bar"></i>
            </div>
            <div *ngFor="let item of earningBreakdown">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <i><b [style.width.%]="item.progress"></b></i>
            </div>
          </div>
        </article>

        <article class="card notifications-panel">
          <div class="section-head">
            <div>
              <span class="section-kicker">Alerts</span>
              <h2>Latest</h2>
            </div>
          </div>
          <div class="notification-feed">
            <div *ngFor="let note of notifications" [ngClass]="note.tone">
              <span><i>{{ note.icon }}</i>{{ note.time }} - {{ note.category }}</span>
              <strong><b></b>{{ note.title }}</strong>
              <p>{{ note.body }}</p>
            </div>
          </div>
        </article>
      </aside>
    </section>

    @if (dashboard.activeDeliveries().length > 0) {
      <nav class="driver-dock" aria-label="Delivery quick actions">
        <button type="button">Navigate</button>
        <button type="button">Call</button>
        <button type="button">Message</button>
        <button type="button" class="sos">SOS</button>
        <button
          type="button"
          class="done"
          [disabled]="displayDelivery().status !== 'ON_THE_WAY'"
          (click)="deliver(displayDelivery().id)"
        >
          Delivered
        </button>
      </nav>
    }
  `,
  styleUrl: './delivery-pages.scss',
})
export class DeliveryDashboardPageComponent {
  protected readonly dashboard = inject(DeliveryDashboardService);
  protected readonly session = inject(SessionService);
  protected readonly rupeeSymbol = '\u20B9';
  protected readonly completedSteps = ['Order Assigned', 'Reached Restaurant', 'Picked Up'];
  protected readonly keyMetrics: DashboardMetric[] = [
    { label: 'Active', value: '3', delta: '+1 request', tone: 'orange', icon: 'A', spark: [] },
    { label: 'Completed', value: '12', delta: '92% on time', tone: 'green', icon: 'C', spark: [] },
    { label: 'Earnings', value: 'Rs 1.8K', delta: '+18%', tone: 'amber', icon: 'Rs', spark: [] },
    { label: 'Rating', value: '4.86', delta: 'Top zone', tone: 'blue', icon: '*', spark: [] },
  ];
  protected readonly metrics: DashboardMetric[] = [
    { label: 'Active Deliveries', value: '3', delta: '+1 new request', tone: 'orange', icon: 'A', spark: [30, 55, 42, 70, 88] },
    { label: 'Completed Today', value: '12', delta: '92% on time', tone: 'green', icon: 'C', spark: [42, 46, 60, 76, 90] },
    { label: 'Earnings Today', value: 'Rs 1.8K', delta: '+18% vs yesterday', tone: 'amber', icon: 'Rs', spark: [34, 64, 50, 82, 72] },
    { label: 'Weekly Earnings', value: 'Rs 9.6K', delta: 'Rs 420 bonus nearby', tone: 'blue', icon: 'W', spark: [52, 48, 74, 66, 92] },
    { label: 'Customer Rating', value: '4.86', delta: 'Top zone quality', tone: 'green', icon: '*', spark: [76, 78, 82, 86, 92] },
    { label: 'Success Rate', value: '98%', delta: '0 failed today', tone: 'green', icon: '%', spark: [88, 90, 86, 92, 96] },
    { label: 'Online Hours', value: '4h 28m', delta: 'Shift target 7h', tone: 'blue', icon: 'H', spark: [20, 36, 50, 64, 72] },
    { label: 'Incentive Progress', value: '67%', delta: '4 deliveries left', tone: 'red', icon: 'B', spark: [22, 44, 58, 67, 67] },
  ];
  protected readonly earningBreakdown = [
    { label: 'Base pay', value: 'Rs 1,120', progress: 72 },
    { label: 'Peak bonus', value: 'Rs 360', progress: 58 },
    { label: 'Tips received', value: 'Rs 220', progress: 42 },
    { label: 'Owner priority drops', value: 'Rs 140', progress: 34 },
  ];
  protected readonly weeklyBars = [34, 58, 46, 74, 68, 88, 76];
  protected readonly notifications = [
    { time: 'Now', category: 'Order', icon: 'O', title: 'New delivery request', body: 'Burger Palace is ready for assignment review.', tone: 'blue' },
    { time: '2m', category: 'Customer', icon: 'C', title: 'Customer message', body: 'Call at society gate B before arrival.', tone: 'green' },
    { time: '5m', category: 'Traffic', icon: 'T', title: 'Route update', body: 'Ring Road delay. Faster route suggested.', tone: 'amber' },
    { time: '12m', category: 'Bonus', icon: 'B', title: 'Bonus unlocked', body: 'Weekly streak incentive active for next orders.', tone: 'green' },
  ];
  protected readonly fallbackOrders: QuickOrder[] = [
    {
      restaurant: 'Spice Kitchen',
      customer: 'Ananya Sharma',
      pickup: 'Connaught Place, Gate 3',
      drop: 'DLF Capital Greens, Tower B',
      distance: '4.8 km',
      eta: '18 min',
      value: 'Rs 640',
      status: 'Picked Up',
    },
    {
      restaurant: 'Burger Palace',
      customer: 'Rohan Mehta',
      pickup: 'Karol Bagh Main Market',
      drop: 'Patel Nagar Block 22',
      distance: '3.1 km',
      eta: '12 min',
      value: 'Rs 390',
      status: 'Pending',
    },
    {
      restaurant: 'Urban Cafe',
      customer: 'Neha Verma',
      pickup: 'Cyber Hub Food Court',
      drop: 'Sector 29 Metro',
      distance: '5.6 km',
      eta: '24 min',
      value: 'Rs 820',
      status: 'Delayed',
    },
  ];

  displayDelivery() {
    return (
      this.dashboard.activeDeliveries()[0] ?? {
        id: '',
        restaurantName: 'Spice Kitchen',
        restaurantShort: 'Connaught Place, Gate 3',
        customerName: 'Ananya Sharma',
        dropAddress: 'DLF Capital Greens, Tower B',
        pickupLocation: null,
        dropLocation: null,
        agentLocation: null,
        routeStart: null,
        routeEnd: null,
      }
    );
  }

  activeOrders(): QuickOrder[] {
    const live = this.dashboard.activeDeliveries();
    if (!live.length) {
      return [];
    }
    return live.map((delivery) => ({
      restaurant: delivery.restaurantName,
      customer: delivery.customerName,
      pickup: delivery.restaurantShort,
      drop: delivery.dropAddress,
      distance: 'Live GPS',
      eta: delivery.eta,
      value: `${this.rupeeSymbol}${delivery.amount}`,
      status:
        delivery.status === 'ON_THE_WAY'
          ? 'Picked Up'
          : delivery.status === 'DELIVERED'
            ? 'Delivered'
            : delivery.status === 'READY'
              ? 'Pending'
              : 'Delayed',
    }));
  }

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

  orderStatusTone(status: QuickOrder['status']): string {
    if (status === 'Delivered') return 'success';
    if (status === 'Picked Up') return 'ready';
    if (status === 'Delayed') return 'warning';
    return 'pending';
  }

  priorityFor(status: QuickOrder['status']): string {
    if (status === 'Delayed') return 'Priority';
    if (status === 'Pending') return 'Nearby';
    if (status === 'Picked Up') return 'Surge';
    return 'High demand';
  }
}
