import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PlayerService } from '../../services/player.service';
import { Player } from '../../models/player.model';
import { LoadingErrorComponent } from '../../components/shared/loading-error/loading-error.component';

@Component({
  selector: 'app-player-management',
  imports: [CommonModule, ReactiveFormsModule, LoadingErrorComponent],
  templateUrl: './player-management.component.html',
  styleUrl: './player-management.component.css',
})
export class PlayerManagementComponent implements OnInit, OnDestroy {
  players$: Observable<Player[]>;
  isLoading$: Observable<boolean>;
  error$: Observable<string | null>;
  hasMinimumPlayers$: Observable<boolean>;

  playerForm!: FormGroup;
  editingPlayer: Player | null = null;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  showDeleteConfirm = false;
  playerToDelete: Player | null = null;

  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private playerService: PlayerService) {
    this.players$ = this.playerService.getPlayers();
    this.isLoading$ = this.playerService.getLoadingState();
    this.error$ = this.playerService.getErrorState();
    this.hasMinimumPlayers$ = this.playerService.hasMinimumPlayers();
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle retry operation
   */
  onRetry(): void {
    this.playerService.retryOperation();
  }

  private initializeForm(): void {
    this.playerForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
        ],
      ],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.playerForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const playerName = this.playerForm.get('name')?.value?.trim();

      if (this.editingPlayer) {
        // Update existing player
        this.playerService
          .updatePlayer(this.editingPlayer.id, {
            name: playerName,
          })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (player) => {
              this.successMessage = `Player "${playerName}" updated successfully!`;
              this.cancelEdit();
              this.isSubmitting = false;

              // Clear success message after 3 seconds
              setTimeout(() => {
                this.successMessage = '';
              }, 3000);
            },
            error: (error) => {
              this.handleError(error);
              this.isSubmitting = false;
            },
          });
        return; // Exit early to avoid the finally block
      } else {
        // Add new player
        this.playerService
          .addPlayer({
            name: playerName,
          })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (player) => {
              this.successMessage = `Player "${playerName}" added successfully!`;
              this.playerForm.reset();
              this.isSubmitting = false;

              // Clear success message after 3 seconds
              setTimeout(() => {
                this.successMessage = '';
              }, 3000);
            },
            error: (error) => {
              this.handleError(error);
              this.isSubmitting = false;
            },
          });
        return; // Exit early to avoid the finally block

        this.successMessage = `Player "${playerName}" added successfully!`;
        this.playerForm.reset();
      }
    } catch (error: any) {
      this.handleError(error);
      this.isSubmitting = false;
    }
  }

  editPlayer(player: Player): void {
    this.editingPlayer = player;
    this.playerForm.patchValue({
      name: player.name,
    });
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEdit(): void {
    this.editingPlayer = null;
    this.playerForm.reset();
    this.errorMessage = '';
  }

  confirmDelete(player: Player): void {
    this.playerToDelete = player;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.playerToDelete = null;
    this.showDeleteConfirm = false;
  }

  async deletePlayer(): Promise<void> {
    if (!this.playerToDelete) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.playerService
      .deletePlayer(this.playerToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = `Player "${
            this.playerToDelete!.name
          }" deleted successfully!`;
          this.cancelDelete();
          this.isSubmitting = false;

          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          this.handleError(error);
          this.cancelDelete();
          this.isSubmitting = false;
        },
      });
  }

  private handleError(error: any): void {
    console.error('Player management error:', error);

    if (error.message?.includes('already exists')) {
      this.errorMessage =
        'A player with this name already exists. Please choose a different name.';
    } else if (error.message?.includes('Validation failed')) {
      this.errorMessage = 'Please check your input and try again.';
    } else if (error.message?.includes('Player ID is required')) {
      this.errorMessage = 'Invalid player selected. Please try again.';
    } else {
      this.errorMessage =
        'An error occurred. Please check your connection and try again.';
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.playerForm.controls).forEach((key) => {
      const control = this.playerForm.get(key);
      control?.markAsTouched();
    });
  }

  // Getter methods for template access
  get name() {
    return this.playerForm.get('name');
  }

  // Helper methods for validation display
  isFieldInvalid(fieldName: string): boolean {
    const field = this.playerForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.playerForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) {
        return 'Player name is required';
      }
      if (field.errors['minlength']) {
        return 'Player name must be at least 2 characters long';
      }
      if (field.errors['maxlength']) {
        return 'Player name cannot exceed 50 characters';
      }
    }
    return '';
  }

  // Helper method to get active players count
  getActivePlayersCount(players: Player[]): number {
    return players.filter((player) => player.isActive).length;
  }

  // Helper method to check if player is active
  isPlayerActive(player: Player): boolean {
    return player.isActive;
  }

  // TrackBy function for ngFor performance
  trackByPlayerId(index: number, player: Player): string {
    return player.id;
  }

  // Helper method to safely get player date
  getPlayerDate(createdAt: any): Date {
    if (!createdAt) {
      return new Date();
    }

    // If it's already a Date object
    if (createdAt instanceof Date) {
      return createdAt;
    }

    // If it's a Firestore Timestamp with toDate method
    if (createdAt && typeof createdAt.toDate === 'function') {
      return createdAt.toDate();
    }

    // If it's a timestamp-like object with seconds
    if (createdAt && typeof createdAt.seconds === 'number') {
      return new Date(createdAt.seconds * 1000);
    }

    // Try to parse as string or number
    const date = new Date(createdAt);
    return isNaN(date.getTime()) ? new Date() : date;
  }
}
