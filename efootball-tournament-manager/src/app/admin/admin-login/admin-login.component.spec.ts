import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { AdminLoginComponent } from './admin-login.component';
import { AuthService } from '../../services/auth.service';

describe('AdminLoginComponent', () => {
  let component: AdminLoginComponent;
  let fixture: ComponentFixture<AdminLoginComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: Router;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'login',
      'isAuthenticated',
    ]);

    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent, ReactiveFormsModule, RouterTestingModule],
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
    mockAuthService = TestBed.inject(
      AuthService
    ) as jasmine.SpyObj<AuthService>;
    mockRouter = TestBed.inject(Router);
    spyOn(mockRouter, 'navigate');
  });

  beforeEach(() => {
    mockAuthService.isAuthenticated.and.returnValue(false);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize login form with empty values', () => {
      expect(component.loginForm).toBeDefined();
      expect(component.loginForm.get('email')?.value).toBe('');
      expect(component.loginForm.get('password')?.value).toBe('');
    });

    it('should have required validators on email and password fields', () => {
      const emailControl = component.loginForm.get('email');
      const passwordControl = component.loginForm.get('password');

      emailControl?.setValue('');
      passwordControl?.setValue('');

      expect(emailControl?.hasError('required')).toBeTruthy();
      expect(passwordControl?.hasError('required')).toBeTruthy();
    });

    it('should validate email format', () => {
      const emailControl = component.loginForm.get('email');

      emailControl?.setValue('invalid-email');
      expect(emailControl?.hasError('email')).toBeTruthy();

      emailControl?.setValue('valid@email.com');
      expect(emailControl?.hasError('email')).toBeFalsy();
    });

    it('should validate password minimum length', () => {
      const passwordControl = component.loginForm.get('password');

      passwordControl?.setValue('123');
      expect(passwordControl?.hasError('minlength')).toBeTruthy();

      passwordControl?.setValue('123456');
      expect(passwordControl?.hasError('minlength')).toBeFalsy();
    });
  });

  describe('Authentication Check', () => {
    it('should redirect to dashboard if already authenticated', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);

      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
    });

    it('should not redirect if not authenticated', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);

      component.ngOnInit();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should not submit if form is invalid', async () => {
      component.loginForm.patchValue({
        email: '',
        password: '',
      });

      await component.onSubmit();

      expect(mockAuthService.login).not.toHaveBeenCalled();
      expect(component.loginForm.get('email')?.touched).toBeTruthy();
      expect(component.loginForm.get('password')?.touched).toBeTruthy();
    });

    it('should submit valid form and redirect on success', async () => {
      const mockUser = { uid: 'test-uid', email: 'admin@test.com' };
      mockAuthService.login.and.returnValue(Promise.resolve(mockUser as any));

      component.loginForm.patchValue({
        email: 'admin@test.com',
        password: 'password123',
      });

      await component.onSubmit();

      expect(mockAuthService.login).toHaveBeenCalledWith(
        'admin@test.com',
        'password123'
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
      expect(component.errorMessage).toBe('');
    });

    it('should handle login errors and display appropriate messages', async () => {
      const loginError = { code: 'auth/user-not-found' };
      mockAuthService.login.and.returnValue(Promise.reject(loginError));

      component.loginForm.patchValue({
        email: 'admin@test.com',
        password: 'wrongpassword',
      });

      await component.onSubmit();

      expect(component.errorMessage).toBe(
        'Invalid email or password. Please try again.'
      );
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should set loading state during submission', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise<any>((resolve) => {
        resolveLogin = resolve;
      });
      mockAuthService.login.and.returnValue(loginPromise);

      component.loginForm.patchValue({
        email: 'admin@test.com',
        password: 'password123',
      });

      const submitPromise = component.onSubmit();
      expect(component.isLoading).toBeTruthy();

      resolveLogin!({ uid: 'test-uid' });
      await submitPromise;
      expect(component.isLoading).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    const errorTestCases = [
      {
        code: 'auth/user-not-found',
        expectedMessage: 'Invalid email or password. Please try again.',
      },
      {
        code: 'auth/wrong-password',
        expectedMessage: 'Invalid email or password. Please try again.',
      },
      {
        code: 'auth/invalid-email',
        expectedMessage: 'Please enter a valid email address.',
      },
      {
        code: 'auth/user-disabled',
        expectedMessage:
          'This account has been disabled. Please contact support.',
      },
      {
        code: 'auth/too-many-requests',
        expectedMessage: 'Too many failed attempts. Please try again later.',
      },
      {
        code: 'unknown-error',
        expectedMessage:
          'Login failed. Please check your connection and try again.',
      },
    ];

    errorTestCases.forEach(({ code, expectedMessage }) => {
      it(`should handle ${code} error correctly`, async () => {
        mockAuthService.login.and.returnValue(Promise.reject({ code }));

        component.loginForm.patchValue({
          email: 'admin@test.com',
          password: 'password123',
        });

        await component.onSubmit();

        expect(component.errorMessage).toBe(expectedMessage);
      });
    });
  });

  describe('Validation Helper Methods', () => {
    it('should correctly identify invalid fields', () => {
      const emailControl = component.loginForm.get('email');
      emailControl?.setValue('');
      emailControl?.markAsTouched();

      expect(component.isFieldInvalid('email')).toBeTruthy();

      emailControl?.setValue('valid@email.com');
      expect(component.isFieldInvalid('email')).toBeFalsy();
    });

    it('should return appropriate error messages', () => {
      const emailControl = component.loginForm.get('email');
      emailControl?.setValue('');
      emailControl?.markAsTouched();

      expect(component.getFieldError('email')).toBe('Email is required');

      emailControl?.setValue('invalid-email');
      expect(component.getFieldError('email')).toBe(
        'Please enter a valid email address'
      );

      const passwordControl = component.loginForm.get('password');
      passwordControl?.setValue('123');
      passwordControl?.markAsTouched();

      expect(component.getFieldError('password')).toBe(
        'Password must be at least 6 characters long'
      );
    });

    it('should return empty string for valid fields', () => {
      const emailControl = component.loginForm.get('email');
      emailControl?.setValue('valid@email.com');
      emailControl?.markAsTouched();

      expect(component.getFieldError('email')).toBe('');
    });
  });

  describe('Form Getters', () => {
    it('should provide access to email control', () => {
      expect(component.email).toBe(component.loginForm.get('email'));
    });

    it('should provide access to password control', () => {
      expect(component.password).toBe(component.loginForm.get('password'));
    });
  });

  describe('Template Integration', () => {
    it('should display error message when present', () => {
      component.errorMessage = 'Test error message';
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.alert-error');
      expect(errorElement?.textContent.trim()).toBe('Test error message');
    });

    it('should disable submit button when form is invalid', () => {
      component.loginForm.patchValue({
        email: '',
        password: '',
      });
      fixture.detectChanges();

      const submitButton = fixture.nativeElement.querySelector(
        'button[type="submit"]'
      );
      expect(submitButton?.disabled).toBeTruthy();
    });

    it('should disable submit button when loading', () => {
      component.isLoading = true;
      component.loginForm.patchValue({
        email: 'valid@email.com',
        password: 'password123',
      });
      fixture.detectChanges();

      const submitButton = fixture.nativeElement.querySelector(
        'button[type="submit"]'
      );
      expect(submitButton?.disabled).toBeTruthy();
    });

    it('should show loading text when submitting', () => {
      component.isLoading = true;
      fixture.detectChanges();

      const submitButton = fixture.nativeElement.querySelector(
        'button[type="submit"]'
      );
      expect(submitButton?.textContent.trim()).toBe('Signing in...');
    });
  });
});
