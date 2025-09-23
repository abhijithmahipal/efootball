import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, BehaviorSubject } from 'rxjs';
import { ScheduleComponent } from './schedule.component';
import { MatchService } from '../../services/match.service';
import { Match } from '../../models/match.model';
import { PlayoffRound } from '../../models/enums';

describe('ScheduleComponent', () => {
  let component: ScheduleComponent;
  let fixture: ComponentFixture<ScheduleComponent>;
  let mockMatchService: jasmine.SpyObj<MatchService>;
  let mockLeagueMatches: BehaviorSubject<Match[]>;
  let mockPlayoffMatches: BehaviorSubject<Match[]>;
  let mockLoadingState: BehaviorSubject<boolean>;

  const createMockMatch = (
    id: string,
    homePlayerName: string,
    awayPlayerName: string,
    matchday: number,
    isPlayed: boolean = false,
    homeGoals?: number,
    awayGoals?: number,
    isPlayoff: boolean = false,
    playoffRound?: PlayoffRound
  ): Match => ({
    id,
    homePlayerId: `player_${homePlayerName.toLowerCase()}`,
    awayPlayerId: `player_${awayPlayerName.toLowerCase()}`,
    homePlayerName,
    awayPlayerName,
    matchday,
    homeGoals,
    awayGoals,
    isPlayed,
    isPlayoff,
    playoffRound,
    createdAt: new Date(),
  });

  beforeEach(async () => {
    mockLeagueMatches = new BehaviorSubject<Match[]>([]);
    mockPlayoffMatches = new BehaviorSubject<Match[]>([]);
    mockLoadingState = new BehaviorSubject<boolean>(false);

    const matchServiceSpy = jasmine.createSpyObj('MatchService', [
      'getLeagueMatches',
      'getPlayoffMatches',
      'getLoadingState',
    ]);

    matchServiceSpy.getLeagueMatches.and.returnValue(
      mockLeagueMatches.asObservable()
    );
    matchServiceSpy.getPlayoffMatches.and.returnValue(
      mockPlayoffMatches.asObservable()
    );
    matchServiceSpy.getLoadingState.and.returnValue(
      mockLoadingState.asObservable()
    );

    await TestBed.configureTestingModule({
      imports: [ScheduleComponent],
      providers: [{ provide: MatchService, useValue: matchServiceSpy }],
    }).compileComponents();

    mockMatchService = TestBed.inject(
      MatchService
    ) as jasmine.SpyObj<MatchService>;
    fixture = TestBed.createComponent(ScheduleComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize observables correctly', () => {
      expect(component.leagueMatchdays$).toBeDefined();
      expect(component.playoffGroups$).toBeDefined();
      expect(component.isLoading$).toBeDefined();
    });

    it('should call MatchService methods on initialization', () => {
      fixture.detectChanges();
      expect(mockMatchService.getLeagueMatches).toHaveBeenCalled();
      expect(mockMatchService.getPlayoffMatches).toHaveBeenCalled();
      expect(mockMatchService.getLoadingState).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should display loading spinner when loading', () => {
      mockLoadingState.next(true);
      fixture.detectChanges();

      const loadingContainer =
        fixture.nativeElement.querySelector('.loading-container');
      const spinner = fixture.nativeElement.querySelector('.loading-spinner');

      expect(loadingContainer).toBeTruthy();
      expect(spinner).toBeTruthy();
    });

    it('should hide loading spinner when not loading', () => {
      mockLoadingState.next(false);
      fixture.detectChanges();

      const loadingContainer =
        fixture.nativeElement.querySelector('.loading-container');
      expect(loadingContainer).toBeFalsy();
    });
  });

  describe('League Matches Display', () => {
    it('should display league matches grouped by matchday', () => {
      const matches = [
        createMockMatch('1', 'Player A', 'Player B', 1),
        createMockMatch('2', 'Player C', 'Player D', 1),
        createMockMatch('3', 'Player A', 'Player C', 2),
      ];

      mockLeagueMatches.next(matches);
      fixture.detectChanges();

      const matchdayGroups =
        fixture.nativeElement.querySelectorAll('.matchday-group');
      expect(matchdayGroups.length).toBe(2);

      const matchday1Title =
        fixture.nativeElement.querySelector('.matchday-title');
      expect(matchday1Title.textContent).toContain('Matchday 1');
    });

    it('should display match details correctly', () => {
      const matches = [
        createMockMatch('1', 'Player A', 'Player B', 1, true, 2, 1),
      ];

      mockLeagueMatches.next(matches);
      fixture.detectChanges();

      const matchCard = fixture.nativeElement.querySelector('.match-card');
      expect(matchCard).toBeTruthy();
      expect(matchCard.textContent).toContain('Player A');
      expect(matchCard.textContent).toContain('Player B');
      expect(matchCard.textContent).toContain('2 - 1');
    });

    it('should show pending status for unplayed matches', () => {
      const matches = [createMockMatch('1', 'Player A', 'Player B', 1, false)];

      mockLeagueMatches.next(matches);
      fixture.detectChanges();

      const resultText = fixture.nativeElement.querySelector('.result-text');
      expect(resultText.textContent).toContain('Pending');
      expect(resultText.classList).toContain('pending');
    });

    it('should show completed status for played matches', () => {
      const matches = [
        createMockMatch('1', 'Player A', 'Player B', 1, true, 3, 0),
      ];

      mockLeagueMatches.next(matches);
      fixture.detectChanges();

      const resultText = fixture.nativeElement.querySelector('.result-text');
      expect(resultText.textContent).toContain('3 - 0');
      expect(resultText.classList).toContain('completed');
    });

    it('should display no matches message when no league matches exist', () => {
      mockLeagueMatches.next([]);
      fixture.detectChanges();

      const noMatches = fixture.nativeElement.querySelector('.no-matches');
      expect(noMatches).toBeTruthy();
      expect(noMatches.textContent).toContain(
        'No league matches scheduled yet'
      );
    });
  });

  describe('Playoff Matches Display', () => {
    it('should display playoff matches grouped by round', () => {
      const matches = [
        createMockMatch(
          '1',
          'Player A',
          'Player B',
          1,
          false,
          undefined,
          undefined,
          true,
          PlayoffRound.SEMIFINAL
        ),
        createMockMatch(
          '2',
          'Player C',
          'Player D',
          1,
          false,
          undefined,
          undefined,
          true,
          PlayoffRound.SEMIFINAL
        ),
        createMockMatch(
          '3',
          'Player A',
          'Player C',
          2,
          false,
          undefined,
          undefined,
          true,
          PlayoffRound.FINAL
        ),
      ];

      mockPlayoffMatches.next(matches);
      fixture.detectChanges();

      const playoffSection =
        fixture.nativeElement.querySelector('.playoff-section');
      expect(playoffSection).toBeTruthy();

      const roundTitles =
        fixture.nativeElement.querySelectorAll('.round-title');
      expect(roundTitles.length).toBe(2);
      expect(roundTitles[0].textContent).toContain('Semifinals');
      expect(roundTitles[1].textContent).toContain('Final');
    });

    it('should display visual bracket elements for playoff rounds', () => {
      const matches = [
        createMockMatch(
          '1',
          'Player A',
          'Player B',
          1,
          false,
          undefined,
          undefined,
          true,
          PlayoffRound.SEMIFINAL
        ),
      ];

      mockPlayoffMatches.next(matches);
      fixture.detectChanges();

      const playoffRound =
        fixture.nativeElement.querySelector('.playoff-round');
      expect(playoffRound).toBeTruthy();

      const playoffMatches =
        fixture.nativeElement.querySelector('.playoff-matches');
      expect(playoffMatches).toBeTruthy();

      const playoffMatchCard = fixture.nativeElement.querySelector(
        '.playoff-match-card'
      );
      expect(playoffMatchCard).toBeTruthy();
    });

    it('should not display playoff section when no playoff matches exist', () => {
      mockPlayoffMatches.next([]);
      fixture.detectChanges();

      const playoffSection =
        fixture.nativeElement.querySelector('.playoff-section');
      expect(playoffSection).toBeFalsy();
    });

    it('should display playoff match details correctly', () => {
      const matches = [
        createMockMatch(
          '1',
          'Player A',
          'Player B',
          1,
          true,
          1,
          0,
          true,
          PlayoffRound.FINAL
        ),
      ];

      mockPlayoffMatches.next(matches);
      fixture.detectChanges();

      const playoffMatchCard = fixture.nativeElement.querySelector(
        '.playoff-match-card'
      );
      expect(playoffMatchCard).toBeTruthy();
      expect(playoffMatchCard.textContent).toContain('Player A');
      expect(playoffMatchCard.textContent).toContain('Player B');
      expect(playoffMatchCard.textContent).toContain('1 - 0');
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no matches exist', () => {
      mockLeagueMatches.next([]);
      mockPlayoffMatches.next([]);
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toContain('No Matches Scheduled');
    });
  });

  describe('Match Status Methods', () => {
    it('should return correct match status for completed match', () => {
      const match = createMockMatch('1', 'Player A', 'Player B', 1, true, 2, 1);
      const status = component.getMatchStatus(match);
      expect(status).toBe('2 - 1');
    });

    it('should return pending status for unplayed match', () => {
      const match = createMockMatch('1', 'Player A', 'Player B', 1, false);
      const status = component.getMatchStatus(match);
      expect(status).toBe('Pending');
    });

    it('should correctly identify completed matches', () => {
      const completedMatch = createMockMatch(
        '1',
        'Player A',
        'Player B',
        1,
        true,
        2,
        1
      );
      const pendingMatch = createMockMatch(
        '2',
        'Player C',
        'Player D',
        1,
        false
      );

      expect(component.isMatchCompleted(completedMatch)).toBe(true);
      expect(component.isMatchCompleted(pendingMatch)).toBe(false);
    });

    it('should return correct CSS class for match status', () => {
      const completedMatch = createMockMatch(
        '1',
        'Player A',
        'Player B',
        1,
        true,
        2,
        1
      );
      const pendingMatch = createMockMatch(
        '2',
        'Player C',
        'Player D',
        1,
        false
      );

      expect(component.getMatchStatusClass(completedMatch)).toBe('completed');
      expect(component.getMatchStatusClass(pendingMatch)).toBe('pending');
    });
  });

  describe('Data Grouping', () => {
    it('should group matches by matchday correctly', () => {
      const matches = [
        createMockMatch('1', 'Player A', 'Player B', 2),
        createMockMatch('2', 'Player C', 'Player D', 1),
        createMockMatch('3', 'Player A', 'Player C', 1),
      ];

      mockLeagueMatches.next(matches);
      fixture.detectChanges();

      component.leagueMatchdays$.subscribe((matchdays) => {
        expect(matchdays.length).toBe(2);
        expect(matchdays[0].matchday).toBe(1);
        expect(matchdays[0].matches.length).toBe(2);
        expect(matchdays[1].matchday).toBe(2);
        expect(matchdays[1].matches.length).toBe(1);
      });
    });

    it('should group playoff matches by round correctly', () => {
      const matches = [
        createMockMatch(
          '1',
          'Player A',
          'Player B',
          1,
          false,
          undefined,
          undefined,
          true,
          PlayoffRound.FINAL
        ),
        createMockMatch(
          '2',
          'Player C',
          'Player D',
          1,
          false,
          undefined,
          undefined,
          true,
          PlayoffRound.SEMIFINAL
        ),
        createMockMatch(
          '3',
          'Player E',
          'Player F',
          1,
          false,
          undefined,
          undefined,
          true,
          PlayoffRound.SEMIFINAL
        ),
      ];

      mockPlayoffMatches.next(matches);
      fixture.detectChanges();

      component.playoffGroups$.subscribe((groups) => {
        expect(groups.length).toBe(2);
        expect(groups[0].round).toBe(PlayoffRound.SEMIFINAL);
        expect(groups[0].matches.length).toBe(2);
        expect(groups[1].round).toBe(PlayoffRound.FINAL);
        expect(groups[1].matches.length).toBe(1);
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update display when match data changes', () => {
      // Initial state
      mockLeagueMatches.next([]);
      fixture.detectChanges();

      let noMatches = fixture.nativeElement.querySelector('.no-matches');
      expect(noMatches).toBeTruthy();

      // Add matches
      const matches = [createMockMatch('1', 'Player A', 'Player B', 1)];
      mockLeagueMatches.next(matches);
      fixture.detectChanges();

      noMatches = fixture.nativeElement.querySelector('.no-matches');
      expect(noMatches).toBeFalsy();

      const matchCard = fixture.nativeElement.querySelector('.match-card');
      expect(matchCard).toBeTruthy();
    });
  });

  describe('Component Cleanup', () => {
    it('should unsubscribe on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });
});
