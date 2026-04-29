import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { NotificationBellComponent } from '../components/notification-bell.component';
import { RoleTopbarMenuComponent } from '../components/role-topbar-menu.component';
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
            [roleLabel]="'Restaurant Owner'"
            [avatarSrc]="'/assets/images/avatar/chef%20avatar.jpg'"
            [avatarInitial]="avatarInitial()"
            [items]="[
              { label: 'Restaurant Profile', route: '/owner/profile' },
              { label: 'Hours & Status', route: '/owner/hours-status' },
            ]"
            (logoutClick)="logout()"
          />
        </div>
      </header>

      <section class="role-banner card owner-banner">
        <div class="role-banner__copy">
          <span class="role-banner__eyebrow">Restaurant Owner</span>
          <h1>Keep menus, orders, hours, and live status aligned with customer demand.</h1>
          <p>Update open state, manage live orders, and track revenue from the same dashboard.</p>
        </div>
      </section>

      <div class="workspace">
        <aside class="sidebar card">
          <div class="sidebar__group">
            <span class="sidebar__title">Restaurant</span>
            <a routerLink="/owner/live-orders" routerLinkActive="active" class="sidebar__link"
              >📋 Live Orders <span class="count">3</span></a
            >
            <a routerLink="/owner/menu-manager" routerLinkActive="active" class="sidebar__link"
              >🍽️ Menu Manager</a
            >
            <a routerLink="/owner/analytics" routerLinkActive="active" class="sidebar__link"
              >📊 Analytics</a
            >
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
  private readonly session = inject(SessionService);
  protected readonly theme = inject(ThemeService);

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
