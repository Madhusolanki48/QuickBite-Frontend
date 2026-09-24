import { NgIf } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';

import { AuthApiService } from '../../services/auth-api.service';
import { CustomerProfileService } from '../../services/customer-profile.service';
import { OrderService } from '../../services/order.service';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-profile-page',
  imports: [NgIf],
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
            <p>Customer since {{ draft().memberSince }}</p>
            <span>⭐ {{ draft().avgRating }} Avg Rating · {{ draft().totalOrders }} Orders</span>
          </div>
        </div>

        <label
          >Full Name<input
            [value]="draft().name"
            (input)="updateField('name', $any($event.target).value)"
        /></label>
        <label
          >Phone<input
            [value]="draft().phone"
            (input)="updateField('phone', $any($event.target).value)"
        /></label>
        <label
          >Email<input
            [value]="draft().email"
            (input)="updateField('email', $any($event.target).value)"
        /></label>
        <div class="profile-btn-group" style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.5rem;">
          <button type="button" class="primary-link" (click)="save()">Save Changes</button>
          <button type="button" class="ghost" (click)="logout()" style="cursor: pointer; font-weight: 700;">
            <span style="margin-right: 0.35rem;">🚪</span> Log Out
          </button>
        </div>
        <p class="save-note" *ngIf="saved()">Profile saved successfully.</p>

        <hr style="margin: 1.5rem 0 1rem; border: none; border-top: 1px solid var(--line);" />

        <div class="danger-zone" style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 14px; padding: 1rem;">
          <h3 style="margin: 0 0 0.4rem; color: #dc2626; font-size: 0.95rem; font-weight: 700;">Delete Account</h3>
          <p style="margin: 0 0 0.8rem; font-size: 0.85rem; color: var(--muted);">
            Deleting your account removes all personal information and credentials. You can only delete your account when you have no active orders in progress.
          </p>
          <button
            type="button"
            class="ghost small danger"
            [disabled]="deleting()"
            (click)="deleteAccount()"
            style="border-color: #ef4444; color: #ef4444; font-weight: 700;"
          >
            {{ deleting() ? 'Deleting account…' : 'Delete Account' }}
          </button>
          <p class="field-error" *ngIf="deleteMessage()" style="margin-top: 0.6rem; color: #dc2626; font-size: 0.85rem; font-weight: 600;">
            ⚠️ {{ deleteMessage() }}
          </p>
        </div>
      </div>

      <div class="card stats-card">
        <h2>Account Stats</h2>
        <div class="stat">
          📦 <strong>{{ draft().totalOrders }}</strong
          ><span>Total Orders</span>
        </div>
        <div class="stat">
          💰 <strong>{{ draft().totalSpent }}</strong
          ><span>Total Spent</span>
        </div>
        <div class="stat">
          🏆 <strong>{{ draft().loyaltyTier }}</strong
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

  protected readonly draft = signal(this.profileService.profile());
  protected readonly saved = signal(false);
  protected readonly deleting = signal(false);
  protected readonly deleteMessage = signal('');

  protected readonly avatarInitial = signal(
    this.profileService.profile().name.charAt(0).toUpperCase(),
  );

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

  save(): void {
    this.profileService.updateProfile(this.draft());
    this.saved.set(true);
    window.setTimeout(() => this.saved.set(false), 1800);
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
      this.deleteMessage.set(
        `Cannot delete account while you have active orders in progress (Current status: ${activeOrders[0].status}). Please wait until your orders are delivered or cancelled.`
      );
      return;
    }

    if (!window.confirm('Delete your account and all stored auth data? This cannot be undone.')) {
      return;
    }

    this.deleting.set(true);
    this.deleteMessage.set('');
    this.auth.deleteAccount().subscribe({
      next: () => {
        this.session.logout();
      },
      error: (error) => {
        this.deleteMessage.set(
          this.auth.authErrorMessage(error, 'Unable to delete account. Please try again later.'),
        );
        this.deleting.set(false);
      },
    });
  }
}

