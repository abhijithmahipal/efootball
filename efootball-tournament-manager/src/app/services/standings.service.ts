import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { map, tap, catchError, startWith } from 'rxjs/operators';
import { PlayerService } from './player.service';
import { MatchService } from './match.service';
import { Standing } from '../models/standing.model';
import { Player } from '../models/player.model';
import { Match } from '../models/match.model';

@Injectable({
  providedIn: 'root',
})
export class StandingsService implements OnDestroy {
  private standingsSubject = new BehaviorSubject<Standing[]>([]);
  private isLoading = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private subscriptions: Subscription[] = [];

  constructor(
    private playerService: PlayerService,
    private matchService: MatchService
  ) {
    this.initializeStandingsCalculation();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Get current standings as an observable
   */
  getStandings(): Observable<Standing[]> {
    return this.standingsSubject.asObservable();
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
    this.initializeStandingsCalculation();
  }

  /**
   * Get league standings (excluding playoff matches)
   */
  getLeagueStandings(): Observable<Standing[]> {
    return combineLatest([
      this.playerService.getActivePlayers(),
      this.matchService.getLeagueMatches(),
    ]).pipe(
      map(([players, matches]) =>
        this.calculateStandings(
          players,
          matches.filter((m) => m.isPlayed)
        )
      ),
      tap((standings) =>
        console.log('League standings calculated:', standings.length, 'players')
      )
    );
  }

  /**
   * Get top N players from standings
   */
  getTopPlayers(count: number): Observable<Standing[]> {
    return this.getStandings().pipe(
      map((standings) => standings.slice(0, count))
    );
  }

  /**
   * Get standings for playoff qualification (top 4)
   */
  getPlayoffQualifiers(): Observable<Standing[]> {
    return this.getTopPlayers(4);
  }

  /**
   * Get a specific player's standing
   */
  getPlayerStanding(playerId: string): Observable<Standing | null> {
    return this.getStandings().pipe(
      map((standings) => standings.find((s) => s.playerId === playerId) || null)
    );
  }

  /**
   * Get standings statistics
   */
  getStandingsStatistics(): Observable<{
    totalPlayers: number;
    playersWithMatches: number;
    highestPoints: number;
    lowestPoints: number;
    averagePoints: number;
    totalGoals: number;
  }> {
    return this.getStandings().pipe(
      map((standings) => {
        const playersWithMatches = standings.filter((s) => s.matchesPlayed > 0);
        const points = playersWithMatches.map((s) => s.points);
        const totalGoals = standings.reduce((sum, s) => sum + s.goalsFor, 0);

        return {
          totalPlayers: standings.length,
          playersWithMatches: playersWithMatches.length,
          highestPoints: points.length > 0 ? Math.max(...points) : 0,
          lowestPoints: points.length > 0 ? Math.min(...points) : 0,
          averagePoints:
            points.length > 0
              ? points.reduce((sum, p) => sum + p, 0) / points.length
              : 0,
          totalGoals,
        };
      })
    );
  }

  /**
   * Initialize real-time standings calculation with enhanced error handling
   */
  private initializeStandingsCalculation(): void {
    this.isLoading.next(true);
    this.clearError();

    // Combine players and matches to calculate standings in real-time
    const subscription = combineLatest([
      this.playerService.getActivePlayers().pipe(startWith([])),
      this.matchService.getLeagueMatches().pipe(startWith([])),
    ])
      .pipe(
        map(([players, matches]) => {
          // Only include played matches for standings calculation
          const playedMatches = matches.filter((match) => match.isPlayed);
          return this.calculateStandings(players, playedMatches);
        }),
        tap(() => {
          this.isLoading.next(false);
          this.clearError();
        }),
        catchError((error) => {
          console.error('Error calculating standings:', error);
          this.isLoading.next(false);
          this.errorSubject.next(
            error.message ||
              'Failed to calculate standings. Please check your connection and try again.'
          );
          // Return empty standings to prevent stream from breaking
          return [[]];
        })
      )
      .subscribe({
        next: (standings) => {
          this.standingsSubject.next(standings);
          console.log('Standings updated:', standings.length, 'players');
        },
        error: (error) => {
          console.error('Error in standings subscription:', error);
          this.isLoading.next(false);
          this.errorSubject.next(
            'Failed to update standings. Please refresh the page.'
          );
        },
      });

    this.subscriptions.push(subscription);
  }

  /**
   * Calculate standings from players and matches
   */
  private calculateStandings(players: Player[], matches: Match[]): Standing[] {
    const standings: Standing[] = players.map((player) =>
      this.initializePlayerStanding(player)
    );

    // Process each match to update statistics
    matches.forEach((match) => {
      this.processMatchForStandings(match, standings);
    });

    // Sort standings by points (descending), then by goal difference (descending)
    standings.sort((a, b) => {
      if (a.points !== b.points) {
        return b.points - a.points;
      }
      if (a.goalDifference !== b.goalDifference) {
        return b.goalDifference - a.goalDifference;
      }
      // If points and goal difference are equal, sort by goals for (descending)
      if (a.goalsFor !== b.goalsFor) {
        return b.goalsFor - a.goalsFor;
      }
      // Finally, sort alphabetically by player name
      return a.playerName.localeCompare(b.playerName);
    });

    // Assign positions
    standings.forEach((standing, index) => {
      standing.position = index + 1;
    });

    return standings;
  }

  /**
   * Initialize a player's standing with zero values
   */
  private initializePlayerStanding(player: Player): Standing {
    return {
      playerId: player.id,
      playerName: player.name,
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      position: 0,
    };
  }

  /**
   * Process a single match to update standings
   */
  private processMatchForStandings(match: Match, standings: Standing[]): void {
    if (
      !match.isPlayed ||
      match.homeGoals === undefined ||
      match.awayGoals === undefined
    ) {
      return;
    }

    const homeStanding = standings.find(
      (s) => s.playerId === match.homePlayerId
    );
    const awayStanding = standings.find(
      (s) => s.playerId === match.awayPlayerId
    );

    if (!homeStanding || !awayStanding) {
      console.warn('Player not found in standings for match:', match.id);
      return;
    }

    // Update matches played
    homeStanding.matchesPlayed++;
    awayStanding.matchesPlayed++;

    // Update goals
    homeStanding.goalsFor += match.homeGoals;
    homeStanding.goalsAgainst += match.awayGoals;
    awayStanding.goalsFor += match.awayGoals;
    awayStanding.goalsAgainst += match.homeGoals;

    // Update goal difference
    homeStanding.goalDifference =
      homeStanding.goalsFor - homeStanding.goalsAgainst;
    awayStanding.goalDifference =
      awayStanding.goalsFor - awayStanding.goalsAgainst;

    // Determine match result and update wins/draws/losses/points
    if (match.homeGoals > match.awayGoals) {
      // Home win
      homeStanding.wins++;
      homeStanding.points += 3;
      awayStanding.losses++;
    } else if (match.homeGoals < match.awayGoals) {
      // Away win
      awayStanding.wins++;
      awayStanding.points += 3;
      homeStanding.losses++;
    } else {
      // Draw
      homeStanding.draws++;
      homeStanding.points += 1;
      awayStanding.draws++;
      awayStanding.points += 1;
    }
  }

  /**
   * Get head-to-head record between two players
   */
  getHeadToHeadRecord(
    player1Id: string,
    player2Id: string
  ): Observable<{
    player1Wins: number;
    player2Wins: number;
    draws: number;
    player1Goals: number;
    player2Goals: number;
    totalMatches: number;
  }> {
    return this.matchService.getLeagueMatches().pipe(
      map((matches) => {
        const headToHeadMatches = matches.filter(
          (match) =>
            match.isPlayed &&
            ((match.homePlayerId === player1Id &&
              match.awayPlayerId === player2Id) ||
              (match.homePlayerId === player2Id &&
                match.awayPlayerId === player1Id))
        );

        let player1Wins = 0;
        let player2Wins = 0;
        let draws = 0;
        let player1Goals = 0;
        let player2Goals = 0;

        headToHeadMatches.forEach((match) => {
          if (match.homeGoals === undefined || match.awayGoals === undefined)
            return;

          if (match.homePlayerId === player1Id) {
            player1Goals += match.homeGoals;
            player2Goals += match.awayGoals;
            if (match.homeGoals > match.awayGoals) {
              player1Wins++;
            } else if (match.homeGoals < match.awayGoals) {
              player2Wins++;
            } else {
              draws++;
            }
          } else {
            player1Goals += match.awayGoals;
            player2Goals += match.homeGoals;
            if (match.awayGoals > match.homeGoals) {
              player1Wins++;
            } else if (match.awayGoals < match.homeGoals) {
              player2Wins++;
            } else {
              draws++;
            }
          }
        });

        return {
          player1Wins,
          player2Wins,
          draws,
          player1Goals,
          player2Goals,
          totalMatches: headToHeadMatches.length,
        };
      })
    );
  }

  /**
   * Get form guide for a player (last N matches)
   */
  getPlayerForm(
    playerId: string,
    lastNMatches: number = 5
  ): Observable<{
    results: ('W' | 'D' | 'L')[];
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  }> {
    return this.matchService.getLeagueMatches().pipe(
      map((matches) => {
        const playerMatches = matches
          .filter(
            (match) =>
              match.isPlayed &&
              (match.homePlayerId === playerId ||
                match.awayPlayerId === playerId)
          )
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, lastNMatches);

        const results: ('W' | 'D' | 'L')[] = [];
        let wins = 0;
        let draws = 0;
        let losses = 0;
        let goalsFor = 0;
        let goalsAgainst = 0;
        let points = 0;

        playerMatches.forEach((match) => {
          if (match.homeGoals === undefined || match.awayGoals === undefined)
            return;

          const isHome = match.homePlayerId === playerId;
          const playerGoals = isHome ? match.homeGoals : match.awayGoals;
          const opponentGoals = isHome ? match.awayGoals : match.homeGoals;

          goalsFor += playerGoals;
          goalsAgainst += opponentGoals;

          if (playerGoals > opponentGoals) {
            results.push('W');
            wins++;
            points += 3;
          } else if (playerGoals < opponentGoals) {
            results.push('L');
            losses++;
          } else {
            results.push('D');
            draws++;
            points += 1;
          }
        });

        return {
          results,
          wins,
          draws,
          losses,
          goalsFor,
          goalsAgainst,
          points,
        };
      })
    );
  }
}
