import { NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { RestaurantProfile } from '../../core/app.models';
import { OwnerDashboardService } from '../../services/owner-dashboard.service';

@Component({
  selector: 'app-restaurant-profile-page',
  imports: [NgIf],
  template: `
    <section class="page-head">
      <div>
        <h1>Restaurant Profile</h1>
      </div>
    </section>

    <section class="profile-grid">
      <div class="card form-card">
        <h2>Basic Information</h2>
        <div class="form-grid">
          <label
            >Restaurant Name<input
              [value]="draft().name"
              (input)="update('name', $any($event.target).value)"
          /></label>
          <label
            >Cuisine Type<input
              [value]="draft().cuisine"
              (input)="update('cuisine', $any($event.target).value)"
          /></label>
          <label
            >Description<textarea
              rows="5"
              [value]="draft().description"
              (input)="update('description', $any($event.target).value)"
            ></textarea>
          </label>
          <label
            >Phone Number<input
              [value]="draft().phone"
              (input)="update('phone', $any($event.target).value)"
          /></label>
          <label
            >Email<input
              [value]="draft().email"
              (input)="update('email', $any($event.target).value)"
          /></label>
          <button type="button" class="save-btn" (click)="save()">Save Changes</button>
          <p class="save-note" *ngIf="saved()">Restaurant profile saved.</p>
        </div>
      </div>

      <div class="card form-card">
        <h2>Location & Delivery</h2>
        <div class="form-grid">
          <label
            >Address<textarea
              rows="4"
              [value]="draft().address"
              (input)="update('address', $any($event.target).value)"
            ></textarea>
          </label>
          <label
            >Delivery Radius (km)<input
              [value]="draft().radiusKm"
              (input)="updateNumber('radiusKm', $any($event.target).value)"
          /></label>
          <label
            >Min Order Amount (₹)<input
              [value]="draft().minOrder"
              (input)="updateNumber('minOrder', $any($event.target).value)"
          /></label>
          <label
            >Delivery Charge (₹)<input
              [value]="draft().deliveryCharge"
              (input)="updateNumber('deliveryCharge', $any($event.target).value)"
          /></label>
          <label
            >GSTIN<input
              [value]="draft().gstin"
              (input)="update('gstin', $any($event.target).value)"
          /></label>
          <label
            >FSSAI License<input
              [value]="draft().fssai"
              (input)="update('fssai', $any($event.target).value)"
          /></label>
          <label class="status-toggle"
            >Open for Orders
            <button
              type="button"
              class="toggle"
              [class.off]="!draft().open"
              (click)="toggleOpen()"
            ></button>
          </label>
          <p
            class="save-note"
            [attr.title]="
              draft().open
                ? 'Customers can place orders while this is open'
                : 'Customers cannot order when closed'
            "
          >
            {{ draft().open ? 'Open - accepting orders' : 'Closed - orders paused' }}
          </p>
        </div>
      </div>
    </section>
  `,
  styleUrl: './owner-pages.scss',
})
export class RestaurantProfilePageComponent {
  protected readonly dashboard = inject(OwnerDashboardService);
  protected readonly draft = signal<RestaurantProfile>({ ...this.dashboard.restaurantProfile() });
  protected readonly saved = signal(false);

  update(field: keyof RestaurantProfile, value: string): void {
    this.draft.update((profile) => ({ ...profile, [field]: value }) as RestaurantProfile);
    this.saved.set(false);
  }

  updateNumber(field: 'radiusKm' | 'minOrder' | 'deliveryCharge', value: string): void {
    const parsed = Number(value);
    this.draft.update((profile) => ({ ...profile, [field]: Number.isFinite(parsed) ? parsed : 0 }));
    this.saved.set(false);
  }

  toggleOpen(): void {
    this.draft.update((profile) => ({ ...profile, open: !profile.open }));
    this.saved.set(false);
  }

  save(): void {
    this.dashboard.updateRestaurantProfile(this.draft());
    this.saved.set(true);
    window.setTimeout(() => this.saved.set(false), 1800);
  }
}
