import { NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { CustomerProfileService } from '../../services/customer-profile.service';

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
        <p class="save-note" *ngIf="saved()">Profile saved successfully.</p>
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
  private readonly profileService = inject(CustomerProfileService);

  protected readonly draft = signal(this.profileService.profile());
  protected readonly saved = signal(false);

  protected readonly avatarInitial = signal(
    this.profileService.profile().name.charAt(0).toUpperCase(),
  );

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
}
