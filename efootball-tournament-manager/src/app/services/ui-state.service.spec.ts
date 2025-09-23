import { TestBed } from '@angular/core/testing';
import {
  UiStateService,
  LoadingState,
  ErrorState,
  OfflineState,
} from './ui-state.service';
import { of, throwError, delay } from 'rxjs';

describe('UiStateService', () => {
  let service: UiStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UiStateService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default states', (done) => {
      service.getLoadingState().subscribe((state) => {
        expect(state.isLoading).toBeFalse();
        expect(state.operation).toBeUndefined();
        expect(state.message).toBeUndefined();
      });

      service.getErrorState().subscribe((state) => {
        expect(state.hasError).toBeFalse();
        expect(state.message).toBeUndefined();
      });

      service.getOfflineState().subscribe((state) => {
        expect(state.isOffline).toBe(!navigator.onLine);
        expect(state.canRetry).toBeTrue();
        done();
      });
    });
  });

  describe('Loading State Management', () => {
    it('should set loading state', (done) => {
      service.setLoading(true, 'testOperation', 'Loading test data...');

      service.getLoadingState().subscribe((state) => {
        expect(state.isLoading).toBeTrue();
        expect(state.operation).toBe('testOperation');
        expect(state.message).toBe('Loading test data...');
        done();
      });
    });

    it('should clear loading state', (done) => {
      service.setLoading(true, 'testOperation');
      service.setLoading(false);

      service.getLoadingState().subscribe((state) => {
        expect(state.isLoading).toBeFalse();
        done();
      });
    });

    it('should show loading with timeout', (done) => {
      service.showLoadingWithTimeout('testOp', 'Testing...', 100);

      service.getLoadingState().subscribe((state) => {
        if (state.isLoading) {
          expect(state.operation).toBe('testOp');
          expect(state.message).toBe('Testing...');
        }
      });

      // Check error state after timeout
      setTimeout(() => {
        service.getErrorState().subscribe((errorState) => {
          expect(errorState.hasError).toBeTrue();
          expect(errorState.message).toContain('timed out');
          done();
        });
      }, 150);
    });

    it('should check if any operation is loading', () => {
      service.setLoading(false);
      expect(service.isAnyOperationLoading()).toBeFalse();

      service.setLoading(true, 'test');
      expect(service.isAnyOperationLoading()).toBeTrue();
    });
  });

  describe('Error State Management', () => {
    it('should set error state', (done) => {
      service.setError(true, 'Test error', 'test-code', 'testOperation');

      service.getErrorState().subscribe((state) => {
        expect(state.hasError).toBeTrue();
        expect(state.message).toBe('Test error');
        expect(state.code).toBe('test-code');
        expect(state.operation).toBe('testOperation');
        expect(state.timestamp).toBeInstanceOf(Date);
        done();
      });
    });

    it('should clear error state', (done) => {
      service.setError(true, 'Test error');
      service.clearError();

      service.getErrorState().subscribe((state) => {
        expect(state.hasError).toBeFalse();
        expect(state.message).toBeUndefined();
        done();
      });
    });

    it('should check if there are any errors', () => {
      service.clearError();
      expect(service.hasAnyErrors()).toBeFalse();

      service.setError(true, 'Test error');
      expect(service.hasAnyErrors()).toBeTrue();
    });
  });

  describe('Offline State Management', () => {
    it('should set offline state', (done) => {
      service.setOffline(true, false);

      service.getOfflineState().subscribe((state) => {
        expect(state.isOffline).toBeTrue();
        expect(state.canRetry).toBeFalse();
        expect(state.lastOnline).toBeInstanceOf(Date);
        done();
      });
    });

    it('should set online state', (done) => {
      service.setOffline(false);

      service.getOfflineState().subscribe((state) => {
        expect(state.isOffline).toBeFalse();
        expect(state.lastOnline).toBeUndefined();
        done();
      });
    });

    it('should check if app is offline', () => {
      service.setOffline(false);
      expect(service.isAppOffline()).toBeFalse();

      service.setOffline(true);
      expect(service.isAppOffline()).toBeTrue();
    });
  });

  describe('Operation Handling', () => {
    it('should handle successful operations', (done) => {
      const mockOperation = of('success').pipe(delay(10));

      const result$ = service.handleOperation(
        mockOperation,
        'testOperation',
        'Processing...'
      );

      // Check loading state is set
      service.getLoadingState().subscribe((loadingState) => {
        if (loadingState.isLoading) {
          expect(loadingState.operation).toBe('testOperation');
          expect(loadingState.message).toBe('Processing...');
        }
      });

      result$.subscribe({
        next: (result) => {
          expect(result).toBe('success');

          // Check loading is cleared
          service.getLoadingState().subscribe((loadingState) => {
            expect(loadingState.isLoading).toBeFalse();
          });

          // Check no error
          service.getErrorState().subscribe((errorState) => {
            expect(errorState.hasError).toBeFalse();
            done();
          });
        },
      });
    });

    it('should handle failed operations', (done) => {
      const mockError = new Error('Operation failed');
      const mockOperation = throwError(() => mockError);

      const result$ = service.handleOperation(
        mockOperation,
        'testOperation',
        'Processing...'
      );

      result$.subscribe({
        error: (error) => {
          expect(error).toBe(mockError);

          // Check loading is cleared
          service.getLoadingState().subscribe((loadingState) => {
            expect(loadingState.isLoading).toBeFalse();
          });

          // Check error is set
          service.getErrorState().subscribe((errorState) => {
            expect(errorState.hasError).toBeTrue();
            expect(errorState.message).toBe('Operation failed');
            expect(errorState.operation).toBe('testOperation');
            done();
          });
        },
      });
    });
  });

  describe('Network Event Handling', () => {
    it('should handle online event', (done) => {
      // Simulate going offline first
      service.setOffline(true);

      // Simulate online event
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      // Give some time for event to be processed
      setTimeout(() => {
        service.getOfflineState().subscribe((state) => {
          expect(state.isOffline).toBeFalse();
          done();
        });
      }, 10);
    });

    it('should handle offline event', (done) => {
      // Simulate going online first
      service.setOffline(false);

      // Simulate offline event
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);

      // Give some time for event to be processed
      setTimeout(() => {
        service.getOfflineState().subscribe((state) => {
          expect(state.isOffline).toBeTrue();
          done();
        });
      }, 10);
    });
  });

  describe('Current States Access', () => {
    it('should provide current states synchronously', () => {
      service.setLoading(true, 'test');
      service.setError(true, 'error');
      service.setOffline(true);

      const states = service.getCurrentStates();

      expect(states.loading.isLoading).toBeTrue();
      expect(states.error.hasError).toBeTrue();
      expect(states.offline.isOffline).toBeTrue();
    });
  });
});
