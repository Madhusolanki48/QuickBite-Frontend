import { NgFor, NgIf } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { NotificationBellComponent } from '../components/notification-bell.component';
import { RoleTopbarMenuComponent } from '../components/role-topbar-menu.component';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { SessionService } from '../services/session.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-admin-layout',
  imports: [
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
            <small>Ops Command</small>
          </span>
        </a>

        <nav class="admin-nav" aria-label="Admin navigation">
          <div class="nav-group" *ngFor="let group of navigation()">
            <span class="nav-group__title">{{ group.title }}</span>
            <a
              *ngFor="let item of group.items"
              [routerLink]="item.route"
              routerLinkActive="active"
              class="nav-link"
            >
              <span class="nav-link__icon">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
              <span class="nav-link__count" *ngIf="item.count">{{ item.count }}</span>
            </a>
          </div>
        </nav>

        <div class="sidebar-brief">
          <span class="live-dot"></span>
          <strong>{{ admin.dashboard().pendingOrders }} active orders</strong>
          <small>{{ admin.pendingApprovalCount() }} approvals waiting</small>
        </div>
      </aside>

      <div class="admin-workspace">
        <header class="admin-topbar">
          <label class="search-shell">
            <span>Search</span>
            <input type="search" placeholder="Orders, restaurants, agents, customers" />
          </label>

          <div class="topbar-status">
            <span class="status-chip green">Live</span>
            <span>{{ admin.dashboard().activeRestaurants }} restaurants online</span>
          </div>

          <div class="topbar-actions">
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
    {
      title: 'Dashboard',
      items: [
        { label: 'Overview', route: '/admin/dashboard', icon: 'OV' },
        { label: 'Analytics', route: '/admin/dashboard', icon: 'AN' },
        { label: 'Live Activity', route: '/admin/orders', icon: 'LA', count: this.admin.dashboard().pendingOrders },
      ],
    },
    {
      title: 'Orders',
      items: [
        { label: 'Live Orders', route: '/admin/orders', icon: 'LO', count: this.admin.dashboard().totalOrdersCount },
        { label: 'Order History', route: '/admin/orders', icon: 'OH' },
        { label: 'Refund Requests', route: '/admin/orders', icon: 'RR' },
      ],
    },
    {
      title: 'Restaurants',
      items: [
        { label: 'All Restaurants', route: '/admin/restaurants', icon: 'AR' },
        { label: 'Approval Requests', route: '/admin/customers', icon: 'AP', count: this.admin.pendingApprovalCount() },
        { label: 'Performance', route: '/admin/restaurants', icon: 'PF' },
        { label: 'Reviews', route: '/admin/dashboard', icon: 'RV' },
      ],
    },
    {
      title: 'Delivery Agents',
      items: [
        { label: 'Active Agents', route: '/admin/delivery-agents', icon: 'AA' },
        { label: 'Tracking', route: '/admin/delivery-agents', icon: 'TR' },
        { label: 'Performance', route: '/admin/delivery-agents', icon: 'DP' },
        { label: 'Payouts', route: '/admin/delivery-agents', icon: 'PO' },
      ],
    },
    {
      title: 'Customers',
      items: [
        { label: 'Active Users', route: '/admin/customers', icon: 'CU' },
        { label: 'Complaints', route: '/admin/customers', icon: 'CP' },
        { label: 'Reports', route: '/admin/customers', icon: 'RP' },
      ],
    },
    {
      title: 'Finance & Growth',
      items: [
        { label: 'Revenue', route: '/admin/dashboard', icon: 'RE' },
        { label: 'Transactions', route: '/admin/orders', icon: 'TX' },
        { label: 'Coupons', route: '/admin/settings', icon: 'CO' },
        { label: 'Settings', route: '/admin/settings', icon: 'ST' },
      ],
    },
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
