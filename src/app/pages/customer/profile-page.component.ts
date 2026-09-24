import { NgFor, NgIf } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthApiService } from '../../services/auth-api.service';
import { CartService } from '../../services/cart.service';
import { CustomerProfileService } from '../../services/customer-profile.service';
import { OrderService } from '../../services/order.service';
import { ReviewService } from '../../services/review.service';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-profile-page',
  imports: [NgIf, NgFor, RouterLink],
  template: `
    <section class="page-head">
      <div>
        <h1>My Profile</h1>
        <p>Customer account details and loyalty summary.</p>
      </div>
    </section>

    <section class="profile-grid">
      <div class="card profile-card">
        <div class="profile-identity">
          <div class="profile-avatar">{{ avatarInitial() }}</div>
          <div>
            <h2>{{ draft().name }}</h2>
            <p>Customer since {{ memberSince() }}</p>
            <span>{{ avgRatingDisplay() }} · {{ totalOrders() }} Orders</span>
          </div>
        </div>

        <!-- View mode: clean details with Edit Profile button -->
        <div *ngIf="!isEditing()" class="profile-details-view" style="display: grid; gap: 0.9rem; margin-top: 1.2rem;">
          <div class="detail-row" style="background: var(--surface-2, #f8fafc); padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid var(--line, #e2e8f0);">
            <small style="display: block; color: var(--muted, #64748b); font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Full Name</small>
            <strong style="font-size: 0.95rem; color: var(--text);">{{ draft().name }}</strong>
          </div>
          <div class="detail-row" style="background: var(--surface-2, #f8fafc); padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid var(--line, #e2e8f0);">
            <small style="display: block; color: var(--muted, #64748b); font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Phone Number</small>
            <strong style="font-size: 0.95rem; color: var(--text);">{{ draft().phone || 'Not provided' }}</strong>
          </div>
          <div class="detail-row" style="background: var(--surface-2, #f8fafc); padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid var(--line, #e2e8f0);">
            <small style="display: block; color: var(--muted, #64748b); font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Email Address</small>
            <strong style="font-size: 0.95rem; color: var(--text);">{{ draft().email }}</strong>
          </div>
          <div class="profile-btn-group" style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.5rem;">
            <button type="button" class="primary-link" (click)="startEditing()" style="cursor: pointer; font-weight: 700;">
              ✏️ Edit Profile
            </button>
            <button type="button" class="ghost" (click)="logout()" style="cursor: pointer; font-weight: 700;">
              🚪 Log Out
            </button>
          </div>
        </div>

        <!-- Edit mode: input fields with Save & Cancel -->
        <div *ngIf="isEditing()" class="profile-details-edit" style="display: grid; gap: 0.9rem; margin-top: 1.2rem;">
          <label>Full Name
            <input
              [value]="draft().name"
              (input)="updateField('name', $any($event.target).value)"
            />
          </label>
          <label>Phone Number
            <input
              [value]="draft().phone"
              (input)="updateField('phone', $any($event.target).value)"
              placeholder="10-digit mobile number"
            />
          </label>
          <label>Email Address
            <input
              [value]="draft().email"
              disabled
              style="opacity: 0.65; cursor: not-allowed;"
            />
          </label>
          <div class="profile-btn-group" style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.5rem;">
            <button type="button" class="primary-link" (click)="save()" style="cursor: pointer;">
              Save Changes
            </button>
            <button type="button" class="ghost" (click)="cancelEditing()" style="cursor: pointer;">
              Cancel
            </button>
          </div>
        </div>
        <p class="save-note" *ngIf="saved()">Profile updated successfully.</p>

        <!-- Saved Addresses Section under profile -->
        <div class="saved-addresses-section" style="margin-top: 1.6rem; border-top: 1px solid var(--line, #e2e8f0); padding-top: 1.2rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
            <div>
              <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800;">Saved Addresses</h3>
              <p style="margin: 0.2rem 0 0; font-size: 0.8rem; color: var(--muted);">Your delivery addresses</p>
            </div>
            <a routerLink="/addresses" class="ghost small" style="text-decoration: none; font-weight: 700;">
              Manage &rarr;
            </a>
          </div>

          <div *ngIf="cart.addresses().length > 0; else noAddresses" style="display: grid; gap: 0.6rem;">
            <div *ngFor="let addr of cart.addresses()" style="background: var(--surface-2, #f8fafc); border: 1px solid var(--line, #e2e8f0); border-radius: 12px; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="display: block; font-size: 0.88rem;">📍 {{ addr.title }}</strong>
                <small style="color: var(--muted); font-size: 0.8rem;">{{ addr.addressLine }}{{ addr.city ? ', ' + addr.city : '' }}</small>
              </div>
              <span *ngIf="addr.isDefault" style="background: rgba(255, 107, 0, 0.12); color: var(--brand, #ff6b00); font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 999px;">DEFAULT</span>
            </div>
          </div>
          <ng-template #noAddresses>
            <div style="text-align: center; padding: 0.8rem; background: var(--surface-2, #f8fafc); border-radius: 12px; border: 1px dashed var(--line, #e2e8f0);">
              <p style="margin: 0 0 0.5rem; color: var(--muted); font-size: 0.85rem;">No saved addresses yet.</p>
              <a routerLink="/addresses" class="primary-link" style="text-decoration: none; font-size: 0.82rem; padding: 0.45rem 0.9rem;">
                + Add Address
              </a>
            </div>
          </ng-template>
        </div>

        <hr style="margin: 1.6rem 0 1rem; border: none; border-top: 1px solid var(--line, #e2e8f0);" />

        <!-- Delete Account (No long instruction text, just clean danger action) -->
        <div class="danger-zone" style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.18); border-radius: 14px; padding: 0.9rem 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h3 style="margin: 0; color: #dc2626; font-size: 0.95rem; font-weight: 700;">Delete Account</h3>
          </div>
          <button
            type="button"
            class="ghost small danger"
            [disabled]="deleting()"
            (click)="deleteAccount()"
            style="border-color: #ef4444; color: #ef4444; font-weight: 700; cursor: pointer;"
          >
            {{ deleting() ? 'Deleting account…' : 'Delete Account' }}
          </button>
        </div>
      </div>

      <div class="card stats-card">
        <h2>Account Stats</h2>
        <div class="stat">
          📦 <strong>{{ totalOrders() }}</strong
          ><span>Total Orders</span>
        </div>
        <div class="stat">
          💰 <strong>₹{{ totalSpent() }}</strong
          ><span>Total Spent</span>
        </div>
        <div class="stat">
          🏆 <strong>{{ loyaltyTier() }}</strong
          ><span>Loyalty Tier</span>
        </div>
      </div>
    </section>
  `,
  styleUrl: './customer-pages.scss',
})
export class ProfilePageComponent {
  private readonly auth = inject(AuthApiService);
  private readonly profileService = inject(CustomerProfileService);
  private readonly session = inject(SessionService);
  private readonly orderService = inject(OrderService);
  private readonly reviews = inject(ReviewService);
  public readonly cart = inject(CartService);

