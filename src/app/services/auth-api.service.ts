import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import {
  AdminUserResponse,
  AuthResponse,
  AuthUser,
  GoogleLoginRequest,
  LoginRequest,
  RegisterRequest,
} from '../core/app.models';
import { SessionService } from './session.service';

const MOCK_USERS_KEY = 'quickbite.mockUsers';

interface StoredMockUser {
  email: string;
  password: string;
  role: AuthUser['role'];
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  restaurantId?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  enabled?: boolean;
}

const SEEDED_ACCOUNTS: Record<string, Omit<StoredMockUser, 'email' | 'password'>> = {
  'admin@quickbite.dev': {
    role: 'ADMIN',
    firstName: 'Admin',
    lastName: 'QuickBite',
    approvalStatus: 'APPROVED',
    enabled: true,
  },
  'burger-palace-owner@quickbite.dev': {
    role: 'RESTAURANT_OWNER',
    firstName: 'Aarav',
    lastName: 'Mehta',
    restaurantId: 'burger-palace',
    approvalStatus: 'APPROVED',
    enabled: true,
  },
  'pizza-hut-owner@quickbite.dev': {
    role: 'RESTAURANT_OWNER',
    firstName: 'Ishita',
    lastName: 'Sharma',
    restaurantId: 'pizza-hut-express',
    approvalStatus: 'APPROVED',
    enabled: true,
  },
  'sushi-zen-owner@quickbite.dev': {
    role: 'RESTAURANT_OWNER',
    firstName: 'Ken',
    lastName: 'Tanaka',
    restaurantId: 'sushi-zen',
    approvalStatus: 'APPROVED',
    enabled: true,
  },
  'spice-garden-owner@quickbite.dev': {
    role: 'RESTAURANT_OWNER',
    firstName: 'Meera',
    lastName: 'Iyer',
    restaurantId: 'spice-garden',
    approvalStatus: 'APPROVED',
    enabled: true,
  },
  'taco-fiesta-owner@quickbite.dev': {
    role: 'RESTAURANT_OWNER',
    firstName: 'Diego',
    lastName: 'Lopez',
    restaurantId: 'taco-fiesta',
    approvalStatus: 'APPROVED',
    enabled: true,
  },
  'noodle-house-owner@quickbite.dev': {
    role: 'RESTAURANT_OWNER',
    firstName: 'Lily',
    lastName: 'Chen',
    restaurantId: 'noodle-house',
    approvalStatus: 'APPROVED',
    enabled: true,
  },
  'rahul.kumar@quickbite.dev': {
    role: 'DELIVERY_PARTNER',
    firstName: 'Rahul',
    lastName: 'Kumar',
    approvalStatus: 'APPROVED',
    enabled: true,
  },
  'aisha.khan@quickbite.dev': {
    role: 'DELIVERY_PARTNER',
    firstName: 'Aisha',
    lastName: 'Khan',
    approvalStatus: 'APPROVED',
    enabled: true,
  },
  'imran.ali@quickbite.dev': {
    role: 'DELIVERY_PARTNER',
    firstName: 'Imran',
    lastName: 'Ali',
    approvalStatus: 'APPROVED',
    enabled: true,
  },
  'neha.singh@quickbite.dev': {
    role: 'DELIVERY_PARTNER',
    firstName: 'Neha',
    lastName: 'Singh',
    approvalStatus: 'APPROVED',
    enabled: true,
  },
};

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly session = inject(SessionService);

  login(request: LoginRequest): Observable<AuthResponse> {
    const normalizedRequest = { ...request, email: request.email.trim().toLowerCase() };
    return of(this.mockLogin(normalizedRequest.email));
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    const normalizedRequest = { ...request, email: request.email.trim().toLowerCase() };
    this.session.setPendingRole(normalizedRequest.role);
    this.saveMockUser({
      email: normalizedRequest.email,
      password: normalizedRequest.password,
      role: normalizedRequest.role,
      firstName: normalizedRequest.firstName,
      lastName: normalizedRequest.lastName,
      phoneNumber: normalizedRequest.phoneNumber,
      restaurantId: normalizedRequest.restaurantId,
      approvalStatus: normalizedRequest.role === 'RESTAURANT_OWNER' ? 'PENDING' : 'APPROVED',
      enabled: normalizedRequest.role !== 'RESTAURANT_OWNER',
    });
    return of(
      this.mockAuth(
        normalizedRequest.email,
        normalizedRequest.role,
        normalizedRequest.firstName,
        normalizedRequest.lastName,
        normalizedRequest.phoneNumber,
        normalizedRequest.restaurantId,
        normalizedRequest.role === 'RESTAURANT_OWNER' ? 'PENDING' : 'APPROVED',
      ),
    );
  }

  googleLogin(request: GoogleLoginRequest): Observable<AuthResponse> {
    const parsed = this.decodeGoogleCredential(request.credential);
    return of(
      this.mockAuth(
        parsed.email,
        this.session.pendingRole() ?? 'CUSTOMER',
        parsed.firstName,
        parsed.lastName,
      ),
    );
  }

  listAdminUsers(): Observable<AdminUserResponse[]> {
    return of(this.readMockUsers().map((user) => this.toAdminUser(user)));
  }

  setUserEnabled(id: number, enabled: boolean): Observable<AdminUserResponse> {
    const users = this.readMockUsers();
    const updated: StoredMockUser[] = users.map((user) =>
      this.userId(user.email) === id
        ? {
            ...user,
            enabled,
            approvalStatus: enabled ? 'APPROVED' : 'PENDING',
          }
        : user,
    );
    this.saveMockUsers(updated);

    const current = updated.find((user) => this.userId(user.email) === id);
    if (!current) {
      throw new Error('User not found.');
    }

    return of(this.toAdminUser(current));
  }

  private mockAuth(
    email: string,
    role: string,
    firstName = 'Food',
    lastName = 'Rush',
    phoneNumber = '9999999999',
    restaurantId?: string,
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'APPROVED',
  ): AuthResponse {
    return {
      token: `mock-${role.toLowerCase()}-${email}`,
      tokenType: 'Bearer',
      expiresInMs: 24 * 60 * 60 * 1000,
      user: {
        id: Date.now(),
        firstName,
        lastName,
        email,
        phoneNumber,
        role: role as AuthUser['role'],
        restaurantId,
        approvalStatus,
      },
    };
  }

  private mockLogin(email: string): AuthResponse {
    const saved = this.readMockUsers().find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
    const seeded = SEEDED_ACCOUNTS[email.toLowerCase()];
    const role = saved?.role ?? seeded?.role ?? 'CUSTOMER';
    return this.mockAuth(
      email,
      role,
      saved?.firstName ?? seeded?.firstName ?? 'Food',
      saved?.lastName ?? seeded?.lastName ?? 'Rush',
      saved?.phoneNumber,
      saved?.restaurantId ?? seeded?.restaurantId,
      saved?.approvalStatus ?? seeded?.approvalStatus ?? 'APPROVED',
    );
  }

  private saveMockUser(user: {
    email: string;
    password: string;
    role: AuthUser['role'];
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    restaurantId?: string;
    approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    enabled?: boolean;
  }): void {
    const users = this.readMockUsers();
    const next = users.filter((item) => item.email.toLowerCase() !== user.email.toLowerCase());
    next.unshift(user);
    this.saveMockUsers(next);
  }

  private readMockUsers(): StoredMockUser[] {
    const raw = localStorage.getItem(MOCK_USERS_KEY);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as StoredMockUser[];
    } catch {
      return [];
    }
  }

  private saveMockUsers(users: StoredMockUser[]): void {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
  }

  private toAdminUser(user: StoredMockUser): AdminUserResponse {
    return {
      id: this.userId(user.email),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber ?? null,
      role: user.role,
      restaurantId: user.restaurantId ?? null,
      restaurantName: user.restaurantId ? this.restaurantNameFromId(user.restaurantId) : null,
      approvalStatus: user.approvalStatus ?? (user.enabled === false ? 'PENDING' : 'APPROVED'),
      enabled: user.enabled ?? user.approvalStatus !== 'PENDING',
      createdAt: new Date().toISOString(),
    };
  }

  private userId(email: string): number {
    let hash = 0;
    for (let i = 0; i < email.length; i += 1) {
      hash = (hash * 31 + email.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  private restaurantNameFromId(restaurantId: string): string {
    return restaurantId
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private decodeGoogleCredential(credential: string): {
    email: string;
    firstName: string;
    lastName: string;
  } {
    try {
      const payload = credential.split('.')[1];
      if (!payload) {
        return { email: 'google.user@quickbite.dev', firstName: 'Google', lastName: 'User' };
      }

      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
      const data = JSON.parse(decoded) as {
        email?: string;
        given_name?: string;
        family_name?: string;
        name?: string;
      };
      const nameParts = (data.name ?? 'Google User').split(' ');

      return {
        email: data.email ?? 'google.user@quickbite.dev',
        firstName: data.given_name ?? nameParts[0] ?? 'Google',
        lastName: data.family_name ?? (nameParts.slice(1).join(' ') || 'User'),
      };
    } catch {
      return { email: 'google.user@quickbite.dev', firstName: 'Google', lastName: 'User' };
    }
  }
}
