import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AdminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let isAuthenticatedSubject: BehaviorSubject<boolean>;

  beforeEach(() => {
    isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

    mockAuthService = jasmine.createSpyObj('AuthService', [], {
      isAuthenticated$: isAuthenticatedSubject.asObservable(),
    });

    mockRouter = jasmine.createSpyObj('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        AdminGuard,
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    guard = TestBed.inject(AdminGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('canActivate', () => {
    it('should return true when user is authenticated', (done) => {
      isAuthenticatedSubject.next(true);

      guard.canActivate().subscribe((result) => {
        expect(result).toBe(true);
        done();
      });
    });

    it('should redirect to admin login when user is not authenticated', (done) => {
      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.and.returnValue(mockUrlTree);
      isAuthenticatedSubject.next(false);

      guard.canActivate().subscribe((result) => {
        expect(result).toBe(mockUrlTree);
        expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/admin/login']);
        done();
      });
    });

    it('should take only one emission from isAuthenticated$', (done) => {
      let emissionCount = 0;

      guard.canActivate().subscribe(() => {
        emissionCount++;
        expect(emissionCount).toBe(1);

        // Emit another value to test that take(1) works
        isAuthenticatedSubject.next(true);

        // Wait a bit to ensure no additional emissions
        setTimeout(() => {
          expect(emissionCount).toBe(1);
          done();
        }, 10);
      });

      isAuthenticatedSubject.next(false);
    });

    it('should handle authentication state changes correctly', (done) => {
      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.and.returnValue(mockUrlTree);

      // First test: not authenticated
      guard.canActivate().subscribe((result) => {
        expect(result).toBe(mockUrlTree);
        expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/admin/login']);

        // Second test: authenticated
        isAuthenticatedSubject.next(true);
        guard.canActivate().subscribe((secondResult) => {
          expect(secondResult).toBe(true);
          done();
        });
      });

      isAuthenticatedSubject.next(false);
    });
  });
});
