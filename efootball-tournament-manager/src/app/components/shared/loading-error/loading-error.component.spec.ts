import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingErrorComponent } from './loading-error.component';
import { UiStateService } from '../../../services/ui-state.service';
import { BehaviorSubject, of } from 'rxjs';

describe('LoadingErrorComponent', () => {
  let component: LoadingErrorComponent;
  let fixture: ComponentFixture<LoadingErrorComponent>;
  let mockUiStateService: jasmine.SpyObj<UiStateService>;

  beforeEach(async () => {
    const uiStateServiceSpy = jasmine.createSpyObj('UiStateService', [
      'getLoadingState',
      'getErrorState',
      'getOfflineState',
      'clearError',
    ]);

    await TestBed.configureTestingModule({
      imports: [LoadingErrorComponent],
      providers: [{ provide: UiStateService, useValue: uiStateServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingErrorComponent);
    component = fixture.componentInstance;
    mockUiStateService = TestBed.inject(
      UiStateService
    ) as jasmine.SpyObj<UiStateService>;

    // Setup default mock returns
    mockUiStateService.getLoadingState.and.returnValue(
      of({ isLoading: false })
    );
    mockUiStateService.getErrorState.and.returnValue(of({ hasError: false }));
    mockUiStateService.getOfflineState.and.returnValue(
      of({ isOffline: false, canRetry: true })
    );
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should setup global state subscriptions when showGlobalStates is true', () => {
      component.showGlobalStates = true;
      component.ngOnInit();

      expect(mockUiStateService.getLoadingState).toHaveBeenCalled();
      expect(mockUiStateService.getErrorState).toHaveBeenCalled();
      expect(mockUiStateService.getOfflineState).toHaveBeenCalled();
    });

    it('should not setup global state subscriptions when showGlobalStates is false', () => {
      component.showGlobalStates = false;
      component.ngOnInit();

      expect(mockUiStateService.getLoadingState).not.toHaveBeenCalled();
      expect(mockUiStateService.getErrorState).not.toHaveBeenCalled();
      expect(mockUiStateService.getOfflineState).not.toHaveBeenCalled();
    });
  });

  describe('Loading State Display', () => {
    it('should display loading state when loading', () => {
      component.loadingState = { isLoading: true, message: 'Loading data...' };
      fixture.detectChanges();

      const loadingElement =
        fixture.nativeElement.querySelector('.loading-container');
      expect(loadingElement).toBeTruthy();
      expect(loadingElement.textContent).toContain('Loading data...');
    });

    it('should display custom loading message', () => {
      component.loadingMessage = 'Custom loading message';
      component.loadingState = { isLoading: true };
      fixture.detectChanges();

      const loadingElement =
        fixture.nativeElement.querySelector('.loading-container');
      expect(loadingElement.textContent).toContain('Custom loading message');
    });

    it('should show loading spinner when loading', () => {
      component.loadingState = { isLoading: true };
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('.loading-spinner');
      expect(spinner).toBeTruthy();
    });
  });

  describe('Error State Display', () => {
    it('should display error state when there is an error', () => {
      component.errorState = {
        hasError: true,
        message: 'Something went wrong',
        operation: 'testOperation',
      };
      fixture.detectChanges();

      const errorElement =
        fixture.nativeElement.querySelector('.error-container');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('Something went wrong');
    });

    it('should display default error message when no specific message provided', () => {
      component.errorState = { hasError: true };
      fixture.detectChanges();

      const errorElement =
        fixture.nativeElement.querySelector('.error-container');
      expect(errorElement.textContent).toContain(
        'An unexpected error occurred'
      );
    });

    it('should show retry and dismiss buttons in error state', () => {
      component.errorState = { hasError: true, message: 'Test error' };
      fixture.detectChanges();

      const retryButton = fixture.nativeElement.querySelector('.retry-button');
      const dismissButton =
        fixture.nativeElement.querySelector('.dismiss-button');

      expect(retryButton).toBeTruthy();
      expect(dismissButton).toBeTruthy();
    });
  });

  describe('Offline State Display', () => {
    it('should display offline state when offline', () => {
      component.offlineState = { isOffline: true, canRetry: true };
      fixture.detectChanges();

      const offlineElement =
        fixture.nativeElement.querySelector('.offline-container');
      expect(offlineElement).toBeTruthy();
      expect(offlineElement.textContent).toContain("You're offline");
    });

    it('should show retry button when offline and can retry', () => {
      component.offlineState = { isOffline: true, canRetry: true };
      fixture.detectChanges();

      const retryButton = fixture.nativeElement.querySelector(
        '.offline-container .retry-button'
      );
      expect(retryButton).toBeTruthy();
    });

    it('should not show retry button when offline but cannot retry', () => {
      component.offlineState = { isOffline: true, canRetry: false };
      fixture.detectChanges();

      const retryButton = fixture.nativeElement.querySelector(
        '.offline-container .retry-button'
      );
      expect(retryButton).toBeFalsy();
    });
  });

  describe('Content Display', () => {
    it('should display content when not loading and no errors', () => {
      component.loadingState = { isLoading: false };
      component.errorState = { hasError: false };
      fixture.detectChanges();

      const contentElement =
        fixture.nativeElement.querySelector('.content-container');
      expect(contentElement).toBeTruthy();
    });

    it('should not display content when loading', () => {
      component.loadingState = { isLoading: true };
      component.errorState = { hasError: false };
      fixture.detectChanges();

      const contentElement =
        fixture.nativeElement.querySelector('.content-container');
      expect(contentElement).toBeFalsy();
    });

    it('should not display content when there is an error', () => {
      component.loadingState = { isLoading: false };
      component.errorState = { hasError: true };
      fixture.detectChanges();

      const contentElement =
        fixture.nativeElement.querySelector('.content-container');
      expect(contentElement).toBeFalsy();
    });
  });

  describe('Event Handling', () => {
    it('should emit retry event when retry button is clicked', () => {
      spyOn(component.retry, 'emit');

      component.onRetry();

      expect(component.retry.emit).toHaveBeenCalled();
    });

    it('should emit dismiss event when dismiss button is clicked', () => {
      spyOn(component.dismiss, 'emit');

      component.onDismiss();

      expect(component.dismiss.emit).toHaveBeenCalled();
    });

    it('should clear global error when dismiss is called with global states', () => {
      component.showGlobalStates = true;

      component.onDismiss();

      expect(mockUiStateService.clearError).toHaveBeenCalled();
    });

    it('should clear global error when retry is called with global states', () => {
      component.showGlobalStates = true;

      component.onRetry();

      expect(mockUiStateService.clearError).toHaveBeenCalled();
    });
  });

  describe('Custom Observables', () => {
    it('should setup custom loading subscription when provided', () => {
      const customLoading = new BehaviorSubject(true);
      component.customLoading = customLoading.asObservable();
      component.loadingMessage = 'Custom loading';

      component.ngOnInit();

      expect(component.loadingState).toEqual({
        isLoading: true,
        message: 'Custom loading',
      });
    });

    it('should setup custom error subscription when provided', () => {
      const customError = new BehaviorSubject('Custom error message');
      component.customError = customError.asObservable();

      component.ngOnInit();

      expect(component.errorState).toEqual({
        hasError: true,
        message: 'Custom error message',
      });
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from all subscriptions on destroy', () => {
      component.ngOnInit();

      // Add some subscriptions
      const subscription1 = of(true).subscribe();
      const subscription2 = of(false).subscribe();
      (component as any).subscriptions = [subscription1, subscription2];

      spyOn(subscription1, 'unsubscribe');
      spyOn(subscription2, 'unsubscribe');

      component.ngOnDestroy();

      expect(subscription1.unsubscribe).toHaveBeenCalled();
      expect(subscription2.unsubscribe).toHaveBeenCalled();
    });
  });
});
