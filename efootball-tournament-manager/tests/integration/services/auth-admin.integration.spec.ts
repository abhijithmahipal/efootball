import { test, expect } from '@playwright/test';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../src/app/services/auth.service';
import { AdminGuard } from '../../../src/app/guards/admin.guard';
import { Router } from '@angular/router';
import { Auth, User } from '@angular/fire/auth';
import { BehaviorSubject, of, throwError } from 'rxjs';

// Mock Firebase Auth
class MockAuth {
  private userSubject = new BehaviorSubject<User | null>(null);

  get currentUser() {
    return this.userSubject.value;
  }

  // Simulate auth state changes
  authState() {
    return this.userSubject.asObservable();
  }

  // Mock sign in
  signInWithEmailAndPassword(email: string, password: string) {
    if (email === 'admin@test.com' && password === 'password123') {
      const mockUser = {
        uid: 'test-uid',
        email: 'admin@test.com',
        emailVerified: true,
      } as User;
      this.userSubject.next(mockUser);
      return Promise.resolve({ user: mockUser });
    } else {
      return Promise.reject(new Error('Invalid credentials'));
    }
  }

  // Mock sign out
  signOut() {
    this.userSubject.next(null);
    return Promise.resolve();
  }

  // Mock user creation
  createUserWithEmailAndPassword(email: string, password: string) {
    const mockUser = {
      uid: 'new-user-uid',
      email: email,
      emailVerified: false,
    } as User;
    this.userSubject.next(mockUser);
    return Promise.resolve({ user: mockUser });
  }

  // Helper method for testing
  setCurrentUser(user: User | null) {
    this.userSubject.next(user);
  }
}

// Mock Router
class MockRouter {
  private currentUrl = '/';

  navigate(commands: any[]) {
    this.currentUrl = commands.join('/');
    return Promise.resolve(true);
  }

  navigateByUrl(url: string) {
    this.currentUrl = url;
    return Promise.resolve(true);
  }

  getCurrentUrl() {
    return this.currentUrl;
  }
}

