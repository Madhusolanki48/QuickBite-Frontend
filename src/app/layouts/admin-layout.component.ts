import { Component, computed, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { NotificationBellComponent } from '../components/notification-bell.component';
import { RoleTopbarMenuComponent } from '../components/role-topbar-menu.component';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { SessionService } from '../services/session.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-admin-layout',
  imports: [
    NgIf,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NotificationBellComponent,
    RoleTopbarMenuComponent,
  ],
  template: `
    <div class="shell admin-shell">
      <header class="topbar card">
        <a routerLink="/admin/dashboard" class="brand">
          <span class="brand-mark">
            <img src="/assets/images/logo/squre%20logo.png?v=20260428" alt="QuickBite logo" />
          </span>
          <span class="brand-wordmark">QuickBite</span>
        </a>

        <div class="topbar__actions">
          <button class="topbar-theme-toggle" type="button" (click)="toggleTheme()">
            {{ theme.theme() === 'dark' ? '☀' : '🌙' }}
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

      <section class="role-banner card admin-banner">
        <div class="role-banner__copy">
          <span class="role-banner__eyebrow">Admin</span>
          <h1>Monitor the whole platform with delivery, restaurant, and customer data in sync.</h1>
          <p>Use system settings, live maps, and summaries to keep every role connected.</p>
        </div>
      </section>

      <div class="workspace">
        <aside class="sidebar card">
          <div class="sidebar__group">
            <span class="sidebar__title">Overview</span>
            <a routerLink="/admin/dashboard" routerLinkActive="active" class="sidebar__link"
              >📊 Dashboard</a
            >
            <a routerLink="/admin/orders" routerLinkActive="active" class="sidebar__link"
              >📋 All Orders <span class="count">{{ admin.dashboard().totalOrdersCount }}</span></a
            >
          </div>
          <div class="sidebar__group">
            <span class="sidebar__title">Management</span>
            <a routerLink="/admin/restaurants" routerLinkActive="active" class="sidebar__link"
              >🏪 Restaurants</a
            >
            <a routerLink="/admin/delivery-agents" routerLinkActive="active" class="sidebar__link"
              >🚴 Delivery Agents</a
            >
            <a routerLink="/admin/customers" routerLinkActive="active" class="sidebar__link"
              >👥 Customers
              <span class="count" *ngIf="admin.pendingApprovalCount() > 0">{{
                admin.pendingApprovalCount()
              }}</span></a
            >
          </div>
          <div class="sidebar__group">
            <span class="sidebar__title">System</span>
            <a routerLink="/admin/settings" routerLinkActive="active" class="sidebar__link"
              >⚙ Settings</a
            >
          </div>
        </aside>

        <main class="content">
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
