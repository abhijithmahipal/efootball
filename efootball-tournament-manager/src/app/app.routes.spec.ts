import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { routes } from './app.routes';
import { AdminGuard } from './guards/admin.guard';
import { AuthService } from './services/auth.service';
import { BehaviorSubject } from 'rxjs';

// Mock components for testing
@Component({ template: 'Admin Login' })
class MockAdminLoginComponent {}

@Component({ template: 'Admin Dashboard' })
class MockAdminDashboardComponent {}

@Component({ template: 'Home' })
class MockHomeComponent {}

describe('App Routes', () => {
  let router: Router;
  let location: Location;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let isAuthenticatedSubject: BehaviorSubject<boolean>;

  beforeEach(async () => {
    isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

    mockAuthService = jasmine.createSpyObj('AuthService', [], {
      isAuthenticated$: isAuthenticatedSubject.asObservable(),
    });

    await TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  it('should have routes defined', () => {
    expect(routes).toBeDefined();
    expect(routes.length).toBeGreaterThan(0);
  });

  it('should have admin routes with guard protection', () => {
    const adminRoute = routes.find((route) => route.path === 'admin');
    expect(adminRoute).toBeDefined();
    expect(adminRoute?.children).toBeDefined();

    const dashboardRoute = adminRoute?.children?.find(
      (child) => child.path === 'dashboard'
    );
    expect(dashboardRoute).toBeDefined();
    expect(dashboardRoute?.canActivate).toContain(AdminGuard);

    const playersRoute = adminRoute?.children?.find(
      (child) => child.path === 'players'
    );
    expect(playersRoute).toBeDefined();
    expect(playersRoute?.canActivate).toContain(AdminGuard);

    const scheduleGeneratorRoute = adminRoute?.children?.find(
      (child) => child.path === 'schedule-generator'
    );
    expect(scheduleGeneratorRoute).toBeDefined();
    expect(scheduleGeneratorRoute?.canActivate).toContain(AdminGuard);

    const matchResultsRoute = adminRoute?.children?.find(
      (child) => child.path === 'match-results'
    );
    expect(matchResultsRoute).toBeDefined();
    expect(matchResultsRoute?.canActivate).toContain(AdminGuard);
  });

  it('should have admin login route without guard protection', () => {
    const adminRoute = routes.find((route) => route.path === 'admin');
    const loginRoute = adminRoute?.children?.find(
      (child) => child.path === 'login'
    );

    expect(loginRoute).toBeDefined();
    expect(loginRoute?.canActivate).toBeUndefined();
  });

  it('should have public routes without guard protection', () => {
    const homeRoute = routes.find((route) => route.path === 'home');
    expect(homeRoute).toBeDefined();
    expect(homeRoute?.canActivate).toBeUndefined();

    const scheduleRoute = routes.find((route) => route.path === 'schedule');
    expect(scheduleRoute).toBeDefined();
    expect(scheduleRoute?.canActivate).toBeUndefined();

    const standingsRoute = routes.find((route) => route.path === 'standings');
    expect(standingsRoute).toBeDefined();
    expect(standingsRoute?.canActivate).toBeUndefined();
  });

  it('should have default redirect to home', () => {
    const defaultRoute = routes.find((route) => route.path === '');
    expect(defaultRoute).toBeDefined();
    expect(defaultRoute?.redirectTo).toBe('/home');
    expect(defaultRoute?.pathMatch).toBe('full');
  });

  it('should have wildcard route redirect to home', () => {
    const wildcardRoute = routes.find((route) => route.path === '**');
    expect(wildcardRoute).toBeDefined();
    expect(wildcardRoute?.redirectTo).toBe('/home');
  });
});
