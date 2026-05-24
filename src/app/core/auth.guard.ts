import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';

import { AppRole } from './app.models';
import {
  SessionService,
  isExistingDeliveryPartner,
  isExistingRestaurantOwner,
} from '../services/session.service';

export const authGuard: CanActivateChildFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  return session.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateChildFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  return session.isAuthenticated()
    ? router.createUrlTree([session.routeAfterAuth(session.user())])
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

    if (!user || !allowedRoles.includes(user.role)) {
      return router.createUrlTree([session.routeAfterAuth(user)]);
    }

    if (user && user.role === 'RESTAURANT_OWNER') {
      if (isExistingRestaurantOwner(user)) {
        return true;
      }
      if (user.onboardingStatus === 'NOT_STARTED' || user.onboardingStatus === 'IN_PROGRESS' || !user.onboardingStatus) {
        return router.createUrlTree(['/owner/onboarding']);
      }
      if (user.approvalStatus === 'PENDING' || user.approvalStatus === 'REJECTED') {
        return router.createUrlTree(['/approval-pending']);
      }
    }

    if (user && user.role === 'DELIVERY_PARTNER') {
      if (isExistingDeliveryPartner(user)) {
        return true;
      }
      if (user.onboardingStatus === 'NOT_STARTED' || user.onboardingStatus === 'IN_PROGRESS' || !user.onboardingStatus) {
        return router.createUrlTree(['/delivery/onboarding']);
      }
      if (user.approvalStatus === 'PENDING' || user.approvalStatus === 'REJECTED') {
        return router.createUrlTree(['/approval-pending']);
      }
    }

    return true;
  };
};
