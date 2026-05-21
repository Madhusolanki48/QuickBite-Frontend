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
    <div class="customer-shell">
      <header class="customer-topbar">
        <div class="topbar-inner">
          <a routerLink="/home" class="brand-link">
            <span class="brand-mark">
              <img src="/assets/images/logo/logo.png?v=20260428" alt="QuickBite logo" />
            </span>
            <div class="brand-text">
              <strong>QuickBite</strong>
              <span>Premium food delivery</span>
            </div>
          </a>

          <nav class="topbar-nav" aria-label="Customer navigation">
            <a
              routerLink="/home"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              >Home</a
            >
            <a routerLink="/cart" routerLinkActive="active">Cart</a>
            <a routerLink="/favorites" routerLinkActive="active">Favorites</a>
            <a routerLink="/orders" routerLinkActive="active">Orders</a>
          </nav>

          <div class="topbar-actions">
            <app-notification-bell />
            <button
              type="button"
              class="icon-button theme-toggle-control"
              (click)="toggleTheme()"
              [attr.aria-label]="
                theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
              "
            >
              <span class="theme-toggle-control__icon">{{
                theme.theme() === 'dark' ? '☀' : '☾'
              }}</span>
            </button>
            <app-role-topbar-menu
              [displayName]="displayName()"
              [roleLabel]="roleLabel()"
              [avatarSrc]="'/assets/images/avatar/user%20avatar.jpg'"
              [avatarInitial]="avatarInitial()"
              [items]="[
                { label: 'My Profile', route: '/profile' },
                { label: 'Saved Addresses', route: '/addresses' },
                { label: 'Orders', route: '/orders' },
              ]"
              (logoutClick)="logout()"
            />
          </div>
        </div>
      </header>

      <main class="customer-main">
        <router-outlet />
      </main>

      <nav class="mobile-bottom-nav" aria-label="Customer quick actions">
        <a routerLink="/home" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
          <span aria-hidden="true">⌂</span>
          <strong>Home</strong>
        </a>
        <a routerLink="/orders" routerLinkActive="active">
          <span aria-hidden="true">▤</span>
          <strong>Orders</strong>
        </a>
        <a routerLink="/favorites" routerLinkActive="active">
          <span aria-hidden="true">♡</span>
          <strong>Saved</strong>
        </a>
        <a routerLink="/cart" routerLinkActive="active">
          <span aria-hidden="true">🛒</span>
          <strong>Cart</strong>
        </a>
        <a routerLink="/profile" routerLinkActive="active">
          <span aria-hidden="true">♙</span>
          <strong>Profile</strong>
        </a>
      </nav>
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
