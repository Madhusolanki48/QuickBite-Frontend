import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { AuthUser, CustomerProfile } from '../core/app.models';
import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';
import { SessionService } from './session.service';

const PROFILE_KEY_PREFIX = 'quickbite.customerProfile';

const DEFAULT_PROFILE: CustomerProfile = {
  name: 'Customer',
  phone: '',
  email: '',
  memberSince: 'Jan 2024',
  avgRating: 4.8,
  totalOrders: 0,
  totalSpent: 'Rs 0',
  loyaltyTier: 'Gold',
};

@Injectable({ providedIn: 'root' })
export class CustomerProfileService {
  private readonly auth = inject(AuthApiService);
  private readonly session = inject(SessionService);
  private readonly profileSignal = signal<CustomerProfile>(DEFAULT_PROFILE);

  readonly profile = computed(() => this.profileSignal());

  constructor() {
    effect(() => {
      const user = this.session.user();
      if (!user) {
        this.profileSignal.set(DEFAULT_PROFILE);
        return;
      }

      this.profileSignal.set(this.createDefaultProfile(user));
      this.refreshFromBackend(user);
    });
  }

  updateProfile(patch: Partial<CustomerProfile>): void {
    const next = { ...this.profileSignal(), ...patch };
    this.profileSignal.set(next);

    const user = this.session.user();
    if (user) {
      localStorage.setItem(this.profileKeyFor(user.email), JSON.stringify(next));
    }

    this.auth
      .updateUserProfile({
        firstName: next.name.split(' ')[0] ?? next.name,
        lastName: next.name.split(' ').slice(1).join(' ') || 'User',
        phoneNumber: next.phone,
      })
      .subscribe({
        next: (updatedUser) => {
          this.session.replaceUser(updatedUser);
        },
      });
  }

  private refreshFromBackend(user: AuthUser): void {
    this.auth.getCurrentUser().subscribe({
      next: (backendUser: AuthUser) => {
        const nextUser: AuthUser = {
          ...user,
          ...backendUser,
          role: (backendUser.role ?? user.role) as AuthUser['role'],
        };
        this.session.replaceUser(nextUser);

        const next: CustomerProfile = {
          ...this.createDefaultProfile(nextUser),
          name: `${backendUser.firstName ?? user.firstName ?? 'Customer'} ${
            backendUser.lastName ?? user.lastName ?? ''
          }`.trim(),
          phone: backendUser.phoneNumber ?? user.phoneNumber ?? '',
          email: backendUser.email ?? user.email,
        };
        this.profileSignal.set(next);
        localStorage.setItem(this.profileKeyFor(user.email), JSON.stringify(next));
      },
    });
  }

  private createDefaultProfile(user?: AuthUser | null): CustomerProfile {
    return {
      ...DEFAULT_PROFILE,
      email: user?.email ?? '',
      name: user
        ? `${user.firstName ?? 'Customer'} ${user.lastName ?? ''}`.trim()
        : DEFAULT_PROFILE.name,
      phone: user?.phoneNumber ?? '',
    };
  }

  private profileKeyFor(email: string): string {
    return `${PROFILE_KEY_PREFIX}:${email.trim().toLowerCase()}`;
  }
}
