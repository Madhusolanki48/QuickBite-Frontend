import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AppRole, AuthResponse, AuthUser } from '../core/app.models';

const AUTH_STORAGE_KEYS = [
  'quickbite.token',
  'quickbite.refreshToken',
  'quickbite.user',
  'quickbite.userRole',
  'quickbite.userApprovalStatus',
  'quickbite.userRestaurantId',
  'quickbite.userRestaurantName',
  'quickbite.pendingRole',
  'quickbite.customerProfile',
  'quickbite.owner.restaurantProfile',
  'quickbite.owner.analyticsPeriod',
  'quickbite.owner.analyticsCustomRange',
  'quickbite.owner.schedule',
  'quickbite.delivery.profile',
  'quickbite.delivery.historyPeriod',
  'quickbite.cart.items',
  'quickbite.addresses',
  'quickbite.selectedAddressId',
  'quickbite.notifications',
  'quickbite.orders.local',
  'quickbite.order.overrides',
  'quickbite.order.hidden',
  'quickbite.reviews',
  'quickbite.blockedUsers',
  'quickbite.sync.event',
];

const PENDING_ROLE_KEY = 'quickbite.pendingRole';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly userSignal = signal<AuthUser | null>(this.readUser());
  private readonly tokenSignal = signal<string | null>(this.readToken());
  private readonly pendingRoleSignal = signal<AppRole | null>(this.readPendingRole());

  readonly user = computed(() => this.userSignal());
  readonly token = computed(() => this.tokenSignal());
  readonly pendingRole = computed(() => this.pendingRoleSignal());

  constructor(private readonly router: Router) {}

  isAuthenticated(): boolean {
    return Boolean(this.tokenSignal());
  }

  startSession(response: AuthResponse): void {
    if (response.token) {
      this.tokenSignal.set(response.token);
      localStorage.setItem('quickbite.token', response.token);
    }

    this.userSignal.set(response.user);
    localStorage.setItem('quickbite.user', JSON.stringify(response.user));
    localStorage.setItem('quickbite.userRole', response.user.role);
    localStorage.setItem('quickbite.userApprovalStatus', response.user.approvalStatus ?? '');
    localStorage.setItem('quickbite.userRestaurantId', response.user.restaurantId ?? '');
    localStorage.setItem('quickbite.userRestaurantName', response.user.restaurantName ?? '');
    this.clearPendingRole();
  }

  replaceUser(user: AuthUser): void {
    this.userSignal.set(user);
    localStorage.setItem('quickbite.user', JSON.stringify(user));
    localStorage.setItem('quickbite.userRole', user.role);
    localStorage.setItem('quickbite.userApprovalStatus', user.approvalStatus ?? '');
    localStorage.setItem('quickbite.userRestaurantId', user.restaurantId ?? '');
    localStorage.setItem('quickbite.userRestaurantName', user.restaurantName ?? '');
  }

  logout(): void {
    this.clearAuthStorage();
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    void this.router.navigate(['/login'], { queryParams: { logout: '1' } });
  }

  setPendingRole(role: AppRole): void {
    this.pendingRoleSignal.set(role);
    localStorage.setItem(PENDING_ROLE_KEY, role);
  }

  clearPendingRole(): void {
    this.pendingRoleSignal.set(null);
    localStorage.removeItem(PENDING_ROLE_KEY);
  }

  routeAfterAuth(user: AuthUser | null | undefined): string {
    if (!user) {
      return '/login';
    }

    if ((user.role === 'RESTAURANT_OWNER' || user.role === 'DELIVERY_PARTNER') && user.approvalStatus === 'PENDING') {
      return '/approval-pending';
    }

    switch (user.role) {
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

  dashboardRouteFor(role: AppRole | null | undefined): string {
    return this.routeAfterAuth(role ? ({ role } as AuthUser) : null);
  }

  private readUser(): AuthUser | null {
    const raw = localStorage.getItem('quickbite.user');
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
    return (localStorage.getItem('quickbite.pendingRole') as AppRole | null) ?? null;
  }

  private readToken(): string | null {
    return localStorage.getItem('quickbite.token');
  }

  private clearAuthStorage(): void {
    AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    this.pendingRoleSignal.set(null);
    localStorage.removeItem(PENDING_ROLE_KEY);
  }
}
