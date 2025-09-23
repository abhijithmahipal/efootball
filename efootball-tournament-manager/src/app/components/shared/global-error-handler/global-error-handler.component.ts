import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import {
  UiStateService,
  ErrorState,
  OfflineState,
} from '../../../services/ui-state.service';
import { OfflineDetectionService } from '../../../services/offline-detection.service';

@Component({
  selector: 'app-global-error-handler',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Offline Banner -->
    <div *ngIf="isOffline$ | async" class="offline-banner">
      <div class="offline-content">
        <span class="offline-icon">📡</span>
        <span class="offline-text"
          >You're currently offline. Some features may not work properly.</span
        >
        <button class="retry-button" (click)="checkConnection()">
          Check Connection
        </button>
      </div>
    </div>

    <!-- Global Error Toast -->
    <div
      *ngIf="errorState$ | async as error"
      class="error-toast"
      [class.show]="error.hasError"
    >
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <div class="error-message">
          <strong>Error:</strong> {{ error.message }}
        </div>
        <button class="close-button" (click)="dismissError()">×</button>
      </div>
    </div>
  `,
  styles: [
    `
      .offline-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background-color: #ff9800;
        color: white;
        padding: 0.75rem;
        z-index: 9999;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .offline-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        max-width: 1200px;
        margin: 0 auto;
      }

      .offline-icon {
        font-size: 1.2rem;
      }

      .offline-text {
        flex: 1;
        text-align: center;
      }

      .retry-button {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.875rem;
        transition: background-color 0.2s;
      }

      .retry-button:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .error-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #f44336;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        max-width: 400px;
        transform: translateX(100%);
        transition: transform 0.3s ease-in-out;
      }

      .error-toast.show {
        transform: translateX(0);
      }

      .error-content {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .error-icon {
        font-size: 1.25rem;
        flex-shrink: 0;
      }

      .error-message {
        flex: 1;
        line-height: 1.4;
      }

      .close-button {
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        flex-shrink: 0;
      }

      .close-button:hover {
        opacity: 0.8;
      }

      @media (max-width: 768px) {
        .offline-content {
          flex-direction: column;
          gap: 0.5rem;
        }

        .offline-text {
          text-align: center;
        }

        .error-toast {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
      }
    `,
  ],
})
export class GlobalErrorHandlerComponent implements OnInit, OnDestroy {
  errorState$: Observable<ErrorState>;
  isOffline$: Observable<boolean>;

  private subscriptions: Subscription[] = [];

  constructor(
    private uiStateService: UiStateService,
    private offlineDetectionService: OfflineDetectionService
  ) {
    this.errorState$ = this.uiStateService.getErrorState();
    this.isOffline$ = this.offlineDetectionService.getOfflineStatus();
  }

  ngOnInit(): void {
    // Auto-dismiss errors after 5 seconds
    const errorSub = this.errorState$.subscribe((error) => {
      if (error.hasError) {
        setTimeout(() => {
          this.dismissError();
        }, 5000);
      }
    });

    this.subscriptions.push(errorSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  dismissError(): void {
    this.uiStateService.clearError();
  }

  checkConnection(): void {
    // Force a connection check by attempting to fetch a small resource
    fetch('/favicon.ico', {
      method: 'HEAD',
      cache: 'no-cache',
    })
      .then(() => {
        console.log('Connection check successful');
      })
      .catch(() => {
        console.log('Still offline');
      });
  }
}
