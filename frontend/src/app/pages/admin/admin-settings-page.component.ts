import { NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { AdminDashboardService } from '../../services/admin-dashboard.service';

@Component({
  selector: 'app-admin-settings-page',
  imports: [NgFor, NgIf],
  template: `
    <section class="page-head">
      <div>
        <h1>Platform Settings</h1>
      </div>
    </section>

    <section class="two-col">
      <article class="card panel">
        <h2>General Settings</h2>
        <div class="form-grid">
          <label
            >Platform Name<input
              [value]="draft().platformName"
              (input)="patch('platformName', $any($event.target).value)"
          /></label>
          <label
            >Support Email<input
              [value]="draft().supportEmail"
              (input)="patch('supportEmail', $any($event.target).value)"
          /></label>
          <label
            >Support Phone<input
              [value]="draft().supportPhone"
              (input)="patch('supportPhone', $any($event.target).value)"
          /></label>
          <label
            >Default Delivery Fee (₹)<input
              type="number"
              [value]="draft().deliveryFee"
              (input)="patchNumber('deliveryFee', $any($event.target).value)"
          /></label>
          <label
            >Platform Commission (%)<input
              type="number"
              [value]="draft().commission"
              (input)="patchNumber('commission', $any($event.target).value)"
          /></label>
          <label
            >GST on Delivery (%)<input
              type="number"
              [value]="draft().gst"
              (input)="patchNumber('gst', $any($event.target).value)"
          /></label>
          <button class="action-btn primary" type="button" (click)="save()">Save Settings</button>
          <p *ngIf="saved()" class="save-note">Settings saved locally.</p>
        </div>
      </article>

      <div class="card panel">
        <h2>Feature Toggles</h2>
        <div class="toggle-list">
          <div class="toggle-row" *ngFor="let toggle of admin.dashboard().settings.toggles">
            <strong>{{ toggle.label }}</strong>
            <button
              class="switch"
              type="button"
              [class.off]="!toggle.on"
              (click)="toggleFeature(toggle.label)"
            ></button>
          </div>
        </div>

        <h2 style="margin-top:1.5rem;">Notifications</h2>
        <div class="toggle-list">
          <div class="toggle-row" *ngFor="let toggle of admin.dashboard().settings.notifications">
            <strong>{{ toggle.label }}</strong>
            <button
              class="switch"
              type="button"
              [class.off]="!toggle.on"
              (click)="toggleNotification(toggle.label)"
            ></button>
          </div>
        </div>
      </div>
    </section>
  `,
  styleUrl: './admin-pages.scss',
})
export class AdminSettingsPageComponent {
  protected readonly admin = inject(AdminDashboardService);
  protected readonly draft = signal(this.admin.dashboard().settings);
  protected readonly saved = signal(false);

  patch(field: 'platformName' | 'supportEmail' | 'supportPhone', value: string): void {
    this.draft.update((current) => ({ ...current, [field]: value }));
    this.saved.set(false);
  }

  patchNumber(field: 'deliveryFee' | 'commission' | 'gst', value: string): void {
    const parsed = Number(value);
    this.draft.update((current) => ({
      ...current,
      [field]: Number.isFinite(parsed) ? parsed : current[field],
    }));
    this.saved.set(false);
  }

  save(): void {
    const current = this.draft();
    this.admin.updateSettings({
      platformName: current.platformName,
      supportEmail: current.supportEmail,
      supportPhone: current.supportPhone,
      deliveryFee: current.deliveryFee,
      commission: current.commission,
      gst: current.gst,
    });
    this.saved.set(true);
  }

  toggleFeature(label: string): void {
    const index = this.admin
      .dashboard()
      .settings.toggles.findIndex((toggle) => toggle.label === label);
    if (index >= 0) {
      this.admin.toggleFeature(index);
      this.draft.set(this.admin.dashboard().settings);
      this.saved.set(false);
    }
  }

  toggleNotification(label: string): void {
    const index = this.admin
      .dashboard()
      .settings.notifications.findIndex((toggle) => toggle.label === label);
    if (index >= 0) {
      this.admin.toggleNotification(index);
      this.draft.set(this.admin.dashboard().settings);
      this.saved.set(false);
    }
  }
}
