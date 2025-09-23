import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
  operation?: string;
  timestamp?: Date;
}

export interface OfflineState {
  isOffline: boolean;
  lastOnline?: Date;
  canRetry: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UiStateService {
  private loadingState = new BehaviorSubject<LoadingState>({
    isLoading: false,
  });
  private errorState = new BehaviorSubject<ErrorState>({ hasError: false });
  private offlineState = new BehaviorSubject<OfflineState>({
    isOffline: !navigator.onLine,
    canRetry: true,
  });

  constructor() {
    this.setupNetworkListeners();
  }

  /**
   * Get loading state observable
   */
  getLoadingState(): Observable<LoadingState> {
    return this.loadingState.asObservable();
  }

  /**
   * Get error state observable
   */
  getErrorState(): Observable<ErrorState> {
    return this.errorState.asObservable();
  }

  /**
   * Get offline state observable
   */
  getOfflineState(): Observable<OfflineState> {
    return this.offlineState.asObservable();
  }

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean, operation?: string, message?: string): void {
    this.loadingState.next({
      isLoading,
      operation,
      message,
    });
  }

  /**
   * Set error state
   */
  setError(
    hasError: boolean,
    message?: string,
    code?: string,
    operation?: string
  ): void {
    this.errorState.next({
      hasError,
      message,
      code,
      operation,
      timestamp: hasError ? new Date() : undefined,
    });
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.setError(false);
  }

  /**
   * Set offline state
   */
  setOffline(isOffline: boolean, canRetry: boolean = true): void {
    this.offlineState.next({
      isOffline,
      lastOnline: isOffline ? new Date() : undefined,
      canRetry,
    });
  }

  /**
   * Show loading with automatic timeout
   */
  showLoadingWithTimeout(
    operation: string,
    message: string,
    timeoutMs: number = 30000
  ): void {
    this.setLoading(true, operation, message);

    setTimeout(() => {
      if (
        this.loadingState.value.isLoading &&
        this.loadingState.value.operation === operation
      ) {
        this.setLoading(false);
        this.setError(
          true,
          'Operation timed out. Please try again.',
          'timeout',
          operation
        );
      }
    }, timeoutMs);
  }

  /**
   * Handle operation with loading and error states
   */
  handleOperation<T>(
    operation: Observable<T>,
    operationName: string,
    loadingMessage?: string
  ): Observable<T> {
    this.setLoading(true, operationName, loadingMessage);
    this.clearError();

    return new Observable<T>((observer) => {
      const subscription = operation.subscribe({
        next: (result) => {
          this.setLoading(false);
          observer.next(result);
        },
        error: (error) => {
          this.setLoading(false);
          this.setError(
            true,
            error.message || 'An error occurred',
            error.code,
            operationName
          );
          observer.error(error);
        },
        complete: () => {
          this.setLoading(false);
          observer.complete();
        },
      });

      return () => subscription.unsubscribe();
    });
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('Network came online');
      this.setOffline(false);
    });

    window.addEventListener('offline', () => {
      console.log('Network went offline');
      this.setOffline(true);
    });
  }

  /**
   * Get current states (for synchronous access)
   */
  getCurrentStates() {
    return {
      loading: this.loadingState.value,
      error: this.errorState.value,
      offline: this.offlineState.value,
    };
  }

  /**
   * Check if any operation is currently loading
   */
  isAnyOperationLoading(): boolean {
    return this.loadingState.value.isLoading;
  }

  /**
   * Check if there are any errors
   */
  hasAnyErrors(): boolean {
    return this.errorState.value.hasError;
  }

  /**
   * Check if the app is offline
   */
  isAppOffline(): boolean {
    return this.offlineState.value.isOffline;
  }
}