test.describe('AuthService and AdminGuard Integration', () => {
  let authService: AuthService;
  let adminGuard: AdminGuard;
  let mockAuth: MockAuth;
  let mockRouter: MockRouter;

  test.beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        AuthService,
        AdminGuard,
        { provide: Auth, useClass: MockAuth },
        { provide: Router, useClass: MockRouter },
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    adminGuard = TestBed.inject(AdminGuard);
    mockAuth = TestBed.inject(Auth) as any;
    mockRouter = TestBed.inject(Router) as any;
  });

  test('should authenticate admin user successfully', async () => {
    // Initially not authenticated
    expect(authService.isAuthenticated()).toBe(false);

    // Login with valid credentials
    const user = await authService.login('admin@test.com', 'password123');

    expect(user).toBeDefined();
    expect(user.email).toBe('admin@test.com');
    expect(authService.isAuthenticated()).toBe(true);

    // Check current user
    const currentUser = authService.getCurrentUser();
    expect(currentUser).toBeDefined();
    expect(currentUser!.email).toBe('admin@test.com');
  });

  test('should reject invalid login credentials', async () => {
    try {
      await authService.login('invalid@test.com', 'wrongpassword');
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Invalid credentials');
    }

    expect(authService.isAuthenticated()).toBe(false);
  });

  test('should logout user successfully', async () => {
    // Login first
    await authService.login('admin@test.com', 'password123');
    expect(authService.isAuthenticated()).toBe(true);

    // Logout
    await authService.logout();
    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.getCurrentUser()).toBe(null);
  });

  test('should register new user successfully', async () => {
    const newUser = await authService.register(
      'newadmin@test.com',
      'newpassword123'
    );

    expect(newUser).toBeDefined();
    expect(newUser.email).toBe('newadmin@test.com');
    expect(authService.isAuthenticated()).toBe(true);
  });

  test('should allow authenticated users through admin guard', async () => {
    // Login first
    await authService.login('admin@test.com', 'password123');

    // Mock route
    const mockRoute = {} as any;
    const mockState = { url: '/admin' } as any;

    const canActivate = await adminGuard
      .canActivate(mockRoute, mockState)
      .toPromise();
    expect(canActivate).toBe(true);
  });

  test('should redirect unauthenticated users to login', async () => {
    // Ensure user is not authenticated
    expect(authService.isAuthenticated()).toBe(false);

    // Mock route
    const mockRoute = {} as any;
    const mockState = { url: '/admin/players' } as any;

    const canActivate = await adminGuard
      .canActivate(mockRoute, mockState)
      .toPromise();
    expect(canActivate).toBe(false);

    // Should redirect to admin login
    expect(mockRouter.getCurrentUrl()).toBe('/admin');
  });

  test('should handle authentication state changes reactively', async () => {
    let authStateChanges: (User | null)[] = [];

    // Subscribe to auth state changes
    const subscription = authService.getAuthState().subscribe((user) => {
      authStateChanges.push(user);
    });

    // Initial state should be null
    expect(authStateChanges[0]).toBe(null);

    // Login
    await authService.login('admin@test.com', 'password123');
    await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for async update

    expect(authStateChanges.length).toBeGreaterThan(1);
    expect(authStateChanges[authStateChanges.length - 1]?.email).toBe(
      'admin@test.com'
    );

    // Logout
    await authService.logout();
    await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for async update

    expect(authStateChanges[authStateChanges.length - 1]).toBe(null);

    subscription.unsubscribe();
  });

  test('should handle authentication observable correctly', async () => {
    let isAuthenticatedStates: boolean[] = [];

    // Subscribe to authentication state
    const subscription = authService.isAuthenticated$.subscribe((isAuth) => {
      isAuthenticatedStates.push(isAuth);
    });

    // Initial state should be false
    expect(isAuthenticatedStates[0]).toBe(false);

    // Login
    await authService.login('admin@test.com', 'password123');
    await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for async update

    expect(isAuthenticatedStates[isAuthenticatedStates.length - 1]).toBe(true);

    // Logout
    await authService.logout();
    await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for async update

    expect(isAuthenticatedStates[isAuthenticatedStates.length - 1]).toBe(false);

    subscription.unsubscribe();
  });

  test('should protect multiple admin routes correctly', async () => {
    const adminRoutes = [
      '/admin/players',
      '/admin/matches',
      '/admin/schedule',
      '/admin/results',
    ];

    // Test without authentication
    for (const route of adminRoutes) {
      const mockRoute = {} as any;
      const mockState = { url: route } as any;

      const canActivate = await adminGuard
        .canActivate(mockRoute, mockState)
        .toPromise();
      expect(canActivate).toBe(false);
    }

    // Login
    await authService.login('admin@test.com', 'password123');

    // Test with authentication
    for (const route of adminRoutes) {
      const mockRoute = {} as any;
      const mockState = { url: route } as any;

      const canActivate = await adminGuard
        .canActivate(mockRoute, mockState)
        .toPromise();
      expect(canActivate).toBe(true);
    }
  });

  test('should handle concurrent login attempts correctly', async () => {
    const loginPromises = [
      authService.login('admin@test.com', 'password123'),
      authService.login('admin@test.com', 'password123'),
      authService.login('admin@test.com', 'password123'),
    ];

    const results = await Promise.all(loginPromises);

    // All should succeed
    results.forEach((user) => {
      expect(user.email).toBe('admin@test.com');
    });

    expect(authService.isAuthenticated()).toBe(true);
  });

  test('should handle session persistence correctly', async () => {
    // Simulate existing session
    const existingUser = {
      uid: 'existing-uid',
      email: 'admin@test.com',
      emailVerified: true,
    } as User;

    mockAuth.setCurrentUser(existingUser);

    // Wait for auth state to update
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.getCurrentUser()?.email).toBe('admin@test.com');

    // Admin guard should allow access
    const mockRoute = {} as any;
    const mockState = { url: '/admin' } as any;
    const canActivate = await adminGuard
      .canActivate(mockRoute, mockState)
      .toPromise();
    expect(canActivate).toBe(true);
  });

  test('should handle authentication errors gracefully', async () => {
    // Test various error scenarios
    const errorScenarios = [
      { email: '', password: 'password123' },
      { email: 'admin@test.com', password: '' },
      { email: 'invalid-email', password: 'password123' },
      { email: 'admin@test.com', password: 'wrongpassword' },
    ];

    for (const scenario of errorScenarios) {
      try {
        await authService.login(scenario.email, scenario.password);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        expect(authService.isAuthenticated()).toBe(false);
      }
    }
  });

  test('should handle logout when not authenticated', async () => {
    // Ensure not authenticated
    expect(authService.isAuthenticated()).toBe(false);

    // Logout should not throw error
    await expect(authService.logout()).resolves.toBeUndefined();
    expect(authService.isAuthenticated()).toBe(false);
  });
});
