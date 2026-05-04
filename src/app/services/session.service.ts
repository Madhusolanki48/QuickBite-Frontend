import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AppRole, AuthResponse, AuthUser } from '../core/app.models';

const TOKEN_KEY = 'quickbite.token';
const USER_KEY = 'quickbite.user';
const PENDING_ROLE_KEY = 'quickbite.pendingRole';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly userSignal = signal<AuthUser | null>(this.readUser());
  private readonly tokenSignal = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly pendingRoleSignal = signal<AppRole | null>(this.readPendingRole());

  readonly user = computed(() => this.userSignal());
  readonly token = computed(() => this.tokenSignal());
  readonly pendingRole = computed(() => this.pendingRoleSignal());

  constructor(private readonly router: Router) {}

  isAuthenticated(): boolean {
    return Boolean(this.tokenSignal());
  }

  startSession(response: AuthResponse): void {
    this.tokenSignal.set(response.token);
    this.userSignal.set(response.user);
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this.clearPendingRole();
  }

  logout(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.clearPendingRole();
    void this.router.navigate(['/login']);
  }

  setPendingRole(role: AppRole): void {
    this.pendingRoleSignal.set(role);
    localStorage.setItem(PENDING_ROLE_KEY, role);
  }

  clearPendingRole(): void {
    this.pendingRoleSignal.set(null);
    localStorage.removeItem(PENDING_ROLE_KEY);
  }

  dashboardRouteFor(role: AppRole | null | undefined): string {
    switch (role) {
      case 'RESTAURANT_OWNER':
        return '/owner/live-orders';
      case 'DELIVERY_PARTNER':
        return '/delivery/my-deliveries';
      case 'ADMIN':
        return '/admin/dashboard';
      case 'CUSTOMER':
      default:
        return '/home';
    }
  }

  private readUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  private readPendingRole(): AppRole | null {
    return (localStorage.getItem(PENDING_ROLE_KEY) as AppRole | null) ?? null;
  }
}
