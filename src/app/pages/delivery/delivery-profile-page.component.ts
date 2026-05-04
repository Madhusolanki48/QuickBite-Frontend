import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { DeliveryDashboardService } from '../../services/delivery-dashboard.service';

@Component({
  selector: 'app-delivery-profile-page',
  imports: [NgClass, NgFor, NgIf],
  template: `
    <section class="page-head">
      <div>
        <h1>My Profile</h1>
      </div>
    </section>

    <section class="profile-grid">
      <div class="card profile-card">
        <div class="profile-head">
          <div class="profile-avatar">{{ draft().initial }}</div>
          <div>
            <h2>{{ draft().name }}</h2>
            <p>{{ draft().role }}</p>
            <span>⭐ {{ draft().rating }}</span>
          </div>
        </div>

        <div class="form-grid">
          <label
            >Full Name<input
              [value]="draft().name"
              (input)="update('name', $any($event.target).value)"
          /></label>
          <label
            >Phone<input
              [value]="draft().phone"
              (input)="update('phone', $any($event.target).value)"
          /></label>
          <label
            >Vehicle Type<input
              [value]="draft().vehicleType"
              (input)="update('vehicleType', $any($event.target).value)"
          /></label>
          <label
            >Vehicle Number<input
              [value]="draft().vehicleNumber"
              (input)="update('vehicleNumber', $any($event.target).value)"
          /></label>
          <label
            >Zone<input [value]="draft().zone" (input)="update('zone', $any($event.target).value)"
          /></label>
          <button class="primary-action" type="button" (click)="save()">Save Changes</button>
          <p class="save-note" *ngIf="saved()">Profile saved.</p>
        </div>
      </div>

      <div class="card profile-card">
        <h2>Documents</h2>
        <div class="document-list">
          <div class="document-row" *ngFor="let doc of dashboard.profile().documents">
            <strong>{{ doc.label }}</strong>
            <span class="doc-pill" [ngClass]="doc.status === 'Verified' ? 'verified' : 'pending'">
              {{ doc.status }}
            </span>
          </div>
        </div>

        <h2>Bank Account</h2>
        <div class="form-grid">
          <label
            >Account Holder<input
              [value]="draft().accountHolder"
              (input)="update('accountHolder', $any($event.target).value)"
          /></label>
          <label
            >Account Number<input
              [value]="draft().accountNumber"
              (input)="update('accountNumber', $any($event.target).value)"
          /></label>
          <label
            >IFSC Code<input
              [value]="draft().ifscCode"
              (input)="update('ifscCode', $any($event.target).value)"
          /></label>
        </div>
      </div>
    </section>
  `,
  styleUrl: './delivery-pages.scss',
})
export class DeliveryProfilePageComponent {
  protected readonly dashboard = inject(DeliveryDashboardService);
  protected readonly draft = signal({ ...this.dashboard.profile() });
  protected readonly saved = signal(false);

  update(field: string, value: string): void {
    this.draft.update((profile) => ({ ...profile, [field]: value }));
    this.saved.set(false);
  }

  save(): void {
    this.dashboard.updateProfile(this.draft());
    this.dashboard.saveProfile();
    this.saved.set(true);
    window.setTimeout(() => this.saved.set(false), 1800);
  }
}
