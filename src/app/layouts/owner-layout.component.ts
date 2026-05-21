import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { NotificationBellComponent } from '../components/notification-bell.component';
import { RoleTopbarMenuComponent } from '../components/role-topbar-menu.component';
import { OwnerDashboardService } from '../services/owner-dashboard.service';
import { SessionService } from '../services/session.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-owner-layout',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NotificationBellComponent,
    RoleTopbarMenuComponent,
  ],
  template: `
    <div class="shell owner-shell">
      <header class="topbar card">
        <a routerLink="/owner/live-orders" class="brand">
          <span class="brand-mark">
            <img src="/assets/images/logo/logo.png" alt="QuickBite logo" />
          </span>
          <span class="brand-copy">
            <strong>QuickBite</strong>
            <small>Partner Studio</small>
          </span>
        </a>

        <div class="owner-search">
          <span aria-hidden="true">&#128269;</span>
          <input placeholder="Search orders, dishes, customers..." />
        </div>

        <div class="topbar__actions">
          <span class="topbar-badge status-live">
            {{ dashboard.restaurantProfile().open ? 'Open now' : 'Closed' }}
          </span>
          <span class="topbar-badge">Today {{ revenueToday() }}</span>
          <span class="topbar-badge">{{ activeOrders() }} live</span>
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
            [roleLabel]="'Restaurant Owner'"
            [avatarSrc]="'/assets/images/avatar/chef%20avatar.jpg'"
            [avatarInitial]="avatarInitial()"
            [items]="[
              { label: 'Restaurant Profile', route: '/owner/profile' },
              { label: 'Hours & Status', route: '/owner/hours-status' },
              { label: 'Analytics', route: '/owner/analytics' },
            ]"
            (logoutClick)="logout()"
          />
        </div>
      </header>

      <section class="owner-hero card">
        <div class="owner-hero__copy">
          <span class="role-banner__eyebrow">Restaurant Owner</span>
          <h1>Welcome back, {{ dashboard.restaurantProfile().name }}</h1>
          <p>
            Manage rush-hour orders, menu performance, delivery handoffs, and restaurant health
            from one premium cockpit.
          </p>
          <div class="owner-hero__metrics">
            <span><strong>{{ revenueToday() }}</strong><small>Revenue today</small></span>
            <span><strong>{{ activeOrders() }}</strong><small>Active orders</small></span>
            <span><strong>{{ rating() }}</strong><small>Avg rating</small></span>
          </div>
          <div class="owner-hero__actions">
            <a routerLink="/owner/live-orders" class="hero-cta hero-cta--primary">View Orders</a>
            <a routerLink="/owner/menu-manager" class="hero-cta">Add Menu Item</a>
          </div>
        </div>
        <div class="owner-hero__visual">
          <img src="/assets/images/hero-banners/burger-deal.png" alt="Food banner" />
          <div class="owner-hero__overlay">
            <span>Peak kitchen window</span>
            <strong>{{ dashboard.analytics().peakHour }}</strong>
          </div>
        </div>
      </section>

      <div class="workspace">
        <aside class="sidebar card">
          <div class="sidebar__group">
            <span class="sidebar__title">Restaurant</span>
            <a routerLink="/owner/live-orders" routerLinkActive="active" class="sidebar__link">
              <span>Dashboard</span>
            </a>
            <a routerLink="/owner/live-orders" routerLinkActive="active" class="sidebar__link">
              <span>Live Orders</span><span class="count">{{ activeOrders() }}</span>
            </a>
            <a routerLink="/owner/menu-manager" routerLinkActive="active" class="sidebar__link">
              <span>Menu Manager</span>
            </a>
            <a routerLink="/owner/analytics" routerLinkActive="active" class="sidebar__link">
              <span>Analytics</span>
            </a>
            <a routerLink="/owner/analytics" routerLinkActive="active" class="sidebar__link">
              <span>Reviews</span>
            </a>
            <a routerLink="/owner/live-orders" routerLinkActive="active" class="sidebar__link">
              <span>Delivery Tracking</span>
            </a>
            <a routerLink="/owner/menu-manager" routerLinkActive="active" class="sidebar__link">
              <span>Promotions</span>
            </a>
            <a routerLink="/owner/profile" routerLinkActive="active" class="sidebar__link">
              <span>Settings</span>
            </a>
          </div>
        </aside>

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styleUrl: './owner-layout.component.scss',
})
export class OwnerLayoutComponent {
  protected readonly dashboard = inject(OwnerDashboardService);
  private readonly session = inject(SessionService);
  protected readonly theme = inject(ThemeService);

  protected readonly activeOrders = computed(() => this.dashboard.liveOrders().length);
  protected readonly revenueToday = computed(() => this.dashboard.analytics().revenueToday);
  protected readonly rating = computed(() => this.dashboard.analytics().avgRating);

  protected readonly displayName = computed(() => {
    const user = this.session.user();
    return user ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'Owner';
  });

  protected readonly avatarInitial = computed(() => {
    const user = this.session.user();
    return user ? user.firstName.charAt(0).toUpperCase() : 'R';
  });

  protected logout(): void {
    this.session.logout();
  }

  protected toggleTheme(): void {
    this.theme.toggle();
  }
}
