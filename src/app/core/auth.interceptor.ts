import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { SessionService } from '../services/session.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService);
  const token = session.token();

  if (!token || !shouldAttachToken(request.url)) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};

function shouldAttachToken(url: string): boolean {
  if (isPublicAuthEndpoint(url)) {
    return false;
  }

  if (!url.startsWith('http')) {
    return true;
  }

  try {
    const requestUrl = new URL(url);
    return requestUrl.origin === window.location.origin;
  } catch {
    return false;
  }
}

function isPublicAuthEndpoint(url: string): boolean {
  const path = url.startsWith('http') ? safePathname(url) : url.split('?')[0];
  return [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/google',
    '/api/auth/verify-registration',
    '/api/auth/resend-registration-otp',
    '/api/auth/forgot-password',
    '/api/auth/verify-otp',
    '/api/auth/verify-reset-otp',
    '/api/auth/reset-password',
    '/auth/login',
    '/auth/register',
    '/auth/google',
    '/auth/verify-registration',
    '/auth/resend-registration-otp',
    '/auth/forgot-password',
    '/auth/verify-otp',
    '/auth/verify-reset-otp',
    '/auth/reset-password',
  ].some((endpoint) => path === endpoint || path.startsWith(`${endpoint}/`));
}

function safePathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split('?')[0];
  }
}
