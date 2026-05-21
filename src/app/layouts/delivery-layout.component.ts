import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { NotificationBellComponent } from '../components/notification-bell.component';
import { RoleTopbarMenuComponent } from '../components/role-topbar-menu.component';
import { DeliveryDashboardService } from '../services/delivery-dashboard.service';
import { SessionService } from '../services/session.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-delivery-layout',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NotificationBellComponent,
    RoleTopbarMenuComponent,
  ],
  template: `
    <div class="shell delivery-shell">
      <header class="topbar card delivery-topbar">
        <a routerLink="/delivery/my-deliveries" class="brand">
          <span class="brand-mark">
            <img src="/assets/images/logo/logo.png" alt="QuickBite logo" />
          </span>
          <span>
            <span class="brand-wordmark">QuickBite</span>
            <small>Delivery Partner</small>
          </span>
        </a>

        <div class="topbar-live" aria-label="Delivery live status">
          <span class="pulse-dot" [class.off]="!dashboard.isOnline()"></span>
          <strong>{{ dashboard.isOnline() ? 'Online' : 'Offline' }}</strong>
          <button class="toggle mini" type="button" [class.off]="!dashboard.isOnline()" (click)="toggleOnline()">
            <span></span>
          </button>
        </div>

        <div class="topbar-ops">
          <span class="ops-pill gps"><b>GPS</b> Strong</span>
          <span class="ops-pill">Delhi Central</span>
          <span class="ops-pill">29 C Clear</span>
          <span class="ops-pill">{{ dashboard.earnings().today }} today</span>
          <span class="ops-pill streak">7 day streak</span>
          <span class="device-bars" aria-label="Battery and network status">
            <i></i><i></i><i></i><b>82%</b>
          </span>
        </div>

        <div class="topbar__actions">
          <button class="quick-top-action" type="button">SOS</button>
          <button
            class="topbar-theme-toggle theme-toggle-control"
            type="button"
            (click)="toggleTheme()"
            [attr.aria-label]="
              theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
            "
          >
            <span class="theme-toggle-control__icon">{{
              theme.theme() === 'dark' ? '☀' : '☾'
            }}</span>
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

      <div class="workspace">
        <aside class="sidebar card">
          <div class="sidebar__group">
            <span class="sidebar__title">Operations</span>
            <a routerLink="/delivery/my-deliveries" routerLinkActive="active" class="sidebar__link"
              >Dashboard <span class="count">{{ dashboard.activeDeliveries().length || 3 }}</span></a
            >
          </div>
          <div class="sidebar__group">
            <span class="sidebar__title">Records</span>
            <a routerLink="/delivery/history" routerLinkActive="active" class="sidebar__link"
              >History</a
            >
          </div>
          <div class="sidebar__group">
            <span class="sidebar__title">Money</span>
            <a routerLink="/delivery/earnings" routerLinkActive="active" class="sidebar__link"
              >Earnings</a
            >
          </div>
          <div class="sidebar__group">
            <span class="sidebar__title">Settings</span>
            <a routerLink="/delivery/profile" routerLinkActive="active" class="sidebar__link"
              >Profile & Support</a
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
  protected readonly dashboard = inject(DeliveryDashboardService);
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

  protected toggleOnline(): void {
    this.dashboard.toggleOnline();
  }
}
