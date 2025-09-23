import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  /**
   * Determines if the route can be activated based on authentication status
   * @returns Observable<boolean | UrlTree> - true if authenticated, redirect to login if not
   */
  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map((isAuthenticated) => {
        if (isAuthenticated) {
          return true;
        } else {
          // Redirect to admin login page if not authenticated
          return this.router.createUrlTree(['/admin/login']);
        }
      })
    );
  }
}
