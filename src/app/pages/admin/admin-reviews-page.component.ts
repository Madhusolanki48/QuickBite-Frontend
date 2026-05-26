import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminDashboardService, AdminReview } from '../../services/admin-dashboard.service';

@Component({
  selector: 'app-admin-reviews-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-head">
      <div>
        <h1>Reviews Moderation</h1>
        <p>Monitor customer feedback across all restaurants, moderate inappropriate reviews, and maintain content standards.</p>
      </div>
      <div class="admin-toolbar">
        <span class="status-chip green">
          ★ {{ averageRating() }} Platform Average
        </span>
      </div>
    </section>

    <!-- Review Moderation Cards -->
    <article class="card section-card" style="padding: 1.5rem;">
      <div class="card-head" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
        <div class="filter-pills">
          <button type="button" class="pill" [class.active]="tab() === 'ALL'" (click)="tab.set('ALL')">
            All Reviews ({{ allReviews().length }})
          </button>
          <button type="button" class="pill" [class.active]="tab() === 'VISIBLE'" (click)="tab.set('VISIBLE')">
            Visible ({{ visibleCount() }})
          </button>
          <button type="button" class="pill" [class.active]="tab() === 'HIDDEN'" (click)="tab.set('HIDDEN')">
            Hidden ({{ hiddenCount() }})
          </button>
        </div>

        <input
          type="search"
          class="search-input"
          placeholder="Search by restaurant, customer, or content..."
          [(ngModel)]="searchQuery"
          style="min-width: 280px;"
        />
      </div>

      <div class="table-responsive">
        <table class="admin-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 0.85rem;">
              <th style="padding: 0.85rem 1rem;">Restaurant</th>
              <th style="padding: 0.85rem 1rem;">Customer</th>
              <th style="padding: 0.85rem 1rem;">Rating</th>
              <th style="padding: 0.85rem 1rem;">Review Comment</th>
              <th style="padding: 0.85rem 1rem;">Date</th>
              <th style="padding: 0.85rem 1rem;">Visibility</th>
              <th style="padding: 0.85rem 1rem; text-align: right;">Moderation</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let rev of filteredReviews()" style="border-bottom: 1px solid var(--line);">
              <td style="padding: 1rem; font-weight: 700;">{{ rev.restaurantName }}</td>
              <td style="padding: 1rem; font-weight: 600;">{{ rev.customerName }}</td>
              <td style="padding: 1rem;">
                <span style="color: #f59e0b; font-weight: 700; white-space: nowrap;">
                  ★ {{ rev.rating }}.0
                </span>
              </td>
              <td style="padding: 1rem; max-width: 320px; font-size: 0.9rem; line-height: 1.45;">
                {{ rev.comment }}
              </td>
              <td style="padding: 1rem; color: var(--muted); font-size: 0.85rem; white-space: nowrap;">
                {{ rev.date }}
              </td>
              <td style="padding: 1rem;">
                <span
                  class="status-chip"
                  [class.green]="rev.status === 'VISIBLE'"
                  [class.pink]="rev.status === 'HIDDEN'"
                >
                  {{ rev.status === 'VISIBLE' ? 'Public' : 'Hidden by Admin' }}
                </span>
              </td>
              <td style="padding: 1rem; text-align: right; white-space: nowrap;">
                <div style="display: inline-flex; gap: 0.5rem;">
                  <button
                    type="button"
                    class="action-btn"
                    style="padding: 0.45rem 0.8rem; font-size: 0.82rem;"
                    [style.color]="rev.status === 'VISIBLE' ? '#ef4444' : '#10b981'"
                    (click)="toggle(rev)"
                  >
                    {{ rev.status === 'VISIBLE' ? 'Hide Review' : 'Restore' }}
                  </button>
                  <button
                    type="button"
                    class="action-btn"
                    style="padding: 0.45rem 0.6rem; font-size: 0.82rem; color: #ef4444;"
                    title="Permanently remove"
                    (click)="delete(rev)"
                  >
                    🗑
                  </button>
                </div>
              </td>
            </tr>

            <tr *ngIf="filteredReviews().length === 0">
              <td colspan="7" style="padding: 3rem; text-align: center; color: var(--muted);">
                No reviews found matching your search.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  `,
  styleUrl: './admin-pages.scss',
})
export class AdminReviewsPageComponent {
  private readonly admin = inject(AdminDashboardService);

  readonly tab = signal<'ALL' | 'VISIBLE' | 'HIDDEN'>('ALL');
  searchQuery = '';

  readonly allReviews = computed(() => this.admin.reviews());

  readonly visibleCount = computed(() => this.allReviews().filter((r) => r.status === 'VISIBLE').length);
  readonly hiddenCount = computed(() => this.allReviews().filter((r) => r.status === 'HIDDEN').length);

  readonly averageRating = computed(() => {
    const list = this.allReviews().filter((r) => r.status === 'VISIBLE');
    if (!list.length) return '4.8';
    const sum = list.reduce((s, r) => s + r.rating, 0);
    return (sum / list.length).toFixed(1);
  });

  readonly filteredReviews = computed(() => {
    const list = this.allReviews();
    const currentTab = this.tab();
    const query = this.searchQuery.toLowerCase().trim();

    return list.filter((r) => {
      const matchTab = currentTab === 'ALL' || r.status === currentTab;
      const matchQuery =
        !query ||
        r.restaurantName.toLowerCase().includes(query) ||
        r.customerName.toLowerCase().includes(query) ||
        r.comment.toLowerCase().includes(query);
      return matchTab && matchQuery;
    });
  });

  toggle(rev: AdminReview): void {
    this.admin.toggleReviewVisibility(rev.id);
  }

  delete(rev: AdminReview): void {
    if (confirm(`Permanently remove review by ${rev.customerName}?`)) {
      this.admin.deleteReview(rev.id);
    }
  }
}
