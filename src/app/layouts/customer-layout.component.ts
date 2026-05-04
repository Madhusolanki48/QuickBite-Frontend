import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { NotificationBellComponent } from '../components/notification-bell.component';
import { RoleTopbarMenuComponent } from '../components/role-topbar-menu.component';
import { SessionService } from '../services/session.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-customer-layout',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NotificationBellComponent,
    RoleTopbarMenuComponent,
  ],
  template: `
    <div class="shell">
      <header class="topbar card">
        <a routerLink="/home" class="brand">
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
            [roleLabel]="roleLabel()"
            [avatarSrc]="'/assets/images/avatar/user%20avatar.jpg'"
            [avatarInitial]="avatarInitial()"
            [items]="[
              { label: 'My Profile', route: '/profile' },
              { label: 'Saved Addresses', route: '/addresses' },
            ]"
            (logoutClick)="logout()"
          />
        </div>
      </header>

      <div class="workspace">
        <aside class="sidebar card">
          <div class="sidebar__group">
            <span class="sidebar__title">Discover</span>
            <a routerLink="/home" routerLinkActive="active" class="sidebar__link">🏪 Restaurants</a>
            <a routerLink="/orders" routerLinkActive="active" class="sidebar__link">📋 My Orders</a>
            <a routerLink="/cart" routerLinkActive="active" class="sidebar__link">🛒 Cart</a>
          </div>
        </aside>

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styleUrl: './customer-layout.component.scss',
})
export class CustomerLayoutComponent {
  private readonly session = inject(SessionService);
  protected readonly theme = inject(ThemeService);

  protected readonly displayName = computed(() => {
    const user = this.session.user();
    return user ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'Customer';
  });

  protected readonly roleLabel = computed(() => {
    const role = this.session.user()?.role ?? 'CUSTOMER';
    return role
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  });

  protected readonly avatarInitial = computed(() => {
    const user = this.session.user();
    return user ? user.firstName.charAt(0).toUpperCase() : 'C';
  });

  protected logout(): void {
    this.session.logout();
  }

  protected toggleTheme(): void {
    this.theme.toggle();
  }
}
