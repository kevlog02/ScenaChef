import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError(err => {
      if (err.status === 401) {

        authService.logout();
        router.navigate(['/login']);
      }


      const errorMsg = err.error?.message || err.error?.error || err.statusText || 'Error desconocido';
      return throwError(() => new Error(errorMsg));
    })
  );
};
