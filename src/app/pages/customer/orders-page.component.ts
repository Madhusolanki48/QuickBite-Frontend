import { NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { LiveRouteMapComponent } from '../../components/live-route-map.component';
import { Order } from '../../core/app.models';
import { LocationService } from '../../services/location.service';
import { OrderService } from '../../services/order.service';
import { ReviewService } from '../../services/review.service';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-orders-page',
  imports: [NgFor, NgIf, LiveRouteMapComponent],
  template: `
    <section class="orders-hero card">
      <div class="orders-hero__copy">
        <p class="orders-eyebrow">My Orders</p>
        <h1>Track every delivery with a premium QuickBite feel.</h1>
        <p class="orders-hero__text">
          Follow live progress, revisit past orders, and leave thoughtful reviews after your food lands.
        </p>
      </div>

      <div class="orders-metrics">
        <article class="metric-card metric-card--brand">
          <span>Active</span>
          <strong>{{ activeCount() }}</strong>
          <small>Live deliveries right now</small>
        </article>
        <article class="metric-card">
          <span>Delivered</span>
          <strong>{{ deliveredCount() }}</strong>
          <small>Completed food moments</small>
        </article>
        <article class="metric-card">
          <span>Reviews</span>
          <strong>{{ reviewCount() }}</strong>
          <small>Saved customer reviews</small>
        </article>
        <article class="metric-card">
          <span>Total spent</span>
          <strong>Rs {{ totalSpent() }}</strong>
          <small>Across your order history</small>
        </article>
      </div>
    </section>

    <app-live-route-map
      *ngIf="activeOrder() as order"
      title="Live Delivery Route"
      [subtitle]="order.restaurantName + ' to ' + (order.deliveryAddressLine ?? 'your address')"
      [status]="statusLabel(order.status)"
      [pickup]="pickupPoint(order)"
      [drop]="dropPoint(order)"
      [routeStart]="pickupPoint(order)"
      [routeEnd]="dropPoint(order)"
    />

    <section class="orders-spotlight card" *ngIf="activeOrder() as active">
      <div class="orders-spotlight__head">
        <div>
          <p class="orders-eyebrow">Current order</p>
          <h2>{{ active.restaurantName }}</h2>
        </div>
        <span class="badge">{{ statusLabel(active.status) }}</span>
      </div>

      <div class="orders-spotlight__grid">
        <article class="spot-panel">
          <span class="spot-panel__label">Delivery address</span>
          <strong>{{ active.deliveryAddressLine || 'Preparing your route' }}</strong>
          <p>The kitchen and delivery team will keep you updated as the order progresses.</p>
        </article>

        <article class="spot-panel spot-panel--accent">
          <span class="spot-panel__label">Order snapshot</span>
          <strong>{{ active.items }}</strong>
          <div class="spot-pill-row">
            <span>{{ statusLabel(active.status) }}</span>
            <span>Rs {{ active.total }}</span>
          </div>
          <button
            *ngIf="active.status === 'PLACED'"
            type="button"
            class="ghost small danger"
            (click)="deleteOrder(active.id)"
          >
            Cancel order
          </button>
        </article>
      </div>
    </section>

    <section class="orders-stack">
      <div class="section-heading">
        <div>
          <p class="orders-eyebrow">Past orders</p>
          <h2>Recent deliveries</h2>
        </div>
        <p>Compact cards with richer hierarchy and stronger visual breathing room.</p>
      </div>

      <article class="card order-card order-card--premium" *ngFor="let order of customerOrders()">
        <div class="order-card__top">
          <div class="order-card__title">
            <span class="order-card__eyebrow">#{{ order.id }}</span>
            <h3>{{ order.restaurantName }}</h3>
            <p>{{ order.items }}</p>
          </div>

          <div class="order-card__meta">
            <strong>Rs {{ order.total }}</strong>
            <span class="badge">{{ statusLabel(order.status) }}</span>
          </div>
        </div>

        <div class="timeline">
          <span class="done">Placed</span>
          <span [class.done]="isAccepted(order.status)">Accepted</span>
          <span [class.done]="isPreparing(order.status)">Preparing</span>
          <span [class.done]="isReady(order.status)">Ready</span>
          <span [class.done]="isPicked(order.status)">Picked</span>
          <span [class.done]="order.status === 'DELIVERED'">Delivered</span>
        </div>

        <div class="order-card__footer">
          <small>{{ order.deliveryAddressLine || 'Delivery address unavailable' }}</small>
          <button
            *ngIf="order.status === 'PLACED'"
            type="button"
            class="ghost small danger"
            (click)="deleteOrder(order.id)"
          >
            Cancel
          </button>
        </div>
      </article>
    </section>

    <section class="reviews-layout">
      <article class="card review-card review-card--compose">
        <div class="review-card__head">
          <div>
            <p class="orders-eyebrow">Feedback</p>
            <h2>Rate your delivered orders</h2>
            <p>One review per order, editable for 30 minutes.</p>
          </div>
          <span class="badge">New</span>
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

            <label class="review-upload">
              Optional images
              <input
                type="file"
                multiple
                accept="image/*"
                (change)="handleImages(order.id, $any($event.target).files)"
              />
            </label>

            <div class="review-preview" *ngIf="draftImages(order.id).length">
              <img *ngFor="let image of draftImages(order.id)" [src]="image" alt="Review image" />
            </div>

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

            <p class="save-note" *ngIf="existingReview(order.id)">
              Saved review can be edited for 30 minutes.
            </p>
          </article>
        </div>
      </article>

      <article class="card review-feed">
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
          <div class="review-preview" *ngIf="review.images.length">
            <img *ngFor="let image of review.images" [src]="image" alt="Review image" />
          </div>
          <div *ngIf="review.responses.length" class="review-responses">
            <div *ngFor="let response of review.responses" class="review-response">
              <strong>{{ response.byRole }}</strong>
              <p>{{ response.text }}</p>
            </div>
          </div>
        </article>
      </article>
    </section>
  `,
  styleUrl: './orders-page.component.scss',
})
export class OrdersPageComponent {
  protected readonly orderService = inject(OrderService);
  private readonly locations = inject(LocationService);
  protected readonly reviews = inject(ReviewService);
  private readonly session = inject(SessionService);

