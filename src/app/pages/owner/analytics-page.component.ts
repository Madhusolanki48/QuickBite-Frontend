import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { AnalyticsPeriod } from '../../core/app.models';
import { OwnerDashboardService } from '../../services/owner-dashboard.service';
import { ReviewService } from '../../services/review.service';

@Component({
  selector: 'app-analytics-page',
  imports: [NgClass, NgFor, NgIf],
  template: `
    <section class="page-head">
      <div>
        <h1>Analytics & Reports</h1>
        <p>Revenue, order flow, reviews, and conversion signals for the restaurant owner.</p>
      </div>
    </section>

    <section class="owner-toolbar analytics-toolbar" style="margin-bottom:1rem;">
      <button
        class="ghost-btn"
        [class.active]="dashboard.analyticsPeriod() === 'today'"
        type="button"
        (click)="setPeriod('today')"
      >
        Today
      </button>
      <button
        class="ghost-btn"
        [class.active]="dashboard.analyticsPeriod() === 'week'"
        type="button"
        (click)="setPeriod('week')"
      >
        This Week
      </button>
      <button
        class="ghost-btn"
        [class.active]="dashboard.analyticsPeriod() === 'month'"
        type="button"
        (click)="setPeriod('month')"
      >
        This Month
      </button>
      <button
        class="ghost-btn"
        [class.active]="dashboard.analyticsPeriod() === 'custom'"
        type="button"
        (click)="setPeriod('custom')"
      >
        Custom
      </button>
    </section>

    <section class="card section-card" *ngIf="dashboard.analyticsPeriod() === 'custom'">
      <h2>Custom Range</h2>
      <div class="custom-range">
        <label
          >Start<input
            type="date"
            [value]="dashboard.customAnalyticsRange().start"
            (input)="updateRange('start', $any($event.target).value)"
        /></label>
        <label
          >End<input
            type="date"
            [value]="dashboard.customAnalyticsRange().end"
            (input)="updateRange('end', $any($event.target).value)"
        /></label>
        <button class="save-btn" type="button" (click)="applyCustom()">Apply Range</button>
      </div>
    </section>

    <section class="analytics-grid">
      <article class="card metric">
        <span class="metric__icon">💰</span>
        <div class="metric__content">
          <span class="metric__label">Revenue</span>
          <strong>{{ dashboard.analytics().revenueToday }}</strong>
          <span class="metric__foot">Peak: {{ dashboard.analytics().peakHour }}</span>
        </div>
      </article>
      <article class="card metric">
        <span class="metric__icon">🧾</span>
        <div class="metric__content">
          <span class="metric__label">Orders</span>
          <strong>{{ dashboard.analytics().ordersToday }}</strong>
          <span class="metric__foot">Conversion {{ dashboard.analytics().conversionRate }}</span>
        </div>
      </article>
      <article class="card metric">
        <span class="metric__icon">⭐</span>
        <div class="metric__content">
          <span class="metric__label">Avg Rating</span>
          <strong>{{ dashboard.analytics().avgRating }}</strong>
          <span class="metric__foot">Live snapshot</span>
        </div>
      </article>
      <article class="card metric">
        <span class="metric__icon">⏱️</span>
        <div class="metric__content">
          <span class="metric__label">Avg Prep</span>
          <strong>{{ dashboard.analytics().avgPrepTime }}</strong>
          <span class="metric__foot"
            >Cancellation {{ dashboard.analytics().cancellationRate }}</span
          >
        </div>
      </article>
    </section>

    <section class="double-grid">
      <article class="card section-card">
        <div class="section-head">
          <div>
            <h2>Revenue Line</h2>
            <p>Higher bars mean stronger revenue activity in that slot.</p>
          </div>
        </div>
        <div class="line-chart">
          <div
            class="line-chart__row"
            *ngFor="let point of dashboard.analytics().revenueTrend; let index = index"
          >
            <span>{{ point.label }}</span>
            <div class="line-chart__track">
              <div class="line-chart__fill" [style.width]="revenueWidth(point.value, index)"></div>
            </div>
            <strong>{{ formatMoney(point.value) }}</strong>
          </div>
        </div>
      </article>

      <article class="card section-card">
        <div class="section-head">
          <div>
            <h2>Orders Per Hour</h2>
            <p>Quick read on peak order windows for the kitchen.</p>
          </div>
        </div>
        <div class="chart-bars">
          <div class="chart-bar" *ngFor="let item of dashboard.analytics().ordersByHour">
            <span class="chart-bar__value">{{ item.hour }}</span>
            <div class="chart-bar__track">
              <div class="chart-bar__fill" [style.height]="ordersHeight(item.value)"></div>
            </div>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
        <div class="chart-labels">
          <span *ngFor="let label of chartLabels()">{{ label }}</span>
        </div>
      </article>
    </section>

    <section class="double-grid" style="margin-top:1rem;">
      <article class="card section-card">
        <div class="section-head">
          <div>
            <h2>Top Selling Items</h2>
            <p>Best movers in this period.</p>
          </div>
        </div>
        <div class="bar-list">
          <div class="bar-row" *ngFor="let item of dashboard.analytics().topSellers">
            <div class="status-line">
              <span>{{ item.name }}</span>
              <strong>{{ item.sold }} sold</strong>
            </div>
            <div class="bar-track"><div class="bar-fill" [style.width]="item.width"></div></div>
          </div>
        </div>
      </article>

      <article class="card section-card">
        <div class="section-head">
          <div>
            <h2>Order Status Mix</h2>
            <p>Where orders are sitting right now.</p>
          </div>
        </div>
        <div class="bar-row" *ngFor="let item of dashboard.analytics().statusBreakdown">
          <div class="status-line">
            <span [ngClass]="item.tone">{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </article>
    </section>

    <section class="two-col" style="margin-top:1rem;">
      <article class="card section-card">
        <div class="section-head">
          <div>
            <h2>Restaurant Reviews</h2>
            <p>Latest customer feedback and replies.</p>
          </div>
        </div>
        <div class="review-feed__item" *ngFor="let review of restaurantReviews()">
          <div class="status-line" style="align-items:flex-start;">
            <div>
              <strong>{{ review.customerName }}</strong>
              <div class="detail-pills" style="margin-top:0.45rem;">
                <span>Food {{ review.restaurantRating }}/5</span>
                <span>Delivery {{ review.deliveryAgentRating }}/5</span>
                <span>Overall {{ review.overallRating }}/5</span>
              </div>
            </div>
            <span class="status-chip status-ready">Customer</span>
          </div>
          <p style="margin:0; overflow-wrap:anywhere;">{{ review.comment }}</p>
          <div class="review-preview" *ngIf="review.images.length" style="margin-top:0.3rem;">
            <img *ngFor="let image of review.images" [src]="image" alt="Review image" />
          </div>
          <div *ngIf="review.responses.length" class="review-responses">
            <div *ngFor="let response of review.responses" class="review-response">
              <strong>{{ response.byRole }}</strong>
              <p>{{ response.text }}</p>
            </div>
          </div>
          <div class="owner-toolbar" style="margin-top:0.65rem; align-items:stretch;">
            <input
              class="search-input"
              style="flex:1; min-width:0;"
              [value]="replyFor(review.id)"
              (input)="setReply(review.id, $any($event.target).value)"
              placeholder="Write a response"
            />
            <button class="action-btn primary" type="button" (click)="respond(review.id)">
              Respond
            </button>
          </div>
        </div>
      </article>

      <article class="card section-card">
        <div class="section-head">
          <div>
            <h2>Rating Summary</h2>
            <p>A cleaner view of review health, delivery quality, and order conversion.</p>
          </div>
        </div>
        <div
          style="display:grid;grid-template-columns:minmax(220px,0.95fr) minmax(0,1.4fr);gap:1rem;"
        >
          <div
            class="card"
            style="padding:1rem 1.05rem;border-radius:22px;background:linear-gradient(180deg,#1f2a44,#152238);color:#f8fbff;display:grid;align-content:start;gap:0.35rem;"
          >
            <span
              style="color:rgba(248,251,255,0.78);font-size:0.85rem;letter-spacing:0.04em;text-transform:uppercase;"
              >Overall score</span
            >
            <strong
              style="font-size:clamp(2.2rem,4vw,3.6rem);line-height:1;font-family:'Space Grotesk',sans-serif;"
              >{{ overallScore() }}/5</strong
            >
            <p style="margin:0;color:rgba(248,251,255,0.78);overflow-wrap:anywhere;">
              {{
                restaurantReviews().length
                  ? restaurantReviews().length + ' customer review(s) are shaping this view.'
                  : 'No customer reviews yet.'
              }}
            </p>
          </div>

          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.8rem;">
            <article
              class="card"
              style="padding:1rem 1.05rem;border-radius:22px;background:#f8f4ef;display:grid;gap:0.35rem;"
            >
              <span style="color:var(--muted);">Restaurant</span>
              <strong style="font-size:1.5rem;font-family:'Space Grotesk',sans-serif;"
                >{{ averageRestaurant() }}/5</strong
              >
              <small style="color:var(--muted);">Kitchen quality</small>
            </article>
            <article
              class="card"
              style="padding:1rem 1.05rem;border-radius:22px;background:#f8f4ef;display:grid;gap:0.35rem;"
            >
              <span style="color:var(--muted);">Delivery</span>
              <strong style="font-size:1.5rem;font-family:'Space Grotesk',sans-serif;"
                >{{ averageDelivery() }}/5</strong
              >
              <small style="color:var(--muted);">Courier experience</small>
            </article>
            <article
              class="card"
              style="padding:1rem 1.05rem;border-radius:22px;background:#f8f4ef;display:grid;gap:0.35rem;"
            >
              <span style="color:var(--muted);">Conversion</span>
              <strong style="font-size:1.5rem;font-family:'Space Grotesk',sans-serif;">{{
                dashboard.analytics().conversionRate
              }}</strong>
              <small style="color:var(--muted);">Orders placed from visits</small>
            </article>
            <article
              class="card"
              style="padding:1rem 1.05rem;border-radius:22px;background:#f8f4ef;display:grid;gap:0.35rem;"
            >
              <span style="color:var(--muted);">Cancellation</span>
              <strong style="font-size:1.5rem;font-family:'Space Grotesk',sans-serif;">{{
                dashboard.analytics().cancellationRate
              }}</strong>
              <small style="color:var(--muted);">Lower is better</small>
            </article>
          </div>
        </div>
      </article>
    </section>
  `,
  styleUrl: './owner-pages.scss',
})
export class AnalyticsPageComponent {
  protected readonly dashboard = inject(OwnerDashboardService);
  protected readonly reviews = inject(ReviewService);
  protected readonly replyDrafts = signal<Record<string, string>>({});

