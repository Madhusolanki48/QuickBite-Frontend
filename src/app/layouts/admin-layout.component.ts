import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { NotificationBellComponent } from '../components/notification-bell.component';
import { RoleTopbarMenuComponent } from '../components/role-topbar-menu.component';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { SessionService } from '../services/session.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    NgFor,
    NgIf,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NotificationBellComponent,
    RoleTopbarMenuComponent,
  ],
  template: `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <a routerLink="/admin/dashboard" class="admin-brand">
          <span class="brand-mark">
            <img src="/assets/images/logo/logo.png" alt="QuickBite logo" />
          </span>
          <span>
            <strong>QuickBite</strong>
            <small>Admin Command</small>
          </span>
        </a>

        <nav class="admin-nav" aria-label="Admin navigation">
          <div class="nav-single-list">
            <a
              *ngFor="let item of navigation()"
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.exact || false }"
              class="nav-link"
            >
              <span class="nav-link__icon">{{ item.icon }}</span>
              <span class="nav-link__label">{{ item.label }}</span>
              <span class="nav-link__count" *ngIf="item.count && item.count > 0">{{ item.count }}</span>
            </a>
          </div>
        </nav>

        <div class="sidebar-brief">
          <span class="live-dot"></span>
          <strong>{{ admin.activeOrdersCount() }} active orders</strong>
          <small>{{ admin.pendingApprovalCount() }} approvals waiting</small>
        </div>
      </aside>

      <div class="admin-workspace">
        <header class="admin-topbar">
          <div class="topbar-status">
            <span class="status-chip green">Live</span>
            <span>{{ admin.dashboard().activeRestaurants }} / {{ admin.dashboard().totalRestaurants }} restaurants online</span>
          </div>

          <div class="topbar-actions" style="margin-left: auto;">
            <button
              class="theme-toggle theme-toggle-control"
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
              [roleLabel]="'Admin'"
              [avatarSrc]="'/assets/images/avatar/admin%20avatar.jpg'"
              [avatarInitial]="avatarInitial()"
              [items]="[{ label: 'Settings', route: '/admin/settings' }]"
              (logoutClick)="logout()"
            />
          </div>
        </header>

        <main class="admin-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  private readonly session = inject(SessionService);
  protected readonly admin = inject(AdminDashboardService);
  protected readonly theme = inject(ThemeService);

  protected readonly navigation = computed(() => [
    { label: 'Overview', route: '/admin/dashboard', icon: '📊', exact: true },
    { label: 'Analytics', route: '/admin/analytics', icon: '📈' },
    { label: 'Orders', route: '/admin/orders', icon: '🛍️', count: this.admin.activeOrdersCount() },
    {
      label: 'Restaurants',
      route: '/admin/restaurants',
      icon: '🍽️',
      count: this.admin.pendingOwnerApprovals().length,
    },
    {
      label: 'Delivery Agents',
      route: '/admin/delivery-agents',
      icon: '🛵',
      count: this.admin.pendingDeliveryApprovals().length,
    },
    { label: 'Customers', route: '/admin/customers', icon: '👥' },
    { label: 'Payments & Revenue', route: '/admin/payments', icon: '💳' },
    { label: 'Refunds', route: '/admin/refunds', icon: '🔄', count: this.admin.pendingRefundsCount() },
    { label: 'Support', route: '/admin/support', icon: '💬', count: this.admin.openTicketsCount() },
    { label: 'Reviews', route: '/admin/reviews', icon: '⭐' },
    { label: 'Settings', route: '/admin/settings', icon: '⚙️' },
  ]);

  protected readonly displayName = computed(() => {
    const user = this.session.user();
    return user ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'Admin';
  });

  protected readonly avatarInitial = computed(() => {
    const user = this.session.user();
    return user ? user.firstName.charAt(0).toUpperCase() : 'A';
  });

  protected logout(): void {
    this.session.logout();
  }

  protected toggleTheme(): void {
    this.theme.toggle();
  }
}