  private readonly customerEmail = computed(() => this.session.user()?.email?.toLowerCase() ?? '');

  protected readonly customerOrders = computed(() =>
    this.orderService
      .orders()
      .filter(
        (order) =>
          Boolean(this.customerEmail()) &&
          order.customerEmail?.toLowerCase() === this.customerEmail(),
      ),
  );

  protected readonly activeOrder = computed(() =>
    this.customerOrders().find(
      (order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED',
    ),
  );

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly ratingDraft = signal<
    Record<string, { restaurantRating: number; deliveryRating: number; overallRating: number }>
  >({});
  protected readonly textDraft = signal<Record<string, string>>({});
  protected readonly imagesDraft = signal<Record<string, string[]>>({});

  protected readonly activeCount = computed(
    () => this.customerOrders().filter((order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED').length,
  );

  protected readonly deliveredCount = computed(
    () => this.customerOrders().filter((order) => order.status === 'DELIVERED').length,
  );

  protected readonly reviewCount = computed(() => this.reviews.customerReviews().length);

  protected readonly totalSpent = computed(() =>
    this.customerOrders().reduce((sum, order) => sum + (order.total ?? 0), 0),
  );

  pickupPoint(order: Order) {
    return (
      order.pickupLocation ?? this.locations.restaurantLocation(order.restaurantId ?? order.restaurantName)
    );
  }

  dropPoint(order: Order) {
    return (
      order.deliveryLocation ?? this.locations.addressLocation(order.deliveryAddressLine ?? order.customerName ?? order.id)
    );
  }

  deliveredOrders(): Order[] {
    return this.customerOrders().filter((order) => order.status === 'DELIVERED');
  }

  statusLabel(status: Order['status']): string {
    if (status === 'PLACED') {
      return 'New';
    }
    if (status === 'CONFIRMED') {
      return 'Accepted';
    }
    if (status === 'PREPARING') {
      return 'Preparing';
    }
    if (status === 'READY') {
      return 'Ready';
    }
    if (status === 'ON_THE_WAY') {
      return 'Picked';
    }
    return status.replaceAll('_', ' ');
  }

  isAccepted(status: Order['status']): boolean {
    return (
      status === 'CONFIRMED' ||
      status === 'PREPARING' ||
      status === 'READY' ||
      status === 'ON_THE_WAY' ||
      status === 'DELIVERED'
    );
  }

  isPreparing(status: Order['status']): boolean {
    return (
      status === 'PREPARING' ||
      status === 'READY' ||
      status === 'ON_THE_WAY' ||
      status === 'DELIVERED'
    );
  }

  isReady(status: Order['status']): boolean {
    return status === 'READY' || status === 'ON_THE_WAY' || status === 'DELIVERED';
  }

  isPicked(status: Order['status']): boolean {
    return status === 'ON_THE_WAY' || status === 'DELIVERED';
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

    if (!existing) {
      return 0;
    }

    if (field === 'restaurantRating') {
      return existing.restaurantRating ?? 0;
    }
    if (field === 'deliveryRating') {
      return existing.deliveryAgentRating ?? 0;
    }
    return existing.overallRating ?? 0;
  }

  setDraftText(orderId: string, value: string): void {
    this.textDraft.update((state) => ({ ...state, [orderId]: value }));
  }

  draftText(orderId: string): string {
    const existing = this.reviews.findCustomerReview(orderId);
    return this.textDraft()[orderId] ?? existing?.comment ?? '';
  }

  handleImages(orderId: string, files: FileList | null): void {
    if (!files?.length) {
      return;
    }

    const promises = Array.from(files).map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(file);
        }),
    );

    Promise.all(promises).then((images) => {
      this.imagesDraft.update((state) => ({ ...state, [orderId]: images }));
    });
  }