  protected setPeriod(period: AnalyticsPeriod): void {
    this.dashboard.setAnalyticsPeriod(period);
    if (period === 'custom') {
      this.dashboard.applyCustomAnalytics();
    }
  }

  protected updateRange(field: 'start' | 'end', value: string): void {
    const current = this.dashboard.customAnalyticsRange();
    this.dashboard.updateAnalyticsCustomRange(
      field === 'start' ? value : current.start,
      field === 'end' ? value : current.end,
    );
  }

  protected applyCustom(): void {
    this.dashboard.applyCustomAnalytics();
  }

  protected chartLabels(): string[] {
    const period = this.dashboard.analyticsPeriod();
    if (period === 'week') {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    }
    if (period === 'month') {
      return ['W1', 'W2', 'W3', 'W4'];
    }
    if (period === 'custom') {
      return ['Start', 'Middle', 'End'];
    }
    return ['12am', '4am', '8am', '12pm', '4pm', '8pm'];
  }

  protected revenueWidth(value: number, index: number): string {
    const max = Math.max(...this.dashboard.analytics().revenueTrend.map((item) => item.value), 1);
    const spread = 36 + (value / max) * 64;
    return `${Math.max(spread - index * 2, 12)}%`;
  }

  protected ordersHeight(value: number): string {
    const max = Math.max(...this.dashboard.analytics().ordersByHour.map((item) => item.value), 1);
    return `${Math.max((value / max) * 100, 8)}%`;
  }

