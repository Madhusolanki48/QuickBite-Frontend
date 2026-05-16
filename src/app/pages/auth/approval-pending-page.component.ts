import { NgIf } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-approval-pending-page',
  imports: [NgIf],
  template: `
    <section class="card auth-card pending-card">
      <div class="auth-card__backdrop"></div>
      <div class="auth-card__header">
        <p class="eyebrow">Approval Pending</p>
        <h2>{{ heading() }}</h2>
        <p>{{ subheading() }}</p>
      </div>

      <div class="pending-summary">
        <div>
          <strong>{{ displayName() }}</strong>
          <span>{{ roleLabel() }}</span>
        </div>
        <p>{{ bodyMessage() }}</p>
        <p *ngIf="restaurantId()">Restaurant ID: {{ restaurantId() }}</p>
      </div>

      <button class="primary login-cta" type="button" (click)="logout()">Logout</button>
    </section>
  `,
  styleUrl: './auth-pages.scss',
})
export class ApprovalPendingPageComponent {
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);

  protected readonly user = computed(() => this.session.user());
  protected readonly heading = computed(() => {
    const role = this.roleLabel();
    return `${role} account pending approval`;
  });
  protected readonly subheading = computed(() =>
    this.session.user()
      ? 'Your email is verified, but an admin still needs to approve this account.'
      : 'Your account is waiting for admin approval.',
  );
  protected readonly displayName = computed(() => {
    const user = this.session.user();
    const queryName = this.route.snapshot.queryParamMap.get('name') ?? '';
    if (!user && queryName) {
      return queryName;
    }
    return user ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'Account';
  });
  protected readonly roleLabel = computed(() => {
    const queryRole = this.route.snapshot.queryParamMap.get('role') ?? 'RESTAURANT_OWNER';
    const role = this.session.user()?.role ?? queryRole;
    return role
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  });
  protected readonly bodyMessage = computed(() => {
    const user = this.session.user();
    if (user?.approvalStatus === 'PENDING' || this.route.snapshot.queryParamMap.get('pending') === '1') {
      return 'Your account is verified, but it is waiting for admin approval.';
    }

    return 'You can sign in again after approval is completed.';
  });
  protected readonly restaurantId = computed(() =>
    this.session.user()?.restaurantId ?? this.route.snapshot.queryParamMap.get('restaurantId') ?? '',
  );

  logout(): void {
    this.session.logout();
  }
}
