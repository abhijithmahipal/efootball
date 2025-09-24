import { Injectable, OnDestroy } from '@angular/core';
import {
  Observable,
  BehaviorSubject,
  throwError,
  from,
  combineLatest,
  Subscription,
} from 'rxjs';
import { map, catchError, tap, switchMap, startWith } from 'rxjs/operators';
import { FirebaseService } from './firebase.service';
import { PlayerService } from './player.service';
import { Match, validateMatch } from '../models/match.model';
import { Player } from '../models/player.model';
import { PlayoffRound } from '../models/enums';

export interface ScheduleGenerationResult {
  matches: Match[];
  totalMatchdays: number;
  totalMatches: number;
}

export interface PlayoffBracket {
  semifinals: Match[];
  final?: Match;
  thirdPlace?: Match;
}

@Injectable({
  providedIn: 'root',
})
export class MatchService implements OnDestroy {
  private readonly COLLECTION_NAME = 'matches';
  private matchesSubject = new BehaviorSubject<Match[]>([]);
  private isLoading = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private subscriptions: Subscription[] = [];

  constructor(
    private firebaseService: FirebaseService,
    private playerService: PlayerService
  ) {
    this.initializeMatchesSubscription();
    this.setupConnectionStatusListener();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Get all matches as an observable
   */
  getMatches(): Observable<Match[]> {
    return this.matchesSubject.asObservable();
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
    this.initializeMatchesSubscription();
  }

  /**
   * Get league matches only
   */
  getLeagueMatches(): Observable<Match[]> {
    return this.getMatches().pipe(
      map((matches) => matches.filter((match) => !match.isPlayoff))
    );
  }

  /**
   * Get playoff matches only
   */
  getPlayoffMatches(): Observable<Match[]> {
    return this.getMatches().pipe(
      map((matches) => matches.filter((match) => match.isPlayoff))
    );
  }

  /**
   * Get matches by matchday
   */
  getMatchesByMatchday(matchday: number): Observable<Match[]> {
    return this.getMatches().pipe(
      map((matches) => matches.filter((match) => match.matchday === matchday))
    );
  }

  /**
   * Get a specific match by ID
   */
  getMatchById(id: string): Observable<Match | null> {
    if (!id || id.trim().length === 0) {
      return throwError(() => new Error('Match ID is required'));
    }

    return this.firebaseService
      .getDocumentData<Match>(this.COLLECTION_NAME, id)
      .pipe(
        catchError((error) => {
          console.error(`Error fetching match ${id}:`, error);
          return throwError(
            () => new Error(`Failed to fetch match: ${error.message}`)
          );
        })
      );
  }

  /**
   * Generate round-robin schedule for active players
   */
  generateRoundRobinSchedule(): Observable<ScheduleGenerationResult> {
    return this.playerService.getActivePlayers().pipe(
      switchMap((players) => {
        if (players.length < 5) {
          return throwError(
            () =>
              new Error(
                'Minimum 5 active players required to generate schedule'
              )
          );
        }

        const matches = this.createRoundRobinMatches(players);
        const totalMatchdays = this.calculateTotalMatchdays(players.length);

        // Save all matches to Firestore
        const savePromises = matches.map((match) =>
          this.firebaseService
            .setDocument(this.COLLECTION_NAME, match.id, match)
            .toPromise()
        );

        return from(Promise.all(savePromises)).pipe(
          map(() => ({
            matches,
            totalMatchdays,
            totalMatches: matches.length,
          })),
          tap(() => {
            console.log(
              `Generated ${matches.length} matches for ${players.length} players`
            );
            this.refreshMatches();
          }),
          catchError((error) => {
            console.error('Error saving matches:', error);
            return throwError(
              () => new Error(`Failed to save matches: ${error.message}`)
            );
          })
        );
      })
    );
  }

  /**
   * Update match result
   */
  updateMatchResult(
    matchId: string,
    homeGoals: number,
    awayGoals: number
  ): Observable<Match> {
    if (!matchId || matchId.trim().length === 0) {
      return throwError(() => new Error('Match ID is required'));
    }

    if (
      homeGoals < 0 ||
      awayGoals < 0 ||
      !Number.isInteger(homeGoals) ||
      !Number.isInteger(awayGoals)
    ) {
      return throwError(() => new Error('Goals must be non-negative integers'));
    }

    const updateData = {
      homeGoals,
      awayGoals,
      isPlayed: true,
    };

    return this.firebaseService
      .updateDocument(this.COLLECTION_NAME, matchId, updateData)
      .pipe(
        switchMap(() => this.getMatchById(matchId)),
        map((match) => {
          if (!match) {
            throw new Error('Match not found after update');
          }
          return match;
        }),
        tap(() => {
          console.log(
            `Match result updated: ${matchId} (${homeGoals}-${awayGoals})`
          );
          this.refreshMatches();
        }),
        catchError((error) => {
          console.error('Error updating match result:', error);
          return throwError(
            () => new Error(`Failed to update match result: ${error.message}`)
          );
        })
      );
  }

  /**
   * Generate playoff bracket based on league standings
   */
  generatePlayoffBracket(
    standings: { playerId: string; playerName: string; points: number }[]
  ): Observable<PlayoffBracket> {
    if (standings.length < 4) {
      return throwError(
        () => new Error('At least 4 players required for playoffs')
      );
    }

    // Sort by points (descending) and take top 4
    const topFour = standings.sort((a, b) => b.points - a.points).slice(0, 4);

    const semifinals: Match[] = [
      // 1st vs 4th
      this.createPlayoffMatch(
        topFour[0].playerId,
        topFour[0].playerName,
        topFour[3].playerId,
        topFour[3].playerName,
        PlayoffRound.SEMIFINAL,
        1
      ),
      // 2nd vs 3rd
      this.createPlayoffMatch(
        topFour[1].playerId,
        topFour[1].playerName,
        topFour[2].playerId,
        topFour[2].playerName,
        PlayoffRound.SEMIFINAL,
        2
      ),
    ];

    // Save semifinals to Firestore
    const savePromises = semifinals.map((match) =>
      this.firebaseService
        .setDocument(this.COLLECTION_NAME, match.id, match)
        .toPromise()
    );

    return from(Promise.all(savePromises)).pipe(
      map(() => ({ semifinals })),
      tap(() => {
        console.log('Playoff semifinals generated');
        this.refreshMatches();
      }),
      catchError((error) => {
        console.error('Error saving playoff matches:', error);
        return throwError(
          () => new Error(`Failed to save playoff matches: ${error.message}`)
        );
      })
    );
  }

  /**
   * Generate final and third-place matches based on semifinal results
   */
  generateFinalMatches(
    semifinalResults: {
      matchId: string;
      winnerId: string;
      winnerName: string;
      loserId: string;
      loserName: string;
    }[]
  ): Observable<PlayoffBracket> {
    if (semifinalResults.length !== 2) {
      return throwError(
        () => new Error('Exactly 2 semifinal results required')
      );
    }

    const final = this.createPlayoffMatch(
      semifinalResults[0].winnerId,
      semifinalResults[0].winnerName,
      semifinalResults[1].winnerId,
      semifinalResults[1].winnerName,
      PlayoffRound.FINAL,
      1
    );

    const thirdPlace = this.createPlayoffMatch(
      semifinalResults[0].loserId,
      semifinalResults[0].loserName,
      semifinalResults[1].loserId,
      semifinalResults[1].loserName,
      PlayoffRound.THIRD_PLACE,
      1
    );

    const finalMatches = [final, thirdPlace];
    const savePromises = finalMatches.map((match) =>
      this.firebaseService
        .setDocument(this.COLLECTION_NAME, match.id, match)
        .toPromise()
    );

    return from(Promise.all(savePromises)).pipe(
      map(() => ({ semifinals: [], final, thirdPlace })),
      tap(() => {
        console.log('Final and third-place matches generated');
        this.refreshMatches();
      }),
      catchError((error) => {
        console.error('Error saving final matches:', error);
        return throwError(
          () => new Error(`Failed to save final matches: ${error.message}`)
        );
      })
    );
  }

  /**
   * Delete all matches (for resetting tournament)
   */
  deleteAllMatches(): Observable<void> {
    return this.getMatches().pipe(
      switchMap((matches) => {
        if (matches.length === 0) {
          return from([]);
        }

        const deletePromises = matches.map((match) =>
          this.firebaseService
            .deleteDocument(this.COLLECTION_NAME, match.id)
            .toPromise()
        );

        return from(Promise.all(deletePromises));
      }),
      map(() => void 0),
      tap(() => {
        console.log('All matches deleted');
        this.refreshMatches();
      }),
      catchError((error) => {
        console.error('Error deleting matches:', error);
        return throwError(
          () => new Error(`Failed to delete matches: ${error.message}`)
        );
      })
    );
  }

  /**
   * Get match statistics
   */
  getMatchStatistics(): Observable<{
    totalMatches: number;
    playedMatches: number;
    pendingMatches: number;
    leagueMatches: number;
    playoffMatches: number;
  }> {
    return this.getMatches().pipe(
      map((matches) => ({
        totalMatches: matches.length,
        playedMatches: matches.filter((m) => m.isPlayed).length,
        pendingMatches: matches.filter((m) => !m.isPlayed).length,
        leagueMatches: matches.filter((m) => !m.isPlayoff).length,
        playoffMatches: matches.filter((m) => m.isPlayoff).length,
      }))
    );
  }

  /**
   * Create round-robin matches for given players using proper round-robin algorithm
   *
   * This algorithm ensures:
   * - Each player plays exactly once per matchday
   * - Complete double round-robin (each player plays every other player twice - home and away)
   * - Optimal scheduling with minimum number of matchdays
   *
   * Algorithm explanation:
   * 1. If odd number of players, add a "bye" player
   * 2. Fix one player in position, rotate others around
   * 3. Each round generates n/2 matches where each player plays exactly once
   * 4. Generate both home and away fixtures for complete double round-robin
   */
  private createRoundRobinMatches(players: Player[]): Match[] {
    const matches: Match[] = [];
    const n = players.length;

    // If odd number of players, add a "bye" placeholder
    const playersWithBye = [...players];
    if (n % 2 === 1) {
      playersWithBye.push({
        id: 'bye',
        name: 'BYE',
        isActive: true,
        createdAt: new Date(),
      });
    }

    const totalPlayers = playersWithBye.length;
    const totalRounds = totalPlayers - 1;

    // Generate matches for each round (matchday)
    for (let round = 0; round < totalRounds; round++) {
      const matchday = round + 1;
      const roundMatches: Match[] = [];

      // Create matches for this round
      for (let i = 0; i < totalPlayers / 2; i++) {
        const player1Index = i;
        const player2Index = totalPlayers - 1 - i;

        const player1 = playersWithBye[player1Index];
        const player2 = playersWithBye[player2Index];

        // Skip matches involving the "bye" player
        if (player1.id !== 'bye' && player2.id !== 'bye') {
          // Create both home and away matches for complete double round-robin
          roundMatches.push(this.createLeagueMatch(player1, player2, matchday));
          roundMatches.push(
            this.createLeagueMatch(player2, player1, matchday + totalRounds)
          );
        }
      }

      matches.push(...roundMatches);

      // Rotate players (except the first one which stays fixed)
      if (totalPlayers > 2) {
        const lastPlayer = playersWithBye.pop()!;
        playersWithBye.splice(1, 0, lastPlayer);
      }
    }

    return matches;
  }

  /**
   * Create a league match
   */
  private createLeagueMatch(
    homePlayer: Player,
    awayPlayer: Player,
    matchday: number
  ): Match {
    return {
      id: this.generateMatchId(),
      homePlayerId: homePlayer.id,
      awayPlayerId: awayPlayer.id,
      homePlayerName: homePlayer.name,
      awayPlayerName: awayPlayer.name,
      matchday,
      isPlayed: false,
      isPlayoff: false,
      createdAt: new Date(),
    };
  }

  /**
   * Create a playoff match
   */
  private createPlayoffMatch(
    homePlayerId: string,
    homePlayerName: string,
    awayPlayerId: string,
    awayPlayerName: string,
    playoffRound: PlayoffRound,
    matchday: number
  ): Match {
    return {
      id: this.generateMatchId(),
      homePlayerId,
      awayPlayerId,
      homePlayerName,
      awayPlayerName,
      matchday,
      isPlayed: false,
      isPlayoff: true,
      playoffRound,
      createdAt: new Date(),
    };
  }

  /**
   * Calculate total matchdays needed for round-robin tournament
   */
  private calculateTotalMatchdays(playerCount: number): number {
    // For a double round-robin tournament:
    // - Each player plays every other player twice (home and away)
    // - With proper scheduling, we need 2 * (n-1) matchdays for n players
    // - If odd number of players, one player gets a "bye" each round
    const adjustedPlayerCount =
      playerCount % 2 === 0 ? playerCount : playerCount + 1;
    return 2 * (adjustedPlayerCount - 1);
  }

  /**
   * Initialize real-time subscription to matches collection with enhanced error handling
   */
  private initializeMatchesSubscription(): void {
    this.isLoading.next(true);
    this.clearError();

    const subscription = this.firebaseService
      .getCollectionData<Match>(this.COLLECTION_NAME, 'matches_main')
      .pipe(
        startWith([]), // Start with empty array to show loading state
        map((matches) => {
          // Sort matches by matchday, then by creation date
          return matches.sort((a, b) => {
            if (a.matchday !== b.matchday) {
              return a.matchday - b.matchday;
            }
            return (
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });
        })
      )
      .subscribe({
        next: (matches) => {
          this.matchesSubject.next(matches);
          this.isLoading.next(false);
          this.clearError();
          console.log(`Matches updated: ${matches.length} matches loaded`);
        },
        error: (error) => {
          console.error('Error in matches subscription:', error);
          this.isLoading.next(false);
          this.errorSubject.next(
            error.message ||
              'Failed to load matches. Please check your connection and try again.'
          );
          // Keep existing matches in case of temporary connection issues
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
            console.log('Connection restored, refreshing matches data');
            this.initializeMatchesSubscription();
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
   * Refresh matches data
   */
  private refreshMatches(): void {
    // The real-time subscription will automatically update the data
    // This method is kept for explicit refresh if needed
  }

  /**
   * Generate a unique match ID
   */
  private generateMatchId(): string {
    return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
