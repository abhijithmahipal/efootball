import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { MatchService } from '../../services/match.service';
import { Match } from '../../models/match.model';
import { PlayoffRound } from '../../models/enums';
import { LoadingErrorComponent } from '../shared/loading-error/loading-error.component';

interface MatchdayGroup {
  matchday: number;
  matches: Match[];
}

interface PlayoffGroup {
  round: PlayoffRound;
  roundName: string;
  matches: Match[];
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, LoadingErrorComponent],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.css'],
})
export class ScheduleComponent implements OnInit, OnDestroy {
  leagueMatchdays$: Observable<MatchdayGroup[]>;
  playoffGroups$: Observable<PlayoffGroup[]>;
  isLoading$: Observable<boolean>;
  error$: Observable<string | null>;

  private destroy$ = new Subject<void>();

  constructor(private matchService: MatchService) {
    this.isLoading$ = this.matchService.getLoadingState();
    this.error$ = this.matchService.getErrorState();

    // Group league matches by matchday
    this.leagueMatchdays$ = this.matchService.getLeagueMatches().pipe(
      map((matches) => this.groupMatchesByMatchday(matches)),
      takeUntil(this.destroy$)
    );

    // Group playoff matches by round
    this.playoffGroups$ = this.matchService.getPlayoffMatches().pipe(
      map((matches) => this.groupPlayoffMatches(matches)),
      takeUntil(this.destroy$)
    );
  }

  ngOnInit(): void {
    // Component initialization is handled in constructor
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle retry operation
   */
  onRetry(): void {
    this.matchService.retryOperation();
  }

  /**
   * Get match status display text
   */
  getMatchStatus(match: Match): string {
    if (
      match.isPlayed &&
      match.homeGoals !== undefined &&
      match.awayGoals !== undefined
    ) {
      return `${match.homeGoals} - ${match.awayGoals}`;
    }
    return 'Pending';
  }

  /**
   * Check if match is completed
   */
  isMatchCompleted(match: Match): boolean {
    return (
      match.isPlayed &&
      match.homeGoals !== undefined &&
      match.awayGoals !== undefined
    );
  }

  /**
   * Get CSS class for match status
   */
  getMatchStatusClass(match: Match): string {
    return this.isMatchCompleted(match) ? 'completed' : 'pending';
  }

  /**
   * Group matches by matchday
   */
  private groupMatchesByMatchday(matches: Match[]): MatchdayGroup[] {
    const grouped = matches.reduce((acc, match) => {
      const matchday = match.matchday;
      if (!acc[matchday]) {
        acc[matchday] = [];
      }
      acc[matchday].push(match);
      return acc;
    }, {} as { [key: number]: Match[] });

    return Object.keys(grouped)
      .map((key) => ({
        matchday: parseInt(key, 10),
        matches: grouped[parseInt(key, 10)],
      }))
      .sort((a, b) => a.matchday - b.matchday);
  }

  /**
   * Group playoff matches by round
   */
  private groupPlayoffMatches(matches: Match[]): PlayoffGroup[] {
    const grouped = matches.reduce((acc, match) => {
      if (match.playoffRound) {
        const round = match.playoffRound;
        if (!acc[round]) {
          acc[round] = [];
        }
        acc[round].push(match);
      }
      return acc;
    }, {} as { [key in PlayoffRound]?: Match[] });

    const roundOrder: PlayoffRound[] = [
      PlayoffRound.SEMIFINAL,
      PlayoffRound.FINAL,
      PlayoffRound.THIRD_PLACE,
    ];

    const roundNames: { [key in PlayoffRound]: string } = {
      [PlayoffRound.SEMIFINAL]: 'Semifinals',
      [PlayoffRound.FINAL]: 'Final',
      [PlayoffRound.THIRD_PLACE]: 'Third Place',
    };

    return roundOrder
      .filter((round) => grouped[round] && grouped[round]!.length > 0)
      .map((round) => ({
        round,
        roundName: roundNames[round],
        matches: grouped[round]!,
      }));
  }
}
