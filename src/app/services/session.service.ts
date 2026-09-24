import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AppRole, AuthResponse, AuthUser } from '../core/app.models';

const AUTH_STORAGE_KEYS = [
  'quickbite.token',
  'quickbite.refreshToken',
  'quickbite.user',
  'quickbite.userRole',
  'quickbite.userApprovalStatus',
  'quickbite.userOnboardingStatus',
  'quickbite.userRestaurantId',
  'quickbite.userRestaurantName',
  'quickbite.pendingRole',
  // Cart items
  'quickbite.cart.items',
];

const PENDING_ROLE_KEY = 'quickbite.pendingRole';

const SEED_OWNER_RESTAURANTS: Record<string, { id: string; name: string }> = {
  'owner.urbanbites@quickbite.com': { id: 'urban-bites', name: 'Urban Bites' },
  'owner.crustco@quickbite.com': { id: 'crust-and-co', name: 'Crust & Co.' },
  'owner.royaltadka@quickbite.com': { id: 'royal-tadka', name: 'Royal Tadka' },
  'owner.wokbowl@quickbite.com': { id: 'wok-and-bowl', name: 'Wok & Bowl' },
  'owner.greenspoon@quickbite.com': { id: 'green-spoon', name: 'Green Spoon' },
  'owner.foodyard@quickbite.com': { id: 'the-food-yard', name: 'The Food Yard' },
};

const SEED_DELIVERY_AGENT_EMAILS = new Set([
  'agent1@quickbite.com',
  'agent2@quickbite.com',
  'agent3@quickbite.com',
  'agent4@quickbite.com',
]);

export function isExistingRestaurantOwner(user: AuthUser | null | undefined): boolean {
  if (!user || user.role !== 'RESTAURANT_OWNER') {
    return false;
  }
  const email = (user.email || '').toLowerCase().trim();
  if (SEED_OWNER_RESTAURANTS[email]) {
    return true;
  }
  // Has already completed onboarding and been associated with a restaurant
  if ((user.restaurantId || user.restaurantName) && user.onboardingStatus === 'COMPLETED') {
    return true;
  }
  return false;
}

export function isExistingDeliveryPartner(user: AuthUser | null | undefined): boolean {
  if (!user || user.role !== 'DELIVERY_PARTNER') {
    return false;
  }
  const email = (user.email || '').toLowerCase().trim();
  if (SEED_DELIVERY_AGENT_EMAILS.has(email)) {
    return true;
  }
  return user.onboardingStatus === 'COMPLETED';
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly router = inject(Router);

  private readonly tokenSignal = signal<string | null>(this.readToken());
  private readonly userSignal = signal<AuthUser | null>(this.readUser());
  private readonly pendingRoleSignal = signal<AppRole | null>(this.readPendingRole());

  readonly token = computed(() => this.tokenSignal());
  readonly user = computed(() => this.userSignal());
  readonly pendingRole = computed(() => this.pendingRoleSignal());
  readonly isAuthenticated = computed(() => Boolean(this.tokenSignal() || this.userSignal()));

  startSession(response: AuthResponse): void {
    // Always wipe previous user's data before writing new session.
    // This prevents data leakage when switching accounts (e.g. Google login).
    this.clearAuthStorage();

    if (response.token) {
      this.tokenSignal.set(response.token);
      localStorage.setItem('quickbite.token', response.token);
    }

    this.storeUser(this.resolveExistingPartnerUser(response.user));
    this.clearPendingRole();
  }

  replaceUser(user: AuthUser): void {
    this.storeUser(this.resolveExistingPartnerUser(user));
  }

  logout(): void {
    this.clearAuthStorage();
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    void this.router.navigate(['/login'], { queryParams: { logout: '1' } });
  }

  clearSession(): void {
    this.clearAuthStorage();
    this.tokenSignal.set(null);
    this.userSignal.set(null);
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

    if (user.role === 'RESTAURANT_OWNER') {
      if (isExistingRestaurantOwner(user)) {
        return '/owner/live-orders';
      }
      if (user.onboardingStatus === 'NOT_STARTED' || user.onboardingStatus === 'IN_PROGRESS' || !user.onboardingStatus) {
        return '/owner/onboarding';
      }
      if (user.approvalStatus === 'PENDING' || user.approvalStatus === 'REJECTED') {
        return '/approval-pending';
      }
      return '/owner/live-orders';
    }

    if (user.role === 'DELIVERY_PARTNER') {
      if (isExistingDeliveryPartner(user)) {
        return '/delivery/my-deliveries';
      }
      if (user.onboardingStatus === 'NOT_STARTED' || user.onboardingStatus === 'IN_PROGRESS' || !user.onboardingStatus) {
        return '/delivery/onboarding';
      }
      if (user.approvalStatus === 'PENDING' || user.approvalStatus === 'REJECTED') {
        return '/approval-pending';
      }
      return '/delivery/my-deliveries';
    }

    if (user.role === 'ADMIN') {
      return '/admin/dashboard';
    }

    return '/home';
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

  private resolveExistingPartnerUser(user: AuthUser): AuthUser {
    const email = (user.email || '').toLowerCase().trim();
    const seedInfo = SEED_OWNER_RESTAURANTS[email];

    if (user.role === 'RESTAURANT_OWNER' && (seedInfo || user.restaurantId || user.restaurantName)) {
      return {
        ...user,
        approvalStatus: 'APPROVED',
        onboardingStatus: 'COMPLETED',
        restaurantId: user.restaurantId || seedInfo?.id || 'urban-bites',
        restaurantName: user.restaurantName || seedInfo?.name || 'Urban Bites',
      };
    }

    if (user.role === 'DELIVERY_PARTNER' && SEED_DELIVERY_AGENT_EMAILS.has(email)) {
      return {
        ...user,
        approvalStatus: 'APPROVED',
        onboardingStatus: 'COMPLETED',
      };
    }

    return user;
  }

  private storeUser(user: AuthUser): void {
    this.userSignal.set(user);
    localStorage.setItem('quickbite.user', JSON.stringify(user));
    localStorage.setItem('quickbite.userRole', user.role);
    localStorage.setItem('quickbite.userApprovalStatus', user.approvalStatus ?? '');
    localStorage.setItem('quickbite.userOnboardingStatus', user.onboardingStatus ?? '');
    localStorage.setItem('quickbite.userRestaurantId', user.restaurantId ?? '');
    localStorage.setItem('quickbite.userRestaurantName', user.restaurantName ?? '');
  }

  private clearAuthStorage(): void {
    AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    this.pendingRoleSignal.set(null);
    localStorage.removeItem(PENDING_ROLE_KEY);
  }
}
