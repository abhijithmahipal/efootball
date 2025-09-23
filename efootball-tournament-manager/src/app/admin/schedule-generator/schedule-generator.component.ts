import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil, map, startWith } from 'rxjs/operators';

import { PlayerService } from '../../services/player.service';
import {
  MatchService,
  ScheduleGenerationResult,
} from '../../services/match.service';
import { Player } from '../../models/player.model';

interface GenerationState {
  isGenerating: boolean;
  isComplete: boolean;
  error: string | null;
  result: ScheduleGenerationResult | null;
}

@Component({
  selector: 'app-schedule-generator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './schedule-generator.component.html',
  styleUrls: ['./schedule-generator.component.css'],
})
export class ScheduleGeneratorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  tournamentForm: FormGroup;
  players$: Observable<Player[]>;
  activePlayers$: Observable<Player[]>;
  hasMinimumPlayers$: Observable<boolean>;
  selectedPlayers$: Observable<Player[]>;

  generationState: GenerationState = {
    isGenerating: false,
    isComplete: false,
    error: null,
    result: null,
  };

  constructor(
    private fb: FormBuilder,
    private playerService: PlayerService,
    private matchService: MatchService
  ) {
    this.tournamentForm = this.createForm();
    this.players$ = this.playerService.getPlayers();
    this.activePlayers$ = this.playerService.getActivePlayers();
    this.hasMinimumPlayers$ = this.playerService.hasMinimumPlayers();
    this.selectedPlayers$ = this.createSelectedPlayersObservable();
  }

  ngOnInit(): void {
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Generate tournament schedule
   */
  generateSchedule(): void {
    if (this.tournamentForm.invalid || this.generationState.isGenerating) {
      return;
    }

    this.resetGenerationState();
    this.generationState.isGenerating = true;

    this.matchService
      .generateRoundRobinSchedule()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.generationState = {
            isGenerating: false,
            isComplete: true,
            error: null,
            result,
          };
        },
        error: (error) => {
          this.generationState = {
            isGenerating: false,
            isComplete: false,
            error: error.message || 'Failed to generate schedule',
            result: null,
          };
        },
      });
  }

  /**
   * Reset tournament (delete all matches)
   */
  resetTournament(): void {
    if (this.generationState.isGenerating) {
      return;
    }

    if (
      !confirm(
        'Are you sure you want to reset the tournament? This will delete all matches and cannot be undone.'
      )
    ) {
      return;
    }

    this.generationState.isGenerating = true;

    this.matchService
      .deleteAllMatches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.resetGenerationState();
        },
        error: (error) => {
          this.generationState = {
            isGenerating: false,
            isComplete: false,
            error: error.message || 'Failed to reset tournament',
            result: null,
          };
        },
      });
  }

  /**
   * Toggle player selection
   */
  togglePlayerSelection(player: Player): void {
    const selectedPlayers =
      this.tournamentForm.get('selectedPlayers')?.value || [];
    const index = selectedPlayers.findIndex((p: Player) => p.id === player.id);

    if (index > -1) {
      selectedPlayers.splice(index, 1);
    } else {
      selectedPlayers.push(player);
    }

    this.tournamentForm.patchValue({ selectedPlayers });
  }

  /**
   * Check if player is selected
   */
  isPlayerSelected(player: Player): boolean {
    const selectedPlayers =
      this.tournamentForm.get('selectedPlayers')?.value || [];
    return selectedPlayers.some((p: Player) => p.id === player.id);
  }

  /**
   * Select all active players
   */
  selectAllPlayers(): void {
    if (this.activePlayers$) {
      this.activePlayers$
        .pipe(takeUntil(this.destroy$))
        .subscribe((players) => {
          this.tournamentForm.patchValue({ selectedPlayers: [...players] });
        });
    }
  }

  /**
   * Clear all player selections
   */
  clearAllSelections(): void {
    this.tournamentForm.patchValue({ selectedPlayers: [] });
  }

  /**
   * Get selected player count
   */
  getSelectedPlayerCount(): number {
    return this.tournamentForm.get('selectedPlayers')?.value?.length || 0;
  }

  /**
   * Check if minimum players are selected
   */
  hasMinimumSelectedPlayers(): boolean {
    return this.getSelectedPlayerCount() >= 5;
  }

  /**
   * Get generation progress message
   */
  getProgressMessage(): string {
    if (this.generationState.isGenerating) {
      return 'Generating tournament schedule...';
    }
    if (this.generationState.isComplete && this.generationState.result) {
      const { totalMatches, totalMatchdays } = this.generationState.result;
      return `Schedule generated successfully! ${totalMatches} matches across ${totalMatchdays} matchdays.`;
    }
    return '';
  }

  /**
   * Create reactive form
   */
  private createForm(): FormGroup {
    return this.fb.group({
      tournamentName: ['', [Validators.required, Validators.minLength(3)]],
      selectedPlayers: [
        [],
        [Validators.required, this.minimumPlayersValidator],
      ],
    });
  }

  /**
   * Custom validator for minimum players
   */
  private minimumPlayersValidator(control: any) {
    const players = control.value || [];
    return players.length >= 5 ? null : { minimumPlayers: true };
  }

  /**
   * Create observable for selected players
   */
  private createSelectedPlayersObservable(): Observable<Player[]> {
    return this.tournamentForm.get('selectedPlayers')!.valueChanges.pipe(
      startWith([]),
      map((players) => players || [])
    );
  }

  /**
   * Setup form subscriptions
   */
  private setupFormSubscriptions(): void {
    // Auto-select all active players when component loads
    if (this.activePlayers$) {
      this.activePlayers$
        .pipe(takeUntil(this.destroy$))
        .subscribe((players) => {
          if (this.getSelectedPlayerCount() === 0 && players.length > 0) {
            this.tournamentForm.patchValue({ selectedPlayers: [...players] });
          }
        });
    }
  }

  /**
   * Reset generation state
   */
  private resetGenerationState(): void {
    this.generationState = {
      isGenerating: false,
      isComplete: false,
      error: null,
      result: null,
    };
  }
}
