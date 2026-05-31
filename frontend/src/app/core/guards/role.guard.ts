import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data?.['roles'] as Array<string>;
  const userRole = authService.getUserRole();

  if (authService.isAuthenticated() && userRole && allowedRoles && allowedRoles.includes(userRole)) {
    return true;
  }

  // If unauthorized, redirect to login
  router.navigate(['/login']);
  return false;
};
