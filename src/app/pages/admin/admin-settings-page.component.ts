import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminDashboardService, AdminSettings } from '../../services/admin-dashboard.service';

@Component({
  selector: 'app-admin-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-head">
      <div>
        <h1>System Settings & Security</h1>
        <p>Configure platform parameters, business fees, feature gates, alerting rules, and inspect audit trails.</p>
      </div>
      <div class="admin-toolbar">
        <button class="action-btn primary" type="button" (click)="saveAll()">
          💾 Save All Changes
        </button>
      </div>
    </section>

    <!-- Settings Navigation Tabs -->
    <article class="card section-card" style="padding: 1.5rem;">
      <div class="filter-pills" style="margin-bottom: 1.5rem;">
        <button type="button" class="pill" [class.active]="tab() === 'GENERAL'" (click)="tab.set('GENERAL')">
          ⚙️ General
        </button>
        <button type="button" class="pill" [class.active]="tab() === 'BUSINESS'" (click)="tab.set('BUSINESS')">
          💼 Business & Tariffs
        </button>
        <button type="button" class="pill" [class.active]="tab() === 'FEATURES'" (click)="tab.set('FEATURES')">
          ⚡ Feature Toggles
        </button>
        <button type="button" class="pill" [class.active]="tab() === 'NOTIFICATIONS'" (click)="tab.set('NOTIFICATIONS')">
          🔔 Notifications
        </button>
        <button type="button" class="pill" [class.active]="tab() === 'AUDIT'" (click)="tab.set('AUDIT')">
          🛡️ Security & Audit Log
        </button>
      </div>

      <!-- General Tab -->
      <div *ngIf="tab() === 'GENERAL'" style="display: flex; flex-direction: column; gap: 1.25rem; max-width: 600px;">
        <h3 style="margin: 0;">General Platform Configuration</h3>

        <label style="display: flex; flex-direction: column; gap: 0.4rem; font-weight: 700;">
          Platform Public Name
          <input class="search-input" [(ngModel)]="draft.platformName" placeholder="QuickBite" />
          <small style="color: var(--muted); font-weight: normal;">Brand name displayed across email templates, receipts, and headers.</small>
        </label>

        <label style="display: flex; flex-direction: column; gap: 0.4rem; font-weight: 700;">
          Official Support Email
          <input class="search-input" [(ngModel)]="draft.supportEmail" placeholder="support@quickbite.com" />
          <small style="color: var(--muted); font-weight: normal;">Replies to order inquiries will be directed to this address.</small>
        </label>

        <label style="display: flex; flex-direction: column; gap: 0.4rem; font-weight: 700;">
          Helpline Phone Number
          <input class="search-input" [(ngModel)]="draft.supportPhone" placeholder="+91 1800-123-4567" />
          <small style="color: var(--muted); font-weight: normal;">Customer and restaurant urgent dispatch contact number.</small>
        </label>

        <div *ngIf="savedMessage" class="status-chip green" style="align-self: flex-start;">
          ✓ {{ savedMessage }}
        </div>
      </div>

      <!-- Business Tab -->
      <div *ngIf="tab() === 'BUSINESS'" style="display: flex; flex-direction: column; gap: 1.25rem; max-width: 600px;">
        <h3 style="margin: 0;">Business Tariffs & Commission Rules</h3>

        <label style="display: flex; flex-direction: column; gap: 0.4rem; font-weight: 700;">
          Default Base Delivery Fee (₹)
          <input type="number" class="search-input" [(ngModel)]="draft.deliveryFee" placeholder="49" />
          <small style="color: var(--muted); font-weight: normal;">Standard base delivery charges added to customer checkout.</small>
        </label>

        <label style="display: flex; flex-direction: column; gap: 0.4rem; font-weight: 700;">
          Platform Commission on Restaurant Sales (%)
          <input type="number" class="search-input" [(ngModel)]="draft.commission" placeholder="18" />
          <small style="color: var(--muted); font-weight: normal;">Platform cut deducted automatically from gross restaurant payouts.</small>
        </label>

        <label style="display: flex; flex-direction: column; gap: 0.4rem; font-weight: 700;">
          GST / Tax Rate (%)
          <input type="number" class="search-input" [(ngModel)]="draft.gst" placeholder="18" />
          <small style="color: var(--muted); font-weight: normal;">Statutory government tax rate applied to food delivery services.</small>
        </label>

        <div *ngIf="savedMessage" class="status-chip green" style="align-self: flex-start;">
          ✓ {{ savedMessage }}
        </div>
      </div>

      <!-- Features Tab -->
      <div *ngIf="tab() === 'FEATURES'" style="display: flex; flex-direction: column; gap: 1rem; max-width: 650px;">
        <h3 style="margin: 0 0 0.5rem;">Operational Feature Gates</h3>

        <div
          *ngFor="let t of draft.toggles; let i = index"
          class="card"
          style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border: 1px solid var(--line);"
        >
          <div>
            <strong style="display: block; font-size: 0.95rem;">{{ t.label }}</strong>
            <small style="color: var(--muted);">{{ getFeatureDescription(t.label) }}</small>
          </div>
          <button
            type="button"
            class="switch"
            [class.off]="!t.on"
            (click)="toggleFeature(i)"
            style="cursor: pointer;"
          ></button>
        </div>
      </div>

      <!-- Notifications Tab -->
      <div *ngIf="tab() === 'NOTIFICATIONS'" style="display: flex; flex-direction: column; gap: 1rem; max-width: 650px;">
        <h3 style="margin: 0 0 0.5rem;">Alerting & Notification Channels</h3>

        <div
          *ngFor="let n of draft.notifications; let i = index"
          class="card"
          style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border: 1px solid var(--line);"
        >
          <div>
            <strong style="display: block; font-size: 0.95rem;">{{ n.label }}</strong>
            <small style="color: var(--muted);">Real-time alerts for orders, status transitions, and critical events.</small>
          </div>
          <button
            type="button"
            class="switch"
            [class.off]="!n.on"
            (click)="toggleNotification(i)"
            style="cursor: pointer;"
          ></button>
        </div>
      </div>

      <!-- Security / Audit Log Tab -->
      <div *ngIf="tab() === 'AUDIT'">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <div>
            <h3 style="margin: 0;">Security & Administrative Audit Trail</h3>
            <p style="margin: 0.25rem 0 0; color: var(--muted); font-size: 0.85rem;">Immutable chronological record of approvals, status overrides, and system changes.</p>
          </div>
          <span class="status-chip green">{{ auditLogs().length }} Audit Records</span>
        </div>

        <div class="table-responsive">
          <table class="admin-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="text-align: left; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 0.85rem;">
                <th style="padding: 0.85rem 1rem;">Timestamp</th>
                <th style="padding: 0.85rem 1rem;">Category</th>
                <th style="padding: 0.85rem 1rem;">Action</th>
                <th style="padding: 0.85rem 1rem;">Admin User</th>
                <th style="padding: 0.85rem 1rem;">Details</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of auditLogs()" style="border-bottom: 1px solid var(--line);">
                <td style="padding: 1rem; white-space: nowrap; font-size: 0.85rem; color: var(--muted);">
                  {{ log.timestamp }}
                </td>
                <td style="padding: 1rem;">
                  <span class="status-chip blue" style="font-size: 0.72rem; padding: 0.2rem 0.5rem;">
                    {{ log.category }}
                  </span>
                </td>
                <td style="padding: 1rem; font-weight: 700;">{{ log.action }}</td>
                <td style="padding: 1rem; font-weight: 600;">{{ log.adminName }}</td>
                <td style="padding: 1rem; font-size: 0.88rem; color: var(--text);">{{ log.details }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </article>
  `,
  styleUrl: './admin-pages.scss',
})
export class AdminSettingsPageComponent {
  private readonly admin = inject(AdminDashboardService);

  readonly tab = signal<'GENERAL' | 'BUSINESS' | 'FEATURES' | 'NOTIFICATIONS' | 'AUDIT'>('GENERAL');
  draft: AdminSettings;
  savedMessage = '';

  readonly auditLogs = computed(() => this.admin.auditLogs());

  constructor() {
    this.draft = { ...this.admin.dashboard().settings };
  }

  getFeatureDescription(label: string): string {
    switch (label) {
      case 'Live Order Tracking': return 'GPS coordinates streaming on active delivery routes';
      case 'Scheduled Orders': return 'Allows pre-ordering food up to 48 hours in advance';
      case 'Loyalty Program': return 'Reward coins and tiered points on repeated orders';
      case 'Promo Codes': return 'Enable voucher validation during cart checkout';
      case 'Rating & Reviews': return 'Allow verified diners to leave ratings and text reviews';
      case 'Chat Support': return 'Live interactive messaging between customer and operations';
      default: return 'System feature toggle';
    }
  }

  toggleFeature(index: number): void {
    this.draft.toggles[index].on = !this.draft.toggles[index].on;
    this.admin.toggleFeature(index);
    this.showSaved('Feature updated');
  }

  toggleNotification(index: number): void {
    this.draft.notifications[index].on = !this.draft.notifications[index].on;
    this.admin.toggleNotification(index);
    this.showSaved('Notification preference updated');
  }

  saveAll(): void {
    this.admin.updateSettings({
      platformName: this.draft.platformName,
      supportEmail: this.draft.supportEmail,
      supportPhone: this.draft.supportPhone,
      deliveryFee: Number(this.draft.deliveryFee),
      commission: Number(this.draft.commission),
      gst: Number(this.draft.gst),
    });
    this.showSaved('All settings successfully saved and persisted.');
  }

  private showSaved(msg: string): void {
    this.savedMessage = msg;
    setTimeout(() => {
      this.savedMessage = '';
    }, 3000);
  }
}