  protected readonly draft = signal(this.profileService.profile());
  protected readonly saved = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly deleting = signal(false);

  protected readonly avatarInitial = signal(
    this.profileService.profile().name.charAt(0).toUpperCase(),
  );

  private readonly customerEmail = computed(
    () => this.session.user()?.email?.toLowerCase()?.trim() ?? '',
  );

  protected readonly customerOrders = computed(() => {
    const email = this.customerEmail();
    if (!email) return [];
    return this.orderService.orders().filter((order) => {
      const orderEmail = order.customerEmail?.toLowerCase()?.trim();
      return orderEmail === email;
    });
  });

  protected readonly totalOrders = computed(() => this.customerOrders().length);

  protected readonly totalSpent = computed(() =>
    this.customerOrders().reduce((sum, order) => sum + (order.total ?? 0), 0),
  );

  protected readonly loyaltyTier = computed(() => {
    const count = this.totalOrders();
    if (count >= 10) return 'Gold';
    if (count >= 3) return 'Silver';
    return count > 0 ? 'Bronze' : 'New Member';
  });

  protected readonly customerReviews = computed(() => {
    const email = this.customerEmail();
    if (!email) return [];
    return this.reviews.reviews().filter(
      (r) => r.customerEmail?.toLowerCase()?.trim() === email,
    );
  });

  protected readonly avgRatingDisplay = computed(() => {
    const revs = this.customerReviews();
    if (revs.length === 0) {
      return 'No reviews yet';
    }
    const sum = revs.reduce((acc, r) => acc + (r.overallRating ?? 0), 0);
    const avg = (sum / revs.length).toFixed(1);
    return `⭐ ${avg} (${revs.length} ${revs.length === 1 ? 'review' : 'reviews'})`;
  });

  protected readonly memberSince = computed(() => {
    const user = this.session.user();
    if (user?.createdAt) {
      const d = new Date(user.createdAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    }
    return new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });

  constructor() {
    effect(() => {
      const profile = this.profileService.profile();
      this.draft.set(profile);
      this.avatarInitial.set(profile.name.charAt(0).toUpperCase() || 'C');
      this.saved.set(false);
    });
  }

  updateField(field: 'name' | 'phone' | 'email', value: string): void {
    this.draft.update((profile) => ({ ...profile, [field]: value }));
    if (field === 'name') {
      this.avatarInitial.set(value.trim().charAt(0).toUpperCase() || 'P');
    }
    this.saved.set(false);
  }

  startEditing(): void {
    this.isEditing.set(true);
  }

  cancelEditing(): void {
    this.draft.set(this.profileService.profile());
    this.isEditing.set(false);
  }

  save(): void {
    this.profileService.updateProfile(this.draft());
    this.saved.set(true);
    this.isEditing.set(false);
    window.setTimeout(() => this.saved.set(false), 2000);
  }

  logout(): void {
    this.session.logout();
  }

  deleteAccount(): void {
    const user = this.session.user();
    const userEmail = (user?.email || this.draft().email || '').toLowerCase().trim();

    // Check if the user has active orders in progress
    const orders = this.orderService.orders();
    const activeOrders = orders.filter((order) => {
      const orderEmail = order.customerEmail?.toLowerCase()?.trim();
      const isActive = order.status !== 'DELIVERED' && order.status !== 'CANCELLED';
      if (!isActive) return false;
      return orderEmail === userEmail;
    });

    if (activeOrders.length > 0) {
      window.alert(
        `Cannot delete account while you have active orders in progress (Status: ${activeOrders[0].status}). Please wait until your orders are delivered or cancelled.`
      );
      return;
    }

    // No active orders: simply delete directly without popup
    this.deleting.set(true);
    this.auth.deleteAccount().subscribe({
      next: () => {
        this.session.logout();
      },
      error: (error) => {
        window.alert(
          this.auth.authErrorMessage(error, 'Unable to delete account. Please try again later.'),
        );
        this.deleting.set(false);
      },
    });
  }
}


