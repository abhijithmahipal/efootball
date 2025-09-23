import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import {
  UiStateService,
  LoadingState,
  ErrorState,
  OfflineState,
} from '../../../services/ui-state.service';

@Component({
  selector: 'app-loading-error',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Loading State -->
    <div *ngIf="loadingState?.isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-message">
        <h4>{{ loadingState?.operation || 'Loading' }}...</h4>
        <p *ngIf="loadingState?.message">{{ loadingState?.message }}</p>
      </div>
    </div>

    <!-- Error State -->
    <div *ngIf="errorState?.hasError" class="error-container">
      <div class="error-icon">⚠️</div>
      <div class="error-content">
        <h4>Something went wrong</h4>
        <p>{{ errorState?.message || 'An unexpected error occurred' }}</p>
        <div class="error-actions">
          <button class="retry-button" (click)="onRetry()">Try Again</button>
          <button class="dismiss-button" (click)="onDismiss()">Dismiss</button>
        </div>
      </div>
    </div>

    <!-- Offline State -->
    <div *ngIf="offlineState?.isOffline" class="offline-container">
      <div class="offline-icon">📡</div>
      <div class="offline-content">
        <h4>You're offline</h4>
        <p>Please check your internet connection and try again.</p>
        <button
          *ngIf="offlineState?.canRetry"
          class="retry-button"
          (click)="onRetry()"
        >
          Retry
        </button>
      </div>
    </div>

    <!-- Content Slot -->
    <div
      *ngIf="!loadingState?.isLoading && !errorState?.hasError"
      class="content-container"
    >
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        text-align: center;
      }

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #007bff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .loading-message h4 {
        margin: 0 0 0.5rem 0;
        color: #333;
      }

      .loading-message p {
        margin: 0;
        color: #666;
        font-size: 0.9rem;
      }

      .error-container,
      .offline-container {
        display: flex;
        align-items: center;
        padding: 1rem;
        margin: 1rem 0;
        border-radius: 8px;
        background-color: #f8f9fa;
        border-left: 4px solid #dc3545;
      }

      .offline-container {
        border-left-color: #ffc107;
      }

      .error-icon,
      .offline-icon {
        font-size: 2rem;
        margin-right: 1rem;
      }

      .error-content,
      .offline-content {
        flex: 1;
      }

      .error-content h4,
      .offline-content h4 {
        margin: 0 0 0.5rem 0;
        color: #dc3545;
      }

      .offline-content h4 {
        color: #856404;
      }

      .error-content p,
      .offline-content p {
        margin: 0 0 1rem 0;
        color: #666;
      }

      .error-actions {
        display: flex;
        gap: 0.5rem;
      }

      .retry-button,
      .dismiss-button {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background-color 0.2s;
      }

      .retry-button {
        background-color: #007bff;
        color: white;
      }

      .retry-button:hover {
        background-color: #0056b3;
      }

      .dismiss-button {
        background-color: #6c757d;
        color: white;
      }

      .dismiss-button:hover {
        background-color: #545b62;
      }

      .content-container {
        min-height: 200px;
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .error-container,
        .offline-container {
          flex-direction: column;
          text-align: center;
        }

        .error-icon,
        .offline-icon {
          margin-right: 0;
          margin-bottom: 0.5rem;
        }

        .error-actions {
          justify-content: center;
        }
      }
    `,
  ],
})
export class LoadingErrorComponent implements OnInit, OnDestroy {
  @Input() showGlobalStates = true;
  @Input() customLoading: Observable<boolean> | null = null;
  @Input() customError: Observable<string | null> | null = null;
  @Input() loadingMessage = '';
  @Output() retry = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();

  loadingState: LoadingState | null = null;
  errorState: ErrorState | null = null;
  offlineState: OfflineState | null = null;

  private subscriptions: Subscription[] = [];

  constructor(private uiStateService: UiStateService) {}

  ngOnInit(): void {
    if (this.showGlobalStates) {
      this.setupGlobalStateSubscriptions();
    }

    if (this.customLoading) {
      this.setupCustomLoadingSubscription();
    }

    if (this.customError) {
      this.setupCustomErrorSubscription();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  onRetry(): void {
    this.retry.emit();
    if (this.showGlobalStates) {
      this.uiStateService.clearError();
    }
  }

  onDismiss(): void {
    this.dismiss.emit();
    if (this.showGlobalStates) {
      this.uiStateService.clearError();
    }
  }

  private setupGlobalStateSubscriptions(): void {
    const loadingSub = this.uiStateService
      .getLoadingState()
      .subscribe((state) => (this.loadingState = state));

    const errorSub = this.uiStateService
      .getErrorState()
      .subscribe((state) => (this.errorState = state));

    const offlineSub = this.uiStateService
      .getOfflineState()
      .subscribe((state) => (this.offlineState = state));

    this.subscriptions.push(loadingSub, errorSub, offlineSub);
  }

  private setupCustomLoadingSubscription(): void {
    if (this.customLoading) {
      const sub = this.customLoading.subscribe((isLoading) => {
        this.loadingState = {
          isLoading,
          message: this.loadingMessage,
        };
      });
      this.subscriptions.push(sub);
    }
  }

  private setupCustomErrorSubscription(): void {
    if (this.customError) {
      const sub = this.customError.subscribe((errorMessage) => {
        this.errorState = {
          hasError: !!errorMessage,
          message: errorMessage || undefined,
        };
      });
      this.subscriptions.push(sub);
    }
  }
}
