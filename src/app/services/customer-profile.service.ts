import { Injectable, computed, signal } from '@angular/core';

import { CustomerProfile } from '../core/app.models';

const PROFILE_KEY = 'quickbite.customerProfile';

const DEFAULT_PROFILE: CustomerProfile = {
  name: 'Priya Sharma',
  phone: '+91 98765 43210',
  email: 'priya.sharma@email.com',
  memberSince: 'Jan 2024',
  avgRating: 4.8,
  totalOrders: 42,
  totalSpent: '₹18.2K',
  loyaltyTier: 'Gold',
};

@Injectable({ providedIn: 'root' })
export class CustomerProfileService {
  private readonly profileSignal = signal<CustomerProfile>(this.readProfile());

  readonly profile = computed(() => this.profileSignal());

  updateProfile(patch: Partial<CustomerProfile>): void {
    const next = { ...this.profileSignal(), ...patch };
    this.profileSignal.set(next);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  }

  private readProfile(): CustomerProfile {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      return DEFAULT_PROFILE;
    }

    try {
      return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<CustomerProfile>) };
    } catch {
      return DEFAULT_PROFILE;
    }
  }
}
