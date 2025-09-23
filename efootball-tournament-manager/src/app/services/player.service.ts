import { Injectable, OnDestroy } from '@angular/core';
import {
  Observable,
  BehaviorSubject,
  throwError,
  from,
  Subscription,
} from 'rxjs';
import { map, catchError, tap, switchMap, startWith } from 'rxjs/operators';
import { FirebaseService } from './firebase.service';
import { Player, validatePlayer } from '../models/player.model';

@Injectable({
  providedIn: 'root',
})
export class PlayerService implements OnDestroy {
  private readonly COLLECTION_NAME = 'players';
  private playersSubject = new BehaviorSubject<Player[]>([]);
  private isLoading = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private subscriptions: Subscription[] = [];

  constructor(private firebaseService: FirebaseService) {
    this.initializePlayersSubscription();
    this.setupConnectionStatusListener();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Get all players as an observable
   */
  getPlayers(): Observable<Player[]> {
    return this.playersSubject.asObservable();
  }

  /**
   * Get loading state
   */
  getLoadingState(): Observable<boolean> {
    return this.isLoading.asObservable();
  }

  /**
   * Get error state
   */
  getErrorState(): Observable<string | null> {
    return this.errorSubject.asObservable();
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Retry failed operations
   */
  retryOperation(): void {
    this.clearError();
    this.initializePlayersSubscription();
  }

  /**
   * Get a specific player by ID
   */
  getPlayerById(id: string): Observable<Player | null> {
    if (!id || id.trim().length === 0) {
      return throwError(() => new Error('Player ID is required'));
    }

    return this.firebaseService
      .getDocumentData<Player>(this.COLLECTION_NAME, id)
      .pipe(
        catchError((error) => {
          console.error(`Error fetching player ${id}:`, error);
          return throwError(
            () => new Error(`Failed to fetch player: ${error.message}`)
          );
        })
      );
  }

  /**
   * Add a new player
   */
  addPlayer(
    playerData: Omit<Player, 'id' | 'createdAt' | 'isActive'> & {
      isActive?: boolean;
    }
  ): Observable<Player> {
    // Validate player data
    const validationErrors = validatePlayer(playerData);
    if (validationErrors.length > 0) {
      return throwError(
        () => new Error(`Validation failed: ${validationErrors.join(', ')}`)
      );
    }

    // Check for duplicate names
    return this.checkDuplicateName(playerData.name).pipe(
      switchMap((isDuplicate) => {
        if (isDuplicate) {
          return throwError(
            () =>
              new Error(`Player with name "${playerData.name}" already exists`)
          );
        }

        // Create new player with generated ID and timestamp
        const newPlayer: Player = {
          id: this.generatePlayerId(),
          name: playerData.name.trim(),
          isActive: playerData.isActive ?? true,
          createdAt: new Date(),
        };

        return this.firebaseService
          .setDocument(this.COLLECTION_NAME, newPlayer.id, newPlayer)
          .pipe(
            map(() => newPlayer),
            tap(() => {
              console.log(`Player added successfully: ${newPlayer.name}`);
              this.refreshPlayers();
            }),
            catchError((error) => {
              console.error('Error adding player:', error);
              return throwError(
                () => new Error(`Failed to add player: ${error.message}`)
              );
            })
          );
      })
    );
  }

  /**
   * Update an existing player
   */
  updatePlayer(
    id: string,
    updates: Partial<Omit<Player, 'id' | 'createdAt'>>
  ): Observable<Player> {
    if (!id || id.trim().length === 0) {
      return throwError(() => new Error('Player ID is required'));
    }

    // Validate updates
    const validationErrors = validatePlayer(updates);
    if (validationErrors.length > 0) {
      return throwError(
        () => new Error(`Validation failed: ${validationErrors.join(', ')}`)
      );
    }

    // Check for duplicate names if name is being updated
    const checkDuplicate = updates.name
      ? this.checkDuplicateName(updates.name, id)
      : from([false]);

    return checkDuplicate.pipe(
      switchMap((isDuplicate) => {
        if (isDuplicate) {
          return throwError(
            () => new Error(`Player with name "${updates.name}" already exists`)
          );
        }

        // Prepare update data
        const updateData: Partial<Player> = {};
        if (updates.name !== undefined) {
          updateData.name = updates.name.trim();
        }
        if (updates.isActive !== undefined) {
          updateData.isActive = updates.isActive;
        }

        return this.firebaseService
          .updateDocument(this.COLLECTION_NAME, id, updateData)
          .pipe(
            switchMap(() => this.getPlayerById(id)),
            map((player) => {
              if (!player) {
                throw new Error('Player not found after update');
              }
              return player;
            }),
            tap(() => {
              console.log(`Player updated successfully: ${id}`);
              this.refreshPlayers();
            }),
            catchError((error) => {
              console.error('Error updating player:', error);
              return throwError(
                () => new Error(`Failed to update player: ${error.message}`)
              );
            })
          );
      })
    );
  }

  /**
   * Delete a player (soft delete by setting isActive to false)
   */
  deletePlayer(id: string): Observable<void> {
    if (!id || id.trim().length === 0) {
      return throwError(() => new Error('Player ID is required'));
    }

    return this.firebaseService
      .updateDocument(this.COLLECTION_NAME, id, { isActive: false })
      .pipe(
        tap(() => {
          console.log(`Player soft deleted: ${id}`);
          this.refreshPlayers();
        }),
        catchError((error) => {
          console.error('Error deleting player:', error);
          return throwError(
            () => new Error(`Failed to delete player: ${error.message}`)
          );
        })
      );
  }

  /**
   * Permanently delete a player (hard delete)
   */
  permanentlyDeletePlayer(id: string): Observable<void> {
    if (!id || id.trim().length === 0) {
      return throwError(() => new Error('Player ID is required'));
    }

    return this.firebaseService.deleteDocument(this.COLLECTION_NAME, id).pipe(
      tap(() => {
        console.log(`Player permanently deleted: ${id}`);
        this.refreshPlayers();
      }),
      catchError((error) => {
        console.error('Error permanently deleting player:', error);
        return throwError(
          () =>
            new Error(`Failed to permanently delete player: ${error.message}`)
        );
      })
    );
  }

  /**
   * Get active players only
   */
  getActivePlayers(): Observable<Player[]> {
    return this.getPlayers().pipe(
      map((players) => players.filter((player) => player.isActive))
    );
  }

  /**
   * Get player count
   */
  getPlayerCount(): Observable<number> {
    return this.getPlayers().pipe(map((players) => players.length));
  }

  /**
   * Get active player count
   */
  getActivePlayerCount(): Observable<number> {
    return this.getActivePlayers().pipe(map((players) => players.length));
  }

  /**
   * Check if minimum players requirement is met (5 players)
   */
  hasMinimumPlayers(): Observable<boolean> {
    return this.getActivePlayerCount().pipe(map((count) => count >= 5));
  }

  /**
   * Initialize real-time subscription to players collection with enhanced error handling
   */
  private initializePlayersSubscription(): void {
    this.isLoading.next(true);
    this.clearError();

    const subscription = this.firebaseService
      .getCollectionData<Player>(this.COLLECTION_NAME, 'players_main')
      .pipe(
        startWith([]), // Start with empty array to show loading state
        map((players) => {
          // Sort players by creation date (newest first)
          return players.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        })
      )
      .subscribe({
        next: (players) => {
          this.playersSubject.next(players);
          this.isLoading.next(false);
          this.clearError();
          console.log(`Players updated: ${players.length} players loaded`);
        },
        error: (error) => {
          console.error('Error in players subscription:', error);
          this.isLoading.next(false);
          this.errorSubject.next(
            error.message ||
              'Failed to load players. Please check your connection and try again.'
          );
          // Keep existing players in case of temporary connection issues
        },
      });

    this.subscriptions.push(subscription);
  }

  /**
   * Setup connection status listener to handle reconnections
   */
  private setupConnectionStatusListener(): void {
    const subscription = this.firebaseService.getConnectionStatus().subscribe({
      next: (status) => {
        if (status.isConnected && status.retryAttempts === 0) {
          // Connection restored, refresh data if we had an error
          if (this.errorSubject.value) {
            console.log('Connection restored, refreshing players data');
            this.initializePlayersSubscription();
          }
        }
      },
      error: (error) => {
        console.error('Connection status error:', error);
      },
    });

    this.subscriptions.push(subscription);
  }

  /**
   * Refresh players data
   */
  private refreshPlayers(): void {
    // The real-time subscription will automatically update the data
    // This method is kept for explicit refresh if needed
  }

  /**
   * Check if a player name already exists (excluding a specific player ID)
   */
  private checkDuplicateName(
    name: string,
    excludeId?: string
  ): Observable<boolean> {
    return this.getPlayers().pipe(
      map((players) => {
        const trimmedName = name.trim().toLowerCase();
        return players.some(
          (player) =>
            player.name.toLowerCase() === trimmedName &&
            player.id !== excludeId &&
            player.isActive
        );
      })
    );
  }

  /**
   * Generate a unique player ID
   */
  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
