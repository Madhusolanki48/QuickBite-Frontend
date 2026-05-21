import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import {
  AdminUserResponse,
  AuthResponse,
  AuthUser,
  ForgotPasswordRequest,
  GoogleLoginRequest,
  LoginRequest,
  RegisterRequest,
  ResendRegistrationOtpRequest,
  MessageResponse,
  PasswordResetResponse,
  ResetPasswordRequest,
  VerifyOtpRequest,
} from '../core/app.models';
import { environment } from '../../environments/environment';
import { SessionService } from './session.service';
import { timeout } from 'rxjs';

const AUTH_REQUEST_TIMEOUT_MS = 30000;

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly authBaseUrl = environment.authApiBaseUrl ?? environment.apiBaseUrl;

  login(request: LoginRequest): Observable<AuthResponse> {
    const payload = { ...request, email: request.email.trim().toLowerCase() };
    return this.http.post<AuthResponse>(`${this.authBaseUrl}/auth/login`, payload).pipe(
      timeout(AUTH_REQUEST_TIMEOUT_MS),
      map((response) => this.normalizeAuthResponse(response)),
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    const payload = {
      ...request,
      email: request.email.trim().toLowerCase(),
      username: request.username.trim(),
      phoneNumber: request.phoneNumber.trim(),
      restaurantId: request.restaurantId?.trim() || undefined,
    };
    this.session.setPendingRole(payload.role);
    return this.http.post<AuthResponse>(`${this.authBaseUrl}/auth/register`, payload).pipe(
      timeout(AUTH_REQUEST_TIMEOUT_MS),
      map((response) => this.normalizeAuthResponse(response)),
    );
  }

  googleLogin(request: GoogleLoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authBaseUrl}/auth/google`, request).pipe(
      timeout(AUTH_REQUEST_TIMEOUT_MS),
      map((response) => this.normalizeAuthResponse(response)),
    );
  }

  getCurrentUser(): Observable<AuthUser> {
    return this.http
      .get<AuthUser>(`${this.authBaseUrl}/auth/me`)
      .pipe(timeout(AUTH_REQUEST_TIMEOUT_MS));
  }

  verifyRegistration(request: VerifyOtpRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.authBaseUrl}/auth/verify-registration`, request)
      .pipe(
        timeout(AUTH_REQUEST_TIMEOUT_MS),
        map((response) => this.normalizeAuthResponse(response)),
      );
  }

  resendRegistrationOtp(request: ResendRegistrationOtpRequest): Observable<MessageResponse> {
    return this.http
      .post<MessageResponse>(`${this.authBaseUrl}/auth/resend-registration-otp`, request)
      .pipe(timeout(AUTH_REQUEST_TIMEOUT_MS));
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<PasswordResetResponse> {
    return this.http
      .post<PasswordResetResponse>(`${this.authBaseUrl}/auth/forgot-password`, request)
      .pipe(timeout(AUTH_REQUEST_TIMEOUT_MS));
  }

  verifyResetOtp(request: VerifyOtpRequest): Observable<PasswordResetResponse> {
    return this.http
      .post<PasswordResetResponse>(`${this.authBaseUrl}/auth/verify-reset-otp`, request)
      .pipe(timeout(AUTH_REQUEST_TIMEOUT_MS));
  }

  resetPassword(request: ResetPasswordRequest): Observable<PasswordResetResponse> {
    return this.http
      .post<PasswordResetResponse>(`${this.authBaseUrl}/auth/reset-password`, request)
      .pipe(timeout(AUTH_REQUEST_TIMEOUT_MS));
  }

  updateUserProfile(request: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  }): Observable<AuthUser> {
    return this.http
      .put<AuthUser>(`${this.authBaseUrl}/auth/me`, request)
      .pipe(timeout(AUTH_REQUEST_TIMEOUT_MS));
  }

  deleteAccount(): Observable<MessageResponse> {
    return this.http
      .delete<MessageResponse>(`${this.authBaseUrl}/auth/me`)
      .pipe(timeout(AUTH_REQUEST_TIMEOUT_MS));
  }

  listAdminUsers(): Observable<AdminUserResponse[]> {
    return this.http
      .get<AdminUserResponse[]>(`${this.authBaseUrl}/auth/admin/users`)
      .pipe(timeout(AUTH_REQUEST_TIMEOUT_MS));
  }

  setUserEnabled(id: number, enabled: boolean): Observable<AdminUserResponse> {
    return this.http
      .patch<AdminUserResponse>(`${this.authBaseUrl}/auth/admin/users/${id}/enabled`, {
        enabled,
      })
      .pipe(timeout(AUTH_REQUEST_TIMEOUT_MS));
  }

  authErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = this.readApiMessage(error.error);
      const normalized = (apiMessage || fallback).toLowerCase();

      if (normalized.includes('invalid') || normalized.includes('credentials')) {
        return 'Invalid email or password.';
      }
      if (normalized.includes('verify') && normalized.includes('email')) {
        return 'Please verify your email before logging in.';
      }
      if (normalized.includes('pending')) {
        return 'Your account is pending admin approval. You will be able to log in after approval.';
      }
      if (normalized.includes('disabled')) {
        return 'Your account is disabled. Please contact support.';
      }
      if (normalized.includes('expired') && normalized.includes('otp')) {
        return 'The OTP has expired. Please request a new code.';
      }
      if (normalized.includes('expired') && normalized.includes('token')) {
        return 'The reset link or token has expired. Please request a new code.';
      }
      if (normalized.includes('invalid') && normalized.includes('otp')) {
        return 'The OTP is incorrect. Please try again.';
      }
      return apiMessage || fallback;
    }

    return fallback;
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

  private readApiMessage(errorBody: unknown): string {
    if (!errorBody || typeof errorBody !== 'object') {
      return '';
    }

    const body = errorBody as { message?: unknown; error?: unknown };
    const message = typeof body.message === 'string' ? body.message : body.error;
    return typeof message === 'string' ? message : '';
  }
}
