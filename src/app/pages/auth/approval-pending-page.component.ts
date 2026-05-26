import { CommonModule, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthApiService } from '../../services/auth-api.service';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-approval-pending-page',
  standalone: true,
  imports: [CommonModule, NgIf],
  template: `
    <div class="approval-container">
      <section class="card auth-card approval-card" [class.approval-card--rejected]="isRejected()">
        <div class="auth-card__backdrop"></div>

        <!-- Status Icon Banner -->
        <div class="status-indicator">
          <div *ngIf="!isRejected()" class="status-icon pending">
            <span>⏳</span>
          </div>
          <div *ngIf="isRejected()" class="status-icon rejected">
            <span>⚠️</span>
          </div>
        </div>

        <div class="auth-card__header">
          <p class="eyebrow" [style.color]="isRejected() ? '#ef4444' : '#f59e0b'">
            {{ isRejected() ? 'Action Required' : 'Application Under Review' }}
          </p>
          <h2>{{ isRejected() ? 'Application Needs Correction' : 'Your account is being verified' }}</h2>
          <p>
            {{ isRejected()
                ? 'The QuickBite administration team reviewed your application and requested updates before approval.'
                : 'Thank you for onboarding with QuickBite. Our team typically verifies new partner kitchens & drivers within 1-2 hours.' }}
          </p>
        </div>

        <!-- Rejection Reason Highlight Box -->
        <div *ngIf="isRejected()" class="rejection-box">
          <div class="rejection-box__header">
            <strong>Admin Review Feedback:</strong>
          </div>
          <p class="rejection-box__reason">
            {{ user()?.rejectionReason || 'Please review your application details, make necessary updates, and resubmit for verification.' }}
          </p>
        </div>

        <!-- Applicant Summary Card -->
        <div class="applicant-details">
          <div class="detail-row">
            <span class="label">Applicant</span>
            <span class="value">{{ displayName() }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Role</span>
            <span class="value role-badge">{{ roleLabel() }}</span>
          </div>
          <div class="detail-row" *ngIf="user()?.email">
            <span class="label">Email</span>
            <span class="value">{{ user()?.email }}</span>
          </div>
          <div class="detail-row" *ngIf="user()?.phoneNumber">
            <span class="label">Phone</span>
            <span class="value">{{ user()?.phoneNumber }}</span>
          </div>
          <div class="detail-row" *ngIf="user()?.restaurantName">
            <span class="label">Restaurant</span>
            <span class="value">{{ user()?.restaurantName }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Current Status</span>
            <span class="value status-badge" [class.badge-rejected]="isRejected()" [class.badge-pending]="!isRejected()">
              {{ isRejected() ? 'REJECTED' : 'PENDING APPROVAL' }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="actions-stack">
          <!-- If Rejected: Resubmit CTA -->
          <button
            *ngIf="isRejected()"
            type="button"
            class="primary action-btn-large"
            (click)="editAndResubmit()"
          >
            ✏️ Edit Application & Resubmit
          </button>

          <!-- If Pending: Check Status CTA -->
          <button
            *ngIf="!isRejected()"
            type="button"
            class="primary action-btn-large"
            [disabled]="refreshing()"
            (click)="refreshStatus()"
          >
            {{ refreshing() ? 'Checking status...' : '🔄 Refresh Approval Status' }}
          </button>

          <!-- If Pending: Edit details option -->
          <button
            *ngIf="!isRejected()"
            type="button"
            class="secondary action-btn-large"
            (click)="editAndResubmit()"
          >
            ✏️ Edit Submitted Details
          </button>

          <button
            type="button"
            class="ghost-link"
            (click)="logout()"
          >
            Sign out of this account
          </button>
        </div>

        <p *ngIf="statusMessage()" class="status-toast" [class.error]="statusIsError()">
          {{ statusMessage() }}
        </p>
      </section>
    </div>
  `,
  styles: [`
    .approval-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      background: radial-gradient(circle at top, rgba(255, 90, 0, 0.08), transparent 60%), #0f1015;
    }
    .approval-card {
      max-width: 540px;
      width: 100%;
      margin: 0 auto;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 2.25rem;
      background: rgba(22, 24, 32, 0.95);
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      text-align: center;
    }
    .approval-card--rejected {
      border-color: rgba(239, 68, 68, 0.35);
    }
    .status-indicator {
      display: flex;
      justify-content: center;
      margin-bottom: 1.25rem;
    }
    .status-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
    }
    .status-icon.pending {
      background: rgba(245, 158, 11, 0.15);
      border: 2px solid rgba(245, 158, 11, 0.4);
    }
    .status-icon.rejected {
      background: rgba(239, 68, 68, 0.15);
      border: 2px solid rgba(239, 68, 68, 0.4);
    }
    .rejection-box {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 12px;
      padding: 1.15rem;
      margin: 1.5rem 0;
      text-align: left;
    }
    .rejection-box__header {
      font-size: 0.9rem;
      color: #ef4444;
      font-weight: 700;
      margin-bottom: 0.35rem;
    }
    .rejection-box__reason {
      font-size: 0.95rem;
      color: #fca5a5;
      line-height: 1.5;
      margin: 0;
    }
    .applicant-details {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 1.25rem;
      margin: 1.5rem 0;
      text-align: left;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.9rem;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-row .label {
      color: #9ca3af;
    }
    .detail-row .value {
      color: #fff;
      font-weight: 600;
    }
    .role-badge {
      background: rgba(255, 90, 0, 0.15);
      color: #ff5a00;
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-size: 0.8rem;
    }
    .status-badge {
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .badge-pending {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }
    .badge-rejected {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    .actions-stack {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
    .action-btn-large {
      padding: 0.85rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .ghost-link {
      background: transparent;
      border: none;
      color: #9ca3af;
      font-size: 0.9rem;
      cursor: pointer;
      text-decoration: underline;
      padding: 0.5rem;
    }
    .ghost-link:hover {
      color: #fff;
    }
    .status-toast {
      margin-top: 1rem;
      padding: 0.6rem;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      font-size: 0.88rem;
    }
    .status-toast.error {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
    }
  `],
})
export class ApprovalPendingPageComponent {
  private readonly session = inject(SessionService);
  private readonly auth = inject(AuthApiService);
  private readonly router = inject(Router);

