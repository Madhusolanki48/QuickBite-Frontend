import { Component, inject, signal } from '@angular/core';
import { NgFor } from '@angular/common';

import { DeliveryDashboardService } from '../../services/delivery-dashboard.service';
import { ReviewService } from '../../services/review.service';

@Component({
  selector: 'app-delivery-earnings-page',
  imports: [NgFor],
  template: `
    <section class="page-head">
      <div>
        <h1>My Earnings 💰</h1>
      </div>
    </section>

    <section class="earnings-grid">
      <article class="card metric">
        <span class="stat-card__icon green">💰</span>
        <div>
          <strong>{{ dashboard.earnings().today }}</strong
          ><span>Today</span>
        </div>
      </article>
      <article class="card metric">
        <span class="stat-card__icon">🗓</span>
        <div>
          <strong>{{ dashboard.earnings().week }}</strong
          ><span>This Week</span>
        </div>
      </article>
      <article class="card metric">
        <span class="stat-card__icon gold">🗓</span>
        <div>
          <strong>{{ dashboard.earnings().month }}</strong
          ><span>This Month</span>
        </div>
      </article>
      <article class="card metric">
        <span class="stat-card__icon green">🏆</span>
        <div>
          <strong>{{ dashboard.earnings().total }}</strong
          ><span>Total Earned</span>
        </div>
      </article>
    </section>

    <section class="two-col">
      <article class="card info-card">
        <h2>Earnings Breakdown</h2>
        <div class="info-list">
          <div class="info-row" *ngFor="let row of dashboard.earnings().breakdown">
            <span>{{ row.label }}</span>
            <strong [style.color]="row.label === 'Total' ? 'var(--brand)' : 'inherit'">{{
              row.amount
            }}</strong>
          </div>
        </div>
        <button class="primary-action" style="margin-top:1rem;">Withdraw to Bank</button>
      </article>

      <article class="card info-card">
        <h2>Performance</h2>
        <div class="info-list">
          <div class="info-row" *ngFor="let row of dashboard.earnings().performance">
            <span>{{ row.label }}</span>
            <strong>{{ row.value }}</strong>
          </div>
        </div>
      </article>
    </section>

    <section class="card section-card" style="margin-top:1rem;">
      <h2>Restaurant & Customer Feedback</h2>
      <div class="review-feed__item" *ngFor="let review of deliveryReviews()">
        <strong>{{ review.restaurantName }}</strong>
        <span
          >Restaurant {{ review.restaurantRating }}/5 · Customer
          {{ review.customerRating ?? 'n/a' }}/5</span
        >
        <p>{{ review.comment }}</p>
      </div>

      <div class="review-item" style="margin-top:1rem;">
        <strong>Leave delivery feedback</strong>
        <label class="review-upload"
          >Restaurant rating
          <div class="review-stars">
            <button
              type="button"
              *ngFor="let star of stars"
              (click)="deliveryRating.set(star)"
              [class.active]="deliveryRating() >= star"
            >
              ★
            </button>
          </div>
        </label>
        <label class="review-upload"
          >Customer rating
          <div class="review-stars">
            <button
              type="button"
              *ngFor="let star of stars"
              (click)="customerRating.set(star)"
              [class.active]="customerRating() >= star"
            >
              ★
            </button>
          </div>
        </label>
        <textarea
          rows="3"
          [value]="comment()"
          (input)="comment.set($any($event.target).value)"
          placeholder="Waiting time, order readiness, availability, behavior..."
        ></textarea>
        <button class="primary-link" type="button" (click)="submit()">Save Feedback</button>
      </div>
    </section>
  `,
  styleUrl: './delivery-pages.scss',
})
export class DeliveryEarningsPageComponent {
  protected readonly dashboard = inject(DeliveryDashboardService);
  protected readonly reviews = inject(ReviewService);
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly deliveryRating = signal(5);
  protected readonly customerRating = signal(0);
  protected readonly comment = signal('');

  deliveryReviews() {
    return this.reviews.deliveryAgentReviews(this.dashboard.profile().name);
  }

  submit(): void {
    this.reviews.submitRoleReview({
      orderId: `DEL-${Date.now()}`,
      kind: 'DELIVERY',
      restaurantName: 'QuickBite',
      customerName: this.dashboard.profile().name,
      deliveryAgentName: this.dashboard.profile().name,
      restaurantRating: this.deliveryRating(),
      customerRating: this.customerRating() || undefined,
      comment: this.comment().trim() || 'Feedback submitted',
      images: [],
    });
    this.deliveryRating.set(5);
    this.customerRating.set(0);
    this.comment.set('');
  }
}
