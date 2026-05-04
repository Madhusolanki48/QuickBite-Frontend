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
    <section class="page-head">
      <div>
        <h1>My Orders</h1>
        <p>Track active deliveries and leave a detailed review after delivery.</p>
      </div>
    </section>

    <app-live-route-map
      *ngIf="activeOrder() as order"
      title="Current Order Route"
      [subtitle]="order.restaurantName + ' -> ' + (order.deliveryAddressLine ?? 'Delivery address')"
      [status]="statusLabel(order.status)"
      [pickup]="pickupPoint(order)"
      [drop]="dropPoint(order)"
      [routeStart]="pickupPoint(order)"
      [routeEnd]="dropPoint(order)"
    />

    <section
      class="card info-card"
      *ngIf="activeOrder() as active"
      style="padding:1.15rem;border-radius:24px;background:linear-gradient(180deg,#fff, #fff8f3);box-shadow:0 18px 45px rgba(28,28,42,.08);"
    >
      <div
        style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1rem;"
      >
        <div>
          <h2 style="margin:0;font-family:'Space Grotesk',sans-serif;">Delivery Details</h2>
          <p style="margin:.35rem 0 0;color:var(--muted);">A quick snapshot of your live order.</p>
        </div>
        <span class="badge">{{ statusLabel(active.status) }}</span>
      </div>

      <div style="display:grid;grid-template-columns:1.2fr .8fr;gap:.85rem;">
        <article
          style="padding:1rem;border-radius:18px;border:1px solid var(--line);background:var(--surface-2);display:grid;gap:.45rem;"
        >
          <span style="color:var(--muted);font-size:.85rem;font-weight:700;">Delivery address</span>
          <strong style="font-family:'Space Grotesk',sans-serif;line-height:1.45;">{{
            active.deliveryAddressLine
          }}</strong>
          <small style="color:var(--muted);"
            >The restaurant owner will assign a delivery partner after the order is accepted.</small
          >
        </article>

        <article
          style="padding:1rem;border-radius:18px;border:1px solid rgba(255,90,0,.14);background:linear-gradient(180deg,#fff6ef,#fff);display:grid;gap:.5rem;"
        >
          <span style="color:var(--muted);font-size:.85rem;font-weight:700;">Status</span>
          <strong style="font-family:'Space Grotesk',sans-serif;font-size:1.4rem;">{{
            statusLabel(active.status)
          }}</strong>
          <div style="display:grid;gap:.35rem;color:var(--muted);font-size:.92rem;">
            <span>Route live on the map above.</span>
            <span>Updates appear as the order moves forward.</span>
          </div>
        </article>
      </div>
    </section>

    <section class="orders-stack">
      <article class="card order-card" *ngFor="let order of customerOrders()">
        <div class="order-card__header">
          <div>
            <h3>{{ order.id }} - {{ order.restaurantName }}</h3>
            <p>{{ order.items }}</p>
          </div>
          <div class="order-card__meta">
            <strong>Rs {{ order.total }}</strong>
            <span class="badge">{{ statusLabel(order.status) }}</span>
          </div>
          <div class="order-card__actions">
            <button
              *ngIf="order.status === 'PLACED'"
              type="button"
              class="ghost small danger"
              (click)="deleteOrder(order.id)"
            >
              Cancel
            </button>
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
      </article>
    </section>

    <section class="card history">
      <h2>Past Orders</h2>
      <div
        class="history__row"
        *ngFor="
          let order of customerOrders().filter(
            (item) => item.status === 'DELIVERED' || item.status === 'CANCELLED'
          )
        "
      >
        <strong>{{ order.id }}</strong>
        <span>{{ order.restaurantName }}</span>
        <span>{{ order.items }}</span>
        <strong>Rs {{ order.total }}</strong>
        <span>{{ statusLabel(order.status) }}</span>
      </div>
    </section>

    <section class="card review-card">
      <div class="review-card__head">
        <div>
          <h2>Rate Your Delivered Orders</h2>
          <p>One review per order, editable for 30 minutes.</p>
        </div>
        <span class="badge">Feedback</span>
      </div>

      <div class="review-list">
        <article *ngFor="let order of deliveredOrders()" class="review-item">
          <div>
            <strong>{{ order.restaurantName }}</strong>
            <p>{{ order.items }}</p>
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
            placeholder="Tell us what you liked, packaging, taste, hygiene, and delivery..."
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

      <div class="review-feed">
        <h3>Your Reviews</h3>
        <article *ngFor="let review of reviews.customerReviews()" class="review-feed__item">
          <strong>{{ review.restaurantName }}</strong>
          <span
            >{{ review.customerName }} · Food {{ review.restaurantRating }}/5 · Delivery
            {{ review.deliveryAgentRating }}/5 · Overall {{ review.overallRating }}/5</span
          >
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
      </div>
    </section>
  `,
  styleUrl: './customer-pages.scss',
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
