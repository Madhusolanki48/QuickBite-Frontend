import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { CustomerProfile } from '../core/app.models';
import { environment } from '../../environments/environment';
import { SessionService } from './session.service';

const PROFILE_KEY = 'quickbite.customerProfile';

const DEFAULT_PROFILE: CustomerProfile = {
  name: 'Customer',
  phone: '',
  email: '',
  memberSince: 'Jan 2024',
  avgRating: 4.8,
  totalOrders: 0,
  totalSpent: '₹0',
  loyaltyTier: 'Gold',
};

@Injectable({ providedIn: 'root' })
export class CustomerProfileService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly profileSignal = signal<CustomerProfile>(this.readProfile());

  readonly profile = computed(() => this.profileSignal());

  constructor() {
    this.refreshFromBackend();
  }

  updateProfile(patch: Partial<CustomerProfile>): void {
    const next = { ...this.profileSignal(), ...patch };
    this.profileSignal.set(next);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));

    this.http
      .put(`${this.baseUrl}/auth/me`, {
        firstName: next.name.split(' ')[0] ?? next.name,
        lastName: next.name.split(' ').slice(1).join(' ') || 'User',
        phoneNumber: next.phone,
      })
      .subscribe();
  }

  private refreshFromBackend(): void {
    this.http.get<any>(`${this.baseUrl}/auth/me`).subscribe({
      next: (user) => {
        const next: CustomerProfile = {
          ...this.profileSignal(),
          name: `${user.firstName ?? 'Customer'} ${user.lastName ?? ''}`.trim(),
          phone: user.phoneNumber ?? '',
          email: user.email ?? this.session.user()?.email ?? '',
        };
        this.profileSignal.set(next);
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      },
    });
  }

  private readProfile(): CustomerProfile {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_PROFILE,
        email: this.session.user()?.email ?? '',
        name: this.session.user()
          ? `${this.session.user()?.firstName ?? ''} ${this.session.user()?.lastName ?? ''}`.trim()
          : DEFAULT_PROFILE.name,
        phone: this.session.user()?.phoneNumber ?? '',
      };
    }

    try {
      return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<CustomerProfile>) };
    } catch {
      return DEFAULT_PROFILE;
    }
  }
}
