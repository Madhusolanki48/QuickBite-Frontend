import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  AdminUserResponse,
  AuthResponse,
  AuthUser,
  GoogleLoginRequest,
  LoginRequest,
  RegisterRequest,
} from '../core/app.models';
import { environment } from '../../environments/environment';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly baseUrl = environment.apiBaseUrl;

  login(request: LoginRequest): Observable<AuthResponse> {
    const payload = { ...request, email: request.email.trim().toLowerCase() };
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, payload).pipe(
      map((response) => this.normalizeAuthResponse(response)),
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    const payload = {
      ...request,
      email: request.email.trim().toLowerCase(),
      phoneNumber: request.phoneNumber.trim(),
      restaurantId: request.restaurantId?.trim() || undefined,
    };
    this.session.setPendingRole(payload.role);
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, payload).pipe(
      map((response) => this.normalizeAuthResponse(response)),
    );
  }

  googleLogin(request: GoogleLoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/google`, request).pipe(
      map((response) => this.normalizeAuthResponse(response)),
    );
  }

  listAdminUsers(): Observable<AdminUserResponse[]> {
    return this.http.get<AdminUserResponse[]>(`${this.baseUrl}/auth/admin/users`);
  }

  setUserEnabled(id: number, enabled: boolean): Observable<AdminUserResponse> {
    return this.http.patch<AdminUserResponse>(`${this.baseUrl}/auth/admin/users/${id}/enabled`, {
      enabled,
    });
  }

  private normalizeAuthResponse(response: AuthResponse): AuthResponse {
    const role = response.user.role as AuthUser['role'];
    return {
      ...response,
      tokenType: response.tokenType || 'Bearer',
      expiresInMs: response.expiresInMs || 24 * 60 * 60 * 1000,
      user: {
        ...response.user,
        role,
      },
    };
  }
}
