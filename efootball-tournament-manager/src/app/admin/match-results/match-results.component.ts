import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Observable, Subject, combineLatest, of } from 'rxjs';
import { takeUntil, map, startWith } from 'rxjs/operators';
import { MatchService } from '../../services/match.service';
import { StandingsService } from '../../services/standings.service';
import { Match } from '../../models/match.model';
import { Standing } from '../../models/standing.model';

@Component({
  selector: 'app-match-results',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './match-results.component.html',
  styleUrls: ['./match-results.component.css'],
})
export class MatchResultsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  matches$: Observable<Match[]>;
  standings$: Observable<Standing[]>;
  filteredMatches$: Observable<Match[]>;
  isLoading$: Observable<boolean>;

  filterForm: FormGroup;
  resultForm: FormGroup;
  selectedMatch: Match | null = null;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private matchService: MatchService,
    private standingsService: StandingsService,
    private fb: FormBuilder
  ) {
    this.matches$ = this.matchService.getMatches();
    this.standings$ = this.standingsService.getStandings();
    this.isLoading$ = this.matchService.getLoadingState();

    this.filterForm = this.fb.group({
      matchType: ['all'], // 'all', 'league', 'playoff'
      matchStatus: ['all'], // 'all', 'pending', 'completed'
      matchday: ['all'],
    });

    this.resultForm = this.fb.group({
      homeGoals: [
        0,
        [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
      ],
      awayGoals: [
        0,
        [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
      ],
    });

    // Set up filtered matches based on form values
    this.filteredMatches$ = combineLatest([
      this.matches$,
      this.filterForm.valueChanges.pipe(startWith(this.filterForm.value)),
    ]).pipe(
      map(([matches, filters]) => {
        if (!matches) return [];
        return this.applyFilters(matches, filters);
      })
    );
  }

  ngOnInit(): void {
    // Clear messages when component initializes
    this.clearMessages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Apply filters to matches list
   */
  private applyFilters(matches: Match[], filters: any): Match[] {
    return matches.filter((match) => {
      // Filter by match type
      if (filters.matchType === 'league' && match.isPlayoff) return false;
      if (filters.matchType === 'playoff' && !match.isPlayoff) return false;

      // Filter by match status
      if (filters.matchStatus === 'pending' && match.isPlayed) return false;
      if (filters.matchStatus === 'completed' && !match.isPlayed) return false;

      // Filter by matchday
      if (
        filters.matchday !== 'all' &&
        match.matchday !== parseInt(filters.matchday)
      )
        return false;

      return true;
    });
  }

  /**
   * Get unique matchdays for filter dropdown
   */
  getMatchdays(): Observable<number[]> {
    if (!this.matches$) {
      return of([]);
    }
    return this.matches$.pipe(
      map((matches) => {
        if (!matches || matches.length === 0) {
          return [];
        }
        const matchdays = [...new Set(matches.map((m) => m.matchday))];
        return matchdays.sort((a, b) => a - b);
      })
    );
  }

  /**
   * Select a match for result entry
   */
  selectMatch(match: Match): void {
    this.selectedMatch = match;
    this.clearMessages();

    // Pre-fill form with existing results if match is already played
    if (
      match.isPlayed &&
      match.homeGoals !== undefined &&
      match.awayGoals !== undefined
    ) {
      this.resultForm.patchValue({
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
      });
    } else {
      this.resultForm.patchValue({
        homeGoals: 0,
        awayGoals: 0,
      });
    }
  }

  /**
   * Clear selected match
   */
  clearSelection(): void {
    this.selectedMatch = null;
    this.resultForm.reset({
      homeGoals: 0,
      awayGoals: 0,
    });
    this.clearMessages();
  }

  /**
   * Submit match result
   */
  onSubmitResult(): void {
    if (!this.selectedMatch || this.resultForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.clearMessages();

    const { homeGoals, awayGoals } = this.resultForm.value;

    this.matchService
      .updateMatchResult(this.selectedMatch.id, homeGoals, awayGoals)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedMatch) => {
          this.successMessage = `Match result updated: ${updatedMatch.homePlayerName} ${homeGoals} - ${awayGoals} ${updatedMatch.awayPlayerName}`;
          this.isSubmitting = false;
          this.clearSelection();

          // Clear success message after 3 seconds
          setTimeout(() => this.clearMessages(), 3000);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Failed to update match result';
          this.isSubmitting = false;
        },
      });
  }

  /**
   * Get match result display text
   */
  getMatchResultText(match: Match): string {
    if (
      match.isPlayed &&
      match.homeGoals !== undefined &&
      match.awayGoals !== undefined
    ) {
      return `${match.homeGoals} - ${match.awayGoals}`;
    }
    return 'vs';
  }

  /**
   * Get match status badge class
   */
  getMatchStatusClass(match: Match): string {
    return match.isPlayed ? 'badge-completed' : 'badge-pending';
  }

  /**
   * Get match status text
   */
  getMatchStatusText(match: Match): string {
    return match.isPlayed ? 'Completed' : 'Pending';
  }

  /**
   * Get match type text
   */
  getMatchTypeText(match: Match): string {
    if (match.isPlayoff) {
      return match.playoffRound
        ? match.playoffRound.replace('_', ' ').toUpperCase()
        : 'PLAYOFF';
    }
    return 'LEAGUE';
  }

  /**
   * Check if form is valid for submission
   */
  canSubmit(): boolean {
    return (
      this.selectedMatch !== null && this.resultForm.valid && !this.isSubmitting
    );
  }

  /**
   * Track by function for match list
   */
  trackByMatchId(index: number, match: Match): string {
    return match.id;
  }

  /**
   * Clear all messages
   */
  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Get form control error message
   */
  getFieldError(fieldName: string): string {
    const control = this.resultForm.get(fieldName);
    if (control && control.errors && control.touched) {
      if (control.errors['required']) {
        return `${fieldName} is required`;
      }
      if (control.errors['min']) {
        return `${fieldName} must be 0 or greater`;
      }
      if (control.errors['pattern']) {
        return `${fieldName} must be a whole number`;
      }
    }
    return '';
  }
}