  draftImages(orderId: string): string[] {
    return this.imagesDraft()[orderId] ?? this.reviews.findCustomerReview(orderId)?.images ?? [];
  }

  existingReview(orderId: string) {
    return this.reviews.findCustomerReview(orderId);
  }

  canEdit(orderId: string): boolean {
    const review = this.reviews.findCustomerReview(orderId);
    return review ? this.reviews.canEdit(review) : false;
  }

  submitReview(order: Order): void {
    const review = this.reviews.findCustomerReview(order.id);
    if (review && !this.reviews.canEdit(review)) {
      return;
    }

    const ratings = this.ratingDraft()[order.id] ?? {
      restaurantRating: review?.restaurantRating ?? 5,
      deliveryRating: review?.deliveryAgentRating ?? 5,
      overallRating: review?.overallRating ?? 5,
    };
    const comment = this.textDraft()[order.id] ?? review?.comment ?? 'Great experience';

    this.reviews.submitCustomerReview({
      orderId: order.id,
      restaurantId: order.restaurantId,
      restaurantName: order.restaurantName,
      customerName:
        `${this.session.user()?.firstName ?? 'Customer'} ${this.session.user()?.lastName ?? ''}`.trim(),
      customerEmail: this.session.user()?.email,
      deliveryAgentName: order.deliveryAgentName ?? order.agent,
      restaurantRating: ratings.restaurantRating,
      deliveryAgentRating: ratings.deliveryRating,
      overallRating: ratings.overallRating,
      comment,
      images: this.imagesDraft()[order.id] ?? review?.images ?? [],
    });
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
    this.imagesDraft.update((state) => ({ ...state, [orderId]: review?.images ?? [] }));
  }

  deleteReview(orderId: string): void {
    const review = this.reviews.findCustomerReview(orderId);
    if (review && this.reviews.canEdit(review)) {
      this.reviews.deleteReview(review.id);
    }
  }

  deleteOrder(orderId: string): void {
    const order = this.orderService.orders().find((item) => item.id === orderId);
    const label = order ? `${order.id} - ${order.restaurantName}` : orderId;
    if (!window.confirm(`Delete order ${label}? This cannot be undone.`)) {
      return;
    }

    this.orderService.deleteOrder(orderId);
  }
}