  protected formatMoney(value: number): string {
    if (value >= 100000) {
      return `Rs ${(value / 100000).toFixed(1)}L`;
    }
    if (value >= 1000) {
      return `Rs ${(value / 1000).toFixed(1)}K`;
    }
    return `Rs ${value}`;
  }

  protected restaurantReviews() {
    return this.reviews.restaurantReviews(this.dashboard.restaurantProfile().name);
  }

  protected averageRestaurant(): number {
    return this.reviews.averageRestaurantRating(this.dashboard.restaurantProfile().name);
  }

  protected averageDelivery(): number {
    const reviews = this.restaurantReviews();
    const values = reviews.map((review) => review.deliveryAgentRating ?? 0).filter(Boolean);
    return values.length
      ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
      : 0;
  }

  protected overallScore(): number {
    const restaurant = this.averageRestaurant();
    const delivery = this.averageDelivery();
    if (!restaurant && !delivery) {
      return 0;
    }
    return Math.round(((restaurant + delivery) / 2) * 10) / 10;
  }

  protected replyFor(reviewId: string): string {
    return this.replyDrafts()[reviewId] ?? '';
  }

  protected setReply(reviewId: string, value: string): void {
    this.replyDrafts.update((state) => ({ ...state, [reviewId]: value }));
  }

  protected respond(reviewId: string): void {
    const reply = this.replyFor(reviewId).trim();
    if (!reply) {
      return;
    }
    this.reviews.addResponse(reviewId, 'OWNER', reply);
    this.setReply(reviewId, '');
  }
}
