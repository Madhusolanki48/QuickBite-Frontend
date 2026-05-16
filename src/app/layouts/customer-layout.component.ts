import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { NotificationBellComponent } from '../components/notification-bell.component';
import { RoleTopbarMenuComponent } from '../components/role-topbar-menu.component';
import { SessionService } from '../services/session.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-customer-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NotificationBellComponent, RoleTopbarMenuComponent],
  template: `
    <div class="min-h-dvh">
      <header class="sticky top-3 z-40 w-full px-3 pt-3">
        <div
          class="flex flex-col gap-3 rounded-[28px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 shadow-glow backdrop-blur-xl md:flex-row md:items-center md:justify-between"
        >
          <a routerLink="/home" class="flex items-center gap-3">
            <span
              class="grid h-12 w-12 place-items-center overflow-hidden rounded-[18px] bg-gradient-to-br from-brand to-orange-500 shadow-soft"
            >
              <img
                src="/assets/images/logo/logo.png?v=20260428"
                alt="QuickBite logo"
                class="h-full w-full object-cover"
              />
            </span>
            <span class="flex flex-col leading-tight">
              <strong class="font-['Space_Grotesk'] text-lg tracking-[-0.04em] text-ink">QuickBite</strong>
            <small class="text-sm text-[var(--muted)]">Premium food delivery</small>
          </span>
        </a>

          <nav class="flex items-center gap-2 overflow-x-auto pb-1 md:justify-center md:pb-0">
            <a
              routerLink="/home"
              routerLinkActive="bg-white text-brand shadow-soft"
              [routerLinkActiveOptions]="{ exact: true }"
              class="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:-translate-y-0.5 hover:bg-white hover:text-brand"
            >
              Home
            </a>
            <a
              routerLink="/cart"
              routerLinkActive="bg-white text-brand shadow-soft"
              class="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:-translate-y-0.5 hover:bg-white hover:text-brand"
            >
              Cart
            </a>
            <a
              routerLink="/favorites"
              routerLinkActive="bg-white text-brand shadow-soft"
              class="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:-translate-y-0.5 hover:bg-white hover:text-brand"
            >
              Favorites
            </a>
            <a
              routerLink="/orders"
              routerLinkActive="bg-white text-brand shadow-soft"
              class="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:-translate-y-0.5 hover:bg-white hover:text-brand"
            >
              Orders
            </a>
          </nav>

          <div class="flex items-center gap-2">
            <app-notification-bell />

            <button
              type="button"
              class="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] transition hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand"
              (click)="toggleTheme()"
              [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
            >
              {{ theme.theme() === 'dark' ? '☀' : '☾' }}
            </button>

            <app-role-topbar-menu
              [displayName]="displayName()"
              [roleLabel]="roleLabel()"
              [avatarSrc]="'/assets/images/avatar/user%20avatar.jpg'"
              [avatarInitial]="avatarInitial()"
              [items]="[
                { label: 'My Profile', route: '/profile' },
                { label: 'Saved Addresses', route: '/addresses' },
                { label: 'Orders', route: '/orders' }
              ]"
              (logoutClick)="logout()"
            />
          </div>
        </div>
      </header>

        <main class="w-full px-3 pb-8 pt-4 text-[var(--text)]">
          <router-outlet />
        </main>
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
