import { Injectable } from '@angular/core';
import {
  Observable,
  BehaviorSubject,
  throwError,
  from,
  combineLatest,
} from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
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
export class MatchService {
  private readonly COLLECTION_NAME = 'matches';
  private matchesSubject = new BehaviorSubject<Match[]>([]);
  private isLoading = new BehaviorSubject<boolean>(false);

  constructor(
    private firebaseService: FirebaseService,
    private playerService: PlayerService
  ) {
    this.initializeMatchesSubscription();
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
   * Create round-robin matches for given players
   */
  private createRoundRobinMatches(players: Player[]): Match[] {
    const matches: Match[] = [];
    let matchday = 1;
    let matchesInCurrentDay = 0;
    const maxMatchesPerDay = Math.floor(players.length / 2);

    // Generate home and away matches for each pair
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        // Home match: player i vs player j
        matches.push(this.createLeagueMatch(players[i], players[j], matchday));

        // Away match: player j vs player i
        matches.push(this.createLeagueMatch(players[j], players[i], matchday));

        matchesInCurrentDay += 2;

        // Move to next matchday if current day is full
        if (matchesInCurrentDay >= maxMatchesPerDay * 2) {
          matchday++;
          matchesInCurrentDay = 0;
        }
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
    const totalMatches = playerCount * (playerCount - 1); // Each player plays every other player twice
    const maxMatchesPerDay = Math.floor(playerCount / 2) * 2; // Maximum concurrent matches per day
    return Math.ceil(totalMatches / maxMatchesPerDay);
  }

  /**
   * Initialize real-time subscription to matches collection
   */
  private initializeMatchesSubscription(): void {
    this.isLoading.next(true);

    this.firebaseService
      .getCollectionData<Match>(this.COLLECTION_NAME)
      .subscribe({
        next: (matches) => {
          // Sort matches by matchday, then by creation date
          const sortedMatches = matches.sort((a, b) => {
            if (a.matchday !== b.matchday) {
              return a.matchday - b.matchday;
            }
            return (
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });

          this.matchesSubject.next(sortedMatches);
          this.isLoading.next(false);
        },
        error: (error) => {
          console.error('Error in matches subscription:', error);
          this.isLoading.next(false);
          // Keep existing matches in case of temporary connection issues
        },
      });
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
