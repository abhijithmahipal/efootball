import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { MatchResultsComponent } from './match-results.component';
import { MatchService } from '../../services/match.service';
import { StandingsService } from '../../services/standings.service';
import { Match } from '../../models/match.model';
import { Standing } from '../../models/standing.model';
import { PlayoffRound } from '../../models/enums';

describe('MatchResultsComponent', () => {
  let component: MatchResultsComponent;
  let fixture: ComponentFixture<MatchResultsComponent>;
  let mockMatchService: jasmine.SpyObj<MatchService>;
  let mockStandingsService: jasmine.SpyObj<StandingsService>;

  const mockMatches: Match[] = [
    {
      id: 'match1',
      homePlayerId: 'player1',
      awayPlayerId: 'player2',
      homePlayerName: 'Player 1',
      awayPlayerName: 'Player 2',
      matchday: 1,
      isPlayed: false,
      isPlayoff: false,
      createdAt: new Date(),
    },
    {
      id: 'match2',
      homePlayerId: 'player2',
      awayPlayerId: 'player3',
      homePlayerName: 'Player 2',
      awayPlayerName: 'Player 3',
      matchday: 1,
      homeGoals: 2,
      awayGoals: 1,
      isPlayed: true,
      isPlayoff: false,
      createdAt: new Date(),
    },
    {
      id: 'match3',
      homePlayerId: 'player1',
      awayPlayerId: 'player4',
      homePlayerName: 'Player 1',
      awayPlayerName: 'Player 4',
      matchday: 2,
      isPlayed: false,
      isPlayoff: true,
      playoffRound: PlayoffRound.SEMIFINAL,
      createdAt: new Date(),
    },
  ];

  const mockStandings: Standing[] = [
    {
      playerId: 'player1',
      playerName: 'Player 1',
      matchesPlayed: 2,
      wins: 2,
      draws: 0,
      losses: 0,
      goalsFor: 4,
      goalsAgainst: 1,
      goalDifference: 3,
      points: 6,
      position: 1,
    },
    {
      playerId: 'player2',
      playerName: 'Player 2',
      matchesPlayed: 2,
      wins: 1,
      draws: 0,
      losses: 1,
      goalsFor: 3,
      goalsAgainst: 3,
      goalDifference: 0,
      points: 3,
      position: 2,
    },
  ];

  beforeEach(async () => {
    const matchServiceSpy = jasmine.createSpyObj('MatchService', [
      'getMatches',
      'getLoadingState',
      'updateMatchResult',
    ]);
    const standingsServiceSpy = jasmine.createSpyObj('StandingsService', [
      'getStandings',
    ]);

    await TestBed.configureTestingModule({
      imports: [MatchResultsComponent, ReactiveFormsModule],
      providers: [
        { provide: MatchService, useValue: matchServiceSpy },
        { provide: StandingsService, useValue: standingsServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MatchResultsComponent);
    component = fixture.componentInstance;
    mockMatchService = TestBed.inject(
      MatchService
    ) as jasmine.SpyObj<MatchService>;
    mockStandingsService = TestBed.inject(
      StandingsService
    ) as jasmine.SpyObj<StandingsService>;

    // Setup default mock returns
    mockMatchService.getMatches.and.returnValue(of(mockMatches));
    mockMatchService.getLoadingState.and.returnValue(of(false));
    mockStandingsService.getStandings.and.returnValue(of(mockStandings));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default form values', () => {
    fixture.detectChanges();

    expect(component.filterForm.value).toEqual({
      matchType: 'all',
      matchStatus: 'all',
      matchday: 'all',
    });

    expect(component.resultForm.value).toEqual({
      homeGoals: 0,
      awayGoals: 0,
    });
  });

  it('should load matches and standings on init', () => {
    fixture.detectChanges();

    expect(mockMatchService.getMatches).toHaveBeenCalled();
    expect(mockStandingsService.getStandings).toHaveBeenCalled();
  });

  describe('Filter functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should filter matches by type', (done) => {
      component.filterForm.patchValue({ matchType: 'league' });

      component.filteredMatches$.subscribe((matches) => {
        expect(matches.length).toBe(2);
        expect(matches.every((m) => !m.isPlayoff)).toBe(true);
        done();
      });
    });

    it('should filter matches by status', (done) => {
      component.filterForm.patchValue({ matchStatus: 'completed' });

      component.filteredMatches$.subscribe((matches) => {
        expect(matches.length).toBe(1);
        expect(matches.every((m) => m.isPlayed)).toBe(true);
        done();
      });
    });

    it('should filter matches by matchday', (done) => {
      component.filterForm.patchValue({ matchday: '1' });

      component.filteredMatches$.subscribe((matches) => {
        expect(matches.length).toBe(2);
        expect(matches.every((m) => m.matchday === 1)).toBe(true);
        done();
      });
    });
  });

  describe('Match selection', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should select a match and update form', () => {
      const match = mockMatches[0];
      component.selectMatch(match);

      expect(component.selectedMatch).toBe(match);
      expect(component.resultForm.value).toEqual({
        homeGoals: 0,
        awayGoals: 0,
      });
    });

    it('should pre-fill form with existing results for played match', () => {
      const playedMatch = mockMatches[1];
      component.selectMatch(playedMatch);

      expect(component.selectedMatch).toBe(playedMatch);
      expect(component.resultForm.value).toEqual({
        homeGoals: 2,
        awayGoals: 1,
      });
    });

    it('should clear selection', () => {
      component.selectMatch(mockMatches[0]);
      component.clearSelection();

      expect(component.selectedMatch).toBeNull();
      expect(component.resultForm.value).toEqual({
        homeGoals: 0,
        awayGoals: 0,
      });
    });
  });

  describe('Form validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.selectMatch(mockMatches[0]);
    });

    it('should validate required fields', () => {
      component.resultForm.patchValue({
        homeGoals: null,
        awayGoals: null,
      });

      expect(component.resultForm.invalid).toBe(true);
      expect(component.canSubmit()).toBe(false);
    });

    it('should validate minimum values', () => {
      component.resultForm.patchValue({
        homeGoals: -1,
        awayGoals: -1,
      });

      expect(component.resultForm.invalid).toBe(true);
      expect(component.canSubmit()).toBe(false);
    });

    it('should validate integer pattern', () => {
      // Test with string values that would trigger pattern validation
      component.resultForm.get('homeGoals')?.setValue('1.5');
      component.resultForm.get('awayGoals')?.setValue('2.7');

      expect(component.resultForm.get('homeGoals')?.hasError('pattern')).toBe(
        true
      );
      expect(component.resultForm.get('awayGoals')?.hasError('pattern')).toBe(
        true
      );
    });

    it('should be valid with correct values', () => {
      component.resultForm.patchValue({
        homeGoals: 2,
        awayGoals: 1,
      });

      expect(component.resultForm.valid).toBe(true);
      expect(component.canSubmit()).toBe(true);
    });
  });

  describe('Result submission', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.selectMatch(mockMatches[0]);
      component.resultForm.patchValue({
        homeGoals: 3,
        awayGoals: 1,
      });
    });

    it('should submit match result successfully', () => {
      const updatedMatch = {
        ...mockMatches[0],
        homeGoals: 3,
        awayGoals: 1,
        isPlayed: true,
      };
      mockMatchService.updateMatchResult.and.returnValue(of(updatedMatch));

      // Set up the component state properly
      component.selectMatch(mockMatches[0]);
      component.resultForm.patchValue({
        homeGoals: 3,
        awayGoals: 1,
      });

      component.onSubmitResult();

      expect(mockMatchService.updateMatchResult).toHaveBeenCalledWith(
        'match1',
        3,
        1
      );
      expect(component.successMessage).toContain('Match result updated');
      expect(component.selectedMatch).toBeNull();
    });

    it('should handle submission error', () => {
      const error = new Error('Update failed');
      mockMatchService.updateMatchResult.and.returnValue(
        throwError(() => error)
      );

      component.onSubmitResult();

      expect(component.errorMessage).toBe('Update failed');
      expect(component.isSubmitting).toBe(false);
    });

    it('should not submit if form is invalid', () => {
      component.resultForm.patchValue({
        homeGoals: -1,
        awayGoals: -1,
      });

      component.onSubmitResult();

      expect(mockMatchService.updateMatchResult).not.toHaveBeenCalled();
    });

    it('should not submit if no match is selected', () => {
      component.clearSelection();

      component.onSubmitResult();

      expect(mockMatchService.updateMatchResult).not.toHaveBeenCalled();
    });
  });

  describe('Helper methods', () => {
    it('should get correct match result text', () => {
      expect(component.getMatchResultText(mockMatches[0])).toBe('vs');
      expect(component.getMatchResultText(mockMatches[1])).toBe('2 - 1');
    });

    it('should get correct match status', () => {
      expect(component.getMatchStatusText(mockMatches[0])).toBe('Pending');
      expect(component.getMatchStatusText(mockMatches[1])).toBe('Completed');

      expect(component.getMatchStatusClass(mockMatches[0])).toBe(
        'badge-pending'
      );
      expect(component.getMatchStatusClass(mockMatches[1])).toBe(
        'badge-completed'
      );
    });

    it('should get correct match type text', () => {
      expect(component.getMatchTypeText(mockMatches[0])).toBe('LEAGUE');
      expect(component.getMatchTypeText(mockMatches[2])).toBe('SEMIFINAL');
    });

    it('should get field errors correctly', () => {
      component.resultForm.get('homeGoals')?.setErrors({ required: true });
      component.resultForm.get('homeGoals')?.markAsTouched();

      expect(component.getFieldError('homeGoals')).toBe(
        'homeGoals is required'
      );
    });
  });

  describe('Matchdays observable', () => {
    it('should return unique sorted matchdays', (done) => {
      fixture.detectChanges();

      component.getMatchdays().subscribe((matchdays) => {
        expect(matchdays).toEqual([1, 2]);
        done();
      });
    });
  });

  describe('Loading state', () => {
    it('should show loading state', () => {
      // Create a new component instance with loading state true
      mockMatchService.getLoadingState.and.returnValue(of(true));

      // Create a new fixture to get the updated loading state
      const newFixture = TestBed.createComponent(MatchResultsComponent);
      newFixture.detectChanges();

      const loadingElement =
        newFixture.nativeElement.querySelector('.loading-container');
      expect(loadingElement).toBeTruthy();
    });

    it('should hide loading state when loaded', () => {
      mockMatchService.getLoadingState.and.returnValue(of(false));
      fixture.detectChanges();

      const loadingElement =
        fixture.nativeElement.querySelector('.loading-container');
      expect(loadingElement).toBeFalsy();
    });
  });

  describe('Component cleanup', () => {
    it('should complete destroy subject on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });
});
