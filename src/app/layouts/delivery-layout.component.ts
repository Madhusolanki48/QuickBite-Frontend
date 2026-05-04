import { Component, computed, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { NotificationBellComponent } from '../components/notification-bell.component';
import { RoleTopbarMenuComponent } from '../components/role-topbar-menu.component';
import { DeliveryDashboardService } from '../services/delivery-dashboard.service';
import { SessionService } from '../services/session.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-delivery-layout',
  imports: [
    NgIf,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NotificationBellComponent,
    RoleTopbarMenuComponent,
  ],
  template: `
    <div class="shell delivery-shell">
      <header class="topbar card">
        <a routerLink="/delivery/my-deliveries" class="brand">
          <span class="brand-mark">
            <img src="/assets/images/logo/squre%20logo.png?v=20260428" alt="QuickBite logo" />
          </span>
          <span class="brand-wordmark">QuickBite</span>
        </a>

        <div class="topbar__actions">
          <button class="topbar-theme-toggle" type="button" (click)="toggleTheme()">
            <span *ngIf="theme.theme() === 'dark'">&#9728;</span>
            <span *ngIf="theme.theme() !== 'dark'">&#127769;</span>
          </button>
          <app-notification-bell />
          <app-role-topbar-menu
            [displayName]="displayName()"
            [roleLabel]="'Delivery Agent'"
            [avatarSrc]="'/assets/images/avatar/delivery%20boy%20avatar.jpg'"
            [avatarInitial]="avatarInitial()"
            [items]="[{ label: 'My Profile', route: '/delivery/profile' }]"
            (logoutClick)="logout()"
          />
        </div>
      </header>

      <section class="role-banner card delivery-banner">
        <div class="role-banner__copy">
          <span class="role-banner__eyebrow">Delivery Agent</span>
          <h1>Track live delivery routes, earnings, and availability without losing context.</h1>
          <p>Your GPS, orders, and history stay synced with the customer and restaurant flow.</p>
        </div>
      </section>

      <div class="workspace">
        <aside class="sidebar card">
          <div class="sidebar__group">
            <span class="sidebar__title">Deliveries</span>
            <a routerLink="/delivery/my-deliveries" routerLinkActive="active" class="sidebar__link"
              >&#128230; My Deliveries <span class="count">1</span></a
            >
            <a routerLink="/delivery/history" routerLinkActive="active" class="sidebar__link"
              >&#128196; History</a
            >
            <a routerLink="/delivery/earnings" routerLinkActive="active" class="sidebar__link"
              >&#128176; Earnings</a
            >
          </div>
        </aside>

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styleUrl: './delivery-layout.component.scss',
})
export class DeliveryLayoutComponent {
  private readonly session = inject(SessionService);
  private readonly dashboard = inject(DeliveryDashboardService);
  protected readonly theme = inject(ThemeService);

  constructor() {
    if (this.dashboard.isOnline()) {
      void this.dashboard.startTracking();
    }
  }

  protected readonly avatarInitial = computed(() => {
    const user = this.session.user();
    return user ? user.firstName.charAt(0).toUpperCase() : 'D';
  });

  protected readonly displayName = computed(() => {
    const user = this.session.user();
    return user ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'Delivery Agent';
  });

  protected logout(): void {
    this.session.logout();
  }

  protected toggleTheme(): void {
    this.theme.toggle();
  }
}