  protected readonly user = computed(() => this.session.user());
  protected readonly refreshing = signal(false);
  protected readonly statusMessage = signal('');
  protected readonly statusIsError = signal(false);

  protected isRejected(): boolean {
    return this.user()?.approvalStatus === 'REJECTED';
  }

  protected displayName(): string {
    const u = this.user();
    if (!u) return 'Account Applicant';
    return `${u.firstName} ${u.lastName ?? ''}`.trim() || u.username || 'Applicant';
  }

  protected roleLabel(): string {
    const role = this.user()?.role;
    if (role === 'RESTAURANT_OWNER') return 'Restaurant Partner';
    if (role === 'DELIVERY_PARTNER') return 'Delivery Partner';
    return 'Partner';
  }

  refreshStatus(): void {
    this.refreshing.set(true);
    this.statusMessage.set('');
    this.auth.getCurrentUser().subscribe({
      next: (updatedUser) => {
        this.session.replaceUser(updatedUser);
        this.refreshing.set(false);
        if (updatedUser.approvalStatus === 'APPROVED') {
          this.statusIsError.set(false);
          this.statusMessage.set('🎉 Congratulations! Your account has been approved.');
          const nextRoute = this.session.routeAfterAuth(updatedUser);
          window.setTimeout(() => void this.router.navigateByUrl(nextRoute), 800);
        } else if (updatedUser.approvalStatus === 'REJECTED') {
          this.statusIsError.set(true);
          this.statusMessage.set('Application status updated to Rejected. Please review feedback.');
        } else {
          this.statusIsError.set(false);
          this.statusMessage.set('Status checked: Still under review. We appreciate your patience.');
        }
      },
      error: () => {
        this.refreshing.set(false);
        this.statusIsError.set(true);
        this.statusMessage.set('Could not fetch status update. Please try again shortly.');
      },
    });
  }

  editAndResubmit(): void {
    const role = this.user()?.role;
    if (role === 'RESTAURANT_OWNER') {
      void this.router.navigate(['/owner/onboarding']);
    } else if (role === 'DELIVERY_PARTNER') {
      void this.router.navigate(['/delivery/onboarding']);
    }
  }

  logout(): void {
    this.session.logout();
  }
}
