import { NgClass, NgFor, NgIf, SlicePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { LiveRouteMapComponent } from '../../components/live-route-map.component';
import { Order } from '../../core/app.models';
import { LocationService } from '../../services/location.service';
import { OrderService } from '../../services/order.service';
import { ReviewService } from '../../services/review.service';
import { SessionService } from '../../services/session.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-orders-page',
  imports: [NgClass, NgFor, NgIf, RouterLink, LiveRouteMapComponent, SlicePipe],
  template: `
    <section class="orders-hero card">
      <div class="orders-hero__copy">
        <p class="orders-eyebrow">QuickBite Orders</p>
        <h1>Track every delivery with live restaurant updates.</h1>
        <p class="orders-hero__text">
          Follow your active order in real time, review past food deliveries, and share your experience.
        </p>
      </div>

      <div class="orders-metrics">
        <article class="metric-card metric-card--brand">
          <span>Active</span>
          <strong>{{ activeCount() }}</strong>
          <small>Live deliveries in progress</small>
        </article>
        <article class="metric-card">
          <span>Delivered</span>
          <strong>{{ deliveredCount() }}</strong>
          <small>Completed orders</small>
        </article>
        <article class="metric-card">
          <span>Total spent</span>
          <strong>₹{{ totalSpent() }}</strong>
          <small>Across your orders</small>
        </article>
        <article class="metric-card">
          <span>Reviews</span>
          <strong>{{ reviewCount() }}</strong>
          <small>Shared feedbacks</small>
        </article>
      </div>
    </section>

    <!-- Swiggy / Zomato Tabs: Active Orders vs Past Orders -->
    <div class="order-tabs-bar">
      <button
        type="button"
        class="order-tab-btn"
        [class.active]="activeTab() === 'ACTIVE'"
        (click)="activeTab.set('ACTIVE')"
      >
        <span class="tab-dot" *ngIf="activeOrders().length > 0"></span>
        Active Orders ({{ activeOrders().length }})
      </button>
      <button
        type="button"
        class="order-tab-btn"
        [class.active]="activeTab() === 'PAST'"
        (click)="activeTab.set('PAST')"
      >
        Past Orders ({{ pastOrders().length }})
      </button>
    </div>

    <!-- TAB 1: ACTIVE ORDERS -->
    <div *ngIf="activeTab() === 'ACTIVE'" class="active-orders-section">
      <div *ngIf="activeOrders().length === 0" class="empty-orders-card card">
        <div class="empty-icon">🛵</div>
        <h3>No active orders right now</h3>
        <p>Your tummy deserves something good. Browse top restaurants and place an order!</p>
        <a routerLink="/home" class="btn-explore">Explore Restaurants &rarr;</a>
      </div>

      <article *ngFor="let order of activeOrders(); trackBy: trackOrder" class="active-order-card card">
        <div class="order-header">
          <div class="restaurant-meta">
            <div class="rest-avatar">🍽️</div>
            <div>
              <h2>{{ order.restaurantName }}</h2>
              <span class="order-id-chip">Order #{{ order.id }} • {{ order.createdAt ? (order.createdAt | slice:0:16) : 'Just now' }}</span>
            </div>
          </div>
          <div class="status-badge" [ngClass]="order.status.toLowerCase()">
            <span class="pulse-indicator"></span>
            {{ statusLabel(order.status) }}
          </div>
        </div>

        <!-- Modern Swiggy-Style Horizontal Stepper -->
        <div class="stepper-wrapper">
          <div class="step-progress-track">
            <div class="step-progress-fill" [style.width]="getStepPercent(order.status)"></div>
          </div>
          <div class="step-points">
            <div class="step-point" [class.completed]="getStepIndex(order.status) >= 1" [class.current]="getStepIndex(order.status) === 1">
              <div class="step-circle">
                <span *ngIf="getStepIndex(order.status) > 1">✓</span>
                <span *ngIf="getStepIndex(order.status) <= 1">📝</span>
              </div>
              <span class="step-label">Confirmed</span>
              <small class="step-hint">Order Placed</small>
            </div>

            <div class="step-point" [class.completed]="getStepIndex(order.status) >= 2" [class.current]="getStepIndex(order.status) === 2">
              <div class="step-circle">
                <span *ngIf="getStepIndex(order.status) > 2">✓</span>
                <span *ngIf="getStepIndex(order.status) <= 2">👨‍🍳</span>
              </div>
              <span class="step-label">Preparing</span>
              <small class="step-hint">In Kitchen</small>
            </div>

            <div class="step-point" [class.completed]="getStepIndex(order.status) >= 3" [class.current]="getStepIndex(order.status) === 3">
              <div class="step-circle">
                <span *ngIf="getStepIndex(order.status) > 3">✓</span>
                <span *ngIf="getStepIndex(order.status) <= 3">🛵</span>
              </div>
              <span class="step-label">Out for Delivery</span>
              <small class="step-hint">On the Way</small>
            </div>

            <div class="step-point" [class.completed]="getStepIndex(order.status) >= 4" [class.current]="getStepIndex(order.status) === 4">
              <div class="step-circle">
                <span>🎉</span>
              </div>
              <span class="step-label">Delivered</span>
              <small class="step-hint">Enjoy food</small>
            </div>
          </div>
        </div>

        <!-- Order Snapshot Details -->
        <div class="order-info-grid">
          <div class="info-block">
            <span class="info-label">📍 Delivery Address</span>
            <strong>{{ order.deliveryAddressLine || 'Home • Flat 402, Green Avenue, Bengaluru' }}</strong>
            <p>Our rider will arrive directly at this address.</p>
          </div>

          <div class="info-block">
            <span class="info-label">🍲 Items Ordered</span>
            <strong>{{ order.items }}</strong>
            <div class="payment-row">
              <span>Payment Mode: <strong>{{ order.paymentMethod === 'COD' ? '💵 Cash on Delivery' : '💳 Paid Online' }}</strong></span>
              <span class="total-pill">Total: ₹{{ order.total }}</span>
            </div>
          </div>
        </div>

        <!-- Live Route Map -->
        <div class="map-container">
          <app-live-route-map
            [title]="'Live Route • ' + order.restaurantName"
            [subtitle]="order.restaurantName + ' to ' + (order.deliveryAddressLine || 'your address')"
            [status]="statusLabel(order.status)"
            [pickup]="pickupPoint(order)"
            [drop]="dropPoint(order)"
            [routeStart]="pickupPoint(order)"
            [routeEnd]="dropPoint(order)"
          />
        </div>

        <!-- Actions (Cancel if placed) -->
        <div class="order-actions-bar" *ngIf="order.status === 'PLACED'">
          <button
            *ngIf="confirmingCancelId() !== order.id; else confirmActiveCancel"
            type="button"
            class="btn-cancel"
            (click)="confirmCancel(order.id)"
          >
            Cancel Order
          </button>
          <ng-template #confirmActiveCancel>
            <div class="confirm-cancel-group">
              <span>Cancel this order?</span>
              <button type="button" class="btn-confirm-danger" (click)="executeCancel(order.id)">
                Yes, Cancel Order
              </button>
              <button type="button" class="btn-keep" (click)="confirmingCancelId.set('')">
                Keep Order
              </button>
            </div>
          </ng-template>
        </div>
      </article>
    </div>

    <!-- TAB 2: PAST ORDERS -->
    <div *ngIf="activeTab() === 'PAST'" class="past-orders-section">
      <div *ngIf="pastOrders().length === 0" class="empty-orders-card card">
        <div class="empty-icon">📦</div>
        <h3>No past orders yet</h3>
        <p>Once you place and receive deliveries, your complete history will show here.</p>
      </div>

      <article *ngFor="let order of pastOrders(); trackBy: trackOrder" class="past-order-card card">
        <div class="past-order-top">
          <div class="rest-title-area">
            <div class="rest-avatar">🍽️</div>
            <div>
              <h3>{{ order.restaurantName }}</h3>
              <p class="order-items-text">{{ order.items }}</p>
              <small class="order-date">#{{ order.id }} • {{ order.createdAt ? (order.createdAt | slice:0:16) : 'Completed' }}</small>
            </div>
          </div>
          <div class="past-order-meta">
            <strong class="order-price">₹{{ order.total }}</strong>
            <span class="status-badge" [ngClass]="order.status.toLowerCase()">
              {{ statusLabel(order.status) }}
            </span>
          </div>
        </div>

        <div class="past-order-footer">
          <small class="address-text">📍 {{ order.deliveryAddressLine || 'Delivered to your address' }}</small>
          <div class="past-actions">
            <button
              type="button"
              class="btn-reorder"
              (click)="reorder(order)"
            >
              ↻ Reorder from {{ order.restaurantName }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <!-- Reviews Section for Delivered Orders -->
    <section class="reviews-layout" *ngIf="deliveredOrders().length > 0">
      <article class="card review-card review-card--compose">
        <div class="review-card__head">
          <div>
            <p class="orders-eyebrow">Feedback</p>
            <h2>Rate your delivered orders</h2>
            <p>One review per order, editable for 30 minutes.</p>
          </div>
          <span class="badge">Verified</span>
        </div>

        <div class="review-list">
          <article *ngFor="let order of deliveredOrders()" class="review-item">
            <div class="review-item__header">
              <div>
                <strong>{{ order.restaurantName }}</strong>
                <p>{{ order.items }}</p>
              </div>
              <span class="review-item__chip">Delivered</span>
            </div>

            <div class="review-rating-grid">
              <label>
                Restaurant rating
                <div class="review-stars">
                  <button
                    type="button"
                    *ngFor="let star of stars"
                    (click)="setDraft(order.id, 'restaurantRating', star)"
                    [class.active]="draftValue(order.id, 'restaurantRating') >= star"
                  >
                    ★
                  </button>
                </div>
              </label>

              <label>
                Delivery rating
                <div class="review-stars">
                  <button
                    type="button"
                    *ngFor="let star of stars"
                    (click)="setDraft(order.id, 'deliveryRating', star)"
                    [class.active]="draftValue(order.id, 'deliveryRating') >= star"
                  >
                    ★
                  </button>
                </div>
              </label>

              <label>
                Overall rating
                <div class="review-stars">
                  <button
                    type="button"
                    *ngFor="let star of stars"
                    (click)="setDraft(order.id, 'overallRating', star)"
                    [class.active]="draftValue(order.id, 'overallRating') >= star"
                  >
                    ★
                  </button>
                </div>
              </label>
            </div>

            <textarea
              rows="3"
              [value]="draftText(order.id)"
              (input)="setDraftText(order.id, $any($event.target).value)"
              placeholder="Tell us what stood out about the taste, packaging, hygiene, and delivery..."
            ></textarea>

            <div class="review-actions">
              <button type="button" class="primary-link" (click)="submitReview(order)">
                Save Review
              </button>
              <button
                type="button"
                class="ghost small"
                (click)="resetDraft(order.id)"
                *ngIf="existingReview(order.id)"
              >
                Reset
              </button>
              <button
                type="button"
                class="ghost small danger"
                (click)="deleteReview(order.id)"
                *ngIf="existingReview(order.id) && canEdit(order.id)"
              >
                Delete
              </button>
            </div>
          </article>
        </div>
      </article>

      <article class="card review-feed" *ngIf="reviews.customerReviews().length > 0">
        <div class="review-feed__head">
          <div>
            <p class="orders-eyebrow">Your reviews</p>
            <h3>What you’ve shared</h3>
          </div>
          <p>{{ reviews.customerReviews().length }} review(s)</p>
        </div>

        <article *ngFor="let review of reviews.customerReviews()" class="review-feed__item">
          <div class="review-feed__top">
            <strong>{{ review.restaurantName }}</strong>
            <span>{{ review.overallRating || 0 }}/5 overall</span>
          </div>
          <p class="review-feed__meta">
            {{ review.customerName }} · Food {{ review.restaurantRating || 0 }}/5 · Delivery
            {{ review.deliveryAgentRating || 0 }}/5
          </p>
          <p>{{ review.comment }}</p>
        </article>
      </article>
    </section>
  `,
  styleUrl: './orders-page.component.scss',
})
export class OrdersPageComponent implements OnInit {
  protected readonly orderService = inject(OrderService);
  private readonly locations = inject(LocationService);
  protected readonly reviews = inject(ReviewService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly cart = inject(CartService);

  public readonly activeTab = signal<'ACTIVE' | 'PAST'>('ACTIVE');

  private readonly customerEmail = computed(
    () => this.session.user()?.email?.toLowerCase()?.trim() ?? 'customer@quickbite.com',
  );

  protected readonly customerOrders = computed(() => {
    const email = this.customerEmail();
    const user = this.session.user();
    const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').toLowerCase().trim();

    return this.orderService
      .orders()
      .filter((order) => {
        const orderEmail = order.customerEmail?.toLowerCase()?.trim();
        const orderName = order.customerName?.toLowerCase()?.trim();
        if (!orderEmail) return true;
        if (orderEmail === email) return true;
        if (userName && orderName && (userName.includes(orderName) || orderName.includes(userName))) return true;
        if (email === 'customer@quickbite.com') return true;
        return false;
      });
  });

  ngOnInit(): void {
    this.orderService.refreshFromBackend();
  }

  protected readonly activeOrders = computed(() =>
    this.customerOrders().filter(
      (order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED',
    ),
  );

  protected readonly pastOrders = computed(() =>
    this.customerOrders().filter(
      (order) => order.status === 'DELIVERED' || order.status === 'CANCELLED',
    ),
  );

  protected readonly activeCount = computed(() => this.activeOrders().length);
  protected readonly deliveredCount = computed(
    () => this.customerOrders().filter((order) => order.status === 'DELIVERED').length,
  );
  protected readonly reviewCount = computed(() => this.reviews.customerReviews().length);
  protected readonly totalSpent = computed(() =>
    this.customerOrders().reduce((sum, order) => sum + (order.total ?? 0), 0),
  );

  protected readonly confirmingCancelId = signal<string>('');
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly ratingDraft = signal<
    Record<string, { restaurantRating: number; deliveryRating: number; overallRating: number }>
  >({});
  protected readonly textDraft = signal<Record<string, string>>({});
  protected readonly imagesDraft = signal<Record<string, string[]>>({});

  trackOrder(_index: number, order: Order): string {
    return order.id;
  }

  getStepIndex(status: Order['status']): number {
    if (status === 'DELIVERED') return 4;
    if (status === 'ON_THE_WAY') return 3;
    if (status === 'PREPARING' || status === 'READY') return 2;
    if (status === 'PLACED' || status === 'CONFIRMED') return 1;
    return 0; // CANCELLED
  }

  getStepPercent(status: Order['status']): string {
    const idx = this.getStepIndex(status);
    if (idx <= 1) return '0%';
    if (idx === 2) return '33.3%';
    if (idx === 3) return '66.6%';
    return '100%';
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

  deliveredOrders(): Order[] {
    return this.customerOrders().filter((order) => order.status === 'DELIVERED');
  }

  statusLabel(status: Order['status']): string {
    if (status === 'PLACED') return 'Order Placed';
    if (status === 'CONFIRMED') return 'Order Confirmed';
    if (status === 'PREPARING') return 'Kitchen Preparing';
    if (status === 'READY') return 'Ready for Pickup';
    if (status === 'ON_THE_WAY') return 'Out for Delivery';
    if (status === 'DELIVERED') return 'Delivered';
    if (status === 'CANCELLED') return 'Cancelled';
    return String(status).replaceAll('_', ' ');
  }

  setDraft(
    orderId: string,
    field: 'restaurantRating' | 'deliveryRating' | 'overallRating',
    rating: number,
  ): void {
    this.ratingDraft.update((state) => ({
      ...state,
      [orderId]: {
        restaurantRating: state[orderId]?.restaurantRating ?? 0,
        deliveryRating: state[orderId]?.deliveryRating ?? 0,
        overallRating: state[orderId]?.overallRating ?? 0,
        [field]: rating,
      },
    }));
  }

  draftValue(
    orderId: string,
    field: 'restaurantRating' | 'deliveryRating' | 'overallRating',
  ): number {
    const existing = this.reviews.findCustomerReview(orderId);
    if (this.ratingDraft()[orderId]?.[field]) {
      return this.ratingDraft()[orderId]?.[field] ?? 0;
    }
    if (!existing) return 0;
    if (field === 'restaurantRating') return existing.restaurantRating ?? 0;
    if (field === 'deliveryRating') return existing.deliveryAgentRating ?? 0;
    return existing.overallRating ?? 0;
  }

  setDraftText(orderId: string, value: string): void {
    this.textDraft.update((state) => ({ ...state, [orderId]: value }));
  }

  draftText(orderId: string): string {
    const existing = this.reviews.findCustomerReview(orderId);
    return this.textDraft()[orderId] ?? existing?.comment ?? '';
  }

  submitReview(order: Order): void {
    const existing = this.reviews.findCustomerReview(order.id);
    const draft = this.ratingDraft()[order.id];
    const comment = this.draftText(order.id).trim();

    if (!draft && !existing) return;

    this.reviews.submitCustomerReview({
      orderId: order.id,
      customerEmail: this.customerEmail(),
      customerName: this.session.user()?.firstName ?? 'Customer',
      restaurantId: order.restaurantId,
      restaurantName: order.restaurantName,
      restaurantRating: draft?.restaurantRating ?? existing?.restaurantRating ?? 5,
      deliveryAgentRating: draft?.deliveryRating ?? existing?.deliveryAgentRating ?? 5,
      overallRating: draft?.overallRating ?? existing?.overallRating ?? 5,
      comment,
      images: [],
    });
  }

  existingReview(orderId: string) {
    return this.reviews.findCustomerReview(orderId);
  }

  canEdit(orderId: string): boolean {
    const review = this.reviews.findCustomerReview(orderId);
    return review ? this.reviews.canEdit(review) : false;
  }

  resetDraft(orderId: string): void {
    const review = this.reviews.findCustomerReview(orderId);
    this.ratingDraft.update((state) => ({
      ...state,
      [orderId]: {
        restaurantRating: review?.restaurantRating ?? 0,
        deliveryRating: review?.deliveryAgentRating ?? 0,
        overallRating: review?.overallRating ?? 0,
      },
    }));
    this.textDraft.update((state) => ({ ...state, [orderId]: review?.comment ?? '' }));
  }

  deleteReview(orderId: string): void {
    const review = this.reviews.findCustomerReview(orderId);
    if (review && this.reviews.canEdit(review)) {
      this.reviews.deleteReview(review.id);
    }
  }

  confirmCancel(orderId: string): void {
    this.confirmingCancelId.set(orderId);
    setTimeout(() => {
      if (this.confirmingCancelId() === orderId) {
        this.confirmingCancelId.set('');
      }
    }, 5000);
  }

  executeCancel(orderId: string): void {
    const order = this.orderService.orders().find((item) => item.id === orderId);
    if (order && order.status === 'PLACED') {
      this.orderService.deleteOrder(orderId);
    }
    this.confirmingCancelId.set('');
  }

  reorder(order: Order): void {
    if (order.restaurantId) {
      this.router.navigate(['/restaurants', order.restaurantId]);
    } else {
      this.router.navigate(['/home']);
    }
  }
}
