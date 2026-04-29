import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';

import { AppRole } from './app.models';
import { SessionService } from '../services/session.service';

export const authGuard: CanActivateChildFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  return session.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateChildFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  return session.isAuthenticated()
    ? router.createUrlTree([session.dashboardRouteFor(session.user()?.role)])
    : true;
};

export const roleGuard = (allowedRoles: AppRole[]): CanActivateFn => {
  return () => {
    const session = inject(SessionService);
    const router = inject(Router);
    const user = session.user();

    if (!session.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    if (user && allowedRoles.includes(user.role)) {
      return true;
    }

    return router.createUrlTree([session.dashboardRouteFor(user?.role)]);
  };
};
