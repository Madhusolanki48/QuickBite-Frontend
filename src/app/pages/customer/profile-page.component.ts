import { NgIf } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';

import { AuthApiService } from '../../services/auth-api.service';
import { CustomerProfileService } from '../../services/customer-profile.service';
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
        <button type="button" class="primary-link" (click)="save()">Save Changes</button>
        <button
          type="button"
          class="ghost small danger"
          [disabled]="deleting()"
          (click)="deleteAccount()"
        >
          {{ deleting() ? 'Deleting…' : 'Delete account' }}
        </button>
        <p class="save-note" *ngIf="saved()">Profile saved successfully.</p>
        <p class="field-error" *ngIf="deleteMessage()">{{ deleteMessage() }}</p>
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

  deleteAccount(): void {
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
