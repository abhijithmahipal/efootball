import { TestBed } from '@angular/core/testing';
import { Auth, User } from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockAuth: any;
  let authStateSubject: BehaviorSubject<User | null>;

  const mockUser: User = {
    uid: 'test-uid',
    email: 'admin@test.com',
    displayName: 'Test Admin',
    emailVerified: true,
    isAnonymous: false,
    metadata: {} as any,
    phoneNumber: null,
    photoURL: null,
    providerData: [],
    providerId: 'firebase',
    refreshToken: 'refresh-token',
    tenantId: null,
    delete: jasmine.createSpy('delete'),
    getIdToken: jasmine.createSpy('getIdToken'),
    getIdTokenResult: jasmine.createSpy('getIdTokenResult'),
    reload: jasmine.createSpy('reload'),
    toJSON: jasmine.createSpy('toJSON'),
  };

  beforeEach(() => {
    authStateSubject = new BehaviorSubject<User | null>(null);

    mockAuth = {
      currentUser: null,
    };

    TestBed.configureTestingModule({
      providers: [{ provide: Auth, useValue: mockAuth }],
    });

    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCurrentUser', () => {
    it('should return null when no user is authenticated', () => {
      const result = service.getCurrentUser();
      expect(result).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no user is authenticated', () => {
      const result = service.isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe('observables', () => {
    it('should have currentUser$ observable', () => {
      expect(service.currentUser$).toBeDefined();
    });

    it('should have isAuthenticated$ observable', () => {
      expect(service.isAuthenticated$).toBeDefined();
    });

    it('should emit false for isAuthenticated$ when no user', (done) => {
      service.isAuthenticated$.subscribe((isAuth) => {
        expect(isAuth).toBe(false);
        done();
      });
    });
  });

  describe('login method', () => {
    it('should have login method', () => {
      expect(service.login).toBeDefined();
      expect(typeof service.login).toBe('function');
    });
  });

  describe('logout method', () => {
    it('should have logout method', () => {
      expect(service.logout).toBeDefined();
      expect(typeof service.logout).toBe('function');
    });
  });

  describe('getAuthState method', () => {
    it('should have getAuthState method', () => {
      expect(service.getAuthState).toBeDefined();
      expect(typeof service.getAuthState).toBe('function');
    });
  });
});
