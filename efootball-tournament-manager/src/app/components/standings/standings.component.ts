import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StandingsService } from '../../services/standings.service';
import { Standing } from '../../models/standing.model';
import { LoadingErrorComponent } from '../shared/loading-error/loading-error.component';

@Component({
  selector: 'app-standings',
  standalone: true,
  imports: [CommonModule, LoadingErrorComponent],
  templateUrl: './standings.component.html',
  styleUrls: ['./standings.component.css'],
})
export class StandingsComponent implements OnInit, OnDestroy {
  standings$: Observable<Standing[]>;
  isLoading$: Observable<boolean>;
  error$: Observable<string | null>;

  private destroy$ = new Subject<void>();

  constructor(private standingsService: StandingsService) {
    this.standings$ = this.standingsService.getStandings();
    this.isLoading$ = this.standingsService.getLoadingState();
    this.error$ = this.standingsService.getErrorState();
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
    this.standingsService.retryOperation();
  }

  /**
   * Get CSS class for position badge
   */
  getPositionClass(position: number): string {
    if (position <= 4) {
      return 'playoff-position';
    }
    return 'regular-position';
  }

  /**
   * Get position display text
   */
  getPositionDisplay(position: number): string {
    if (position === 1) return '1st';
    if (position === 2) return '2nd';
    if (position === 3) return '3rd';
    return `${position}th`;
  }

  /**
   * Format goal difference with + or - sign
   */
  formatGoalDifference(goalDifference: number): string {
    if (goalDifference > 0) {
      return `+${goalDifference}`;
    }
    return goalDifference.toString();
  }

  /**
   * Get CSS class for goal difference
   */
  getGoalDifferenceClass(goalDifference: number): string {
    if (goalDifference > 0) return 'positive';
    if (goalDifference < 0) return 'negative';
    return 'neutral';
  }

  /**
   * Calculate win percentage
   */
  getWinPercentage(standing: Standing): number {
    if (standing.matchesPlayed === 0) return 0;
    return Math.round((standing.wins / standing.matchesPlayed) * 100);
  }

  /**
   * Get form indicator based on recent performance
   */
  getFormIndicator(standing: Standing): string {
    const winPercentage = this.getWinPercentage(standing);
    if (winPercentage >= 70) return 'excellent';
    if (winPercentage >= 50) return 'good';
    if (winPercentage >= 30) return 'average';
    return 'poor';
  }

  /**
   * Get points per game average
   */
  getPointsPerGame(standing: Standing): number {
    if (standing.matchesPlayed === 0) return 0;
    return Math.round((standing.points / standing.matchesPlayed) * 100) / 100;
  }

  /**
   * Get goals per game average
   */
  getGoalsPerGame(standing: Standing): number {
    if (standing.matchesPlayed === 0) return 0;
    return Math.round((standing.goalsFor / standing.matchesPlayed) * 100) / 100;
  }

  /**
   * Check if player qualifies for playoffs
   */
  isPlayoffQualifier(position: number): boolean {
    return position <= 4;
  }

  /**
   * Get tooltip text for position
   */
  getPositionTooltip(position: number): string {
    if (position <= 4) {
      return 'Qualifies for playoffs';
    }
    return 'Does not qualify for playoffs';
  }

  /**
   * TrackBy function for standings list
   */
  trackByPlayerId(index: number, standing: Standing): string {
    return standing.playerId;
  }
}
