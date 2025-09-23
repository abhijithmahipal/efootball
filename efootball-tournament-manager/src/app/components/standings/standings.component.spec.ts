import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, BehaviorSubject } from 'rxjs';
import { StandingsComponent } from './standings.component';
import { StandingsService } from '../../services/standings.service';
import { Standing } from '../../models/standing.model';

describe('StandingsComponent', () => {
  let component: StandingsComponent;
  let fixture: ComponentFixture<StandingsComponent>;
  let mockStandingsService: jasmine.SpyObj<StandingsService>;
  let mockStandings: BehaviorSubject<Standing[]>;
  let mockLoadingState: BehaviorSubject<boolean>;

  const createMockStanding = (
    playerId: string,
    playerName: string,
    position: number,
    matchesPlayed: number = 0,
    wins: number = 0,
    draws: number = 0,
    losses: number = 0,
    goalsFor: number = 0,
    goalsAgainst: number = 0,
    points: number = 0
  ): Standing => ({
    playerId,
    playerName,
    position,
    matchesPlayed,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    points,
  });

  beforeEach(async () => {
    mockStandings = new BehaviorSubject<Standing[]>([]);
    mockLoadingState = new BehaviorSubject<boolean>(false);

    const standingsServiceSpy = jasmine.createSpyObj('StandingsService', [
      'getStandings',
      'getLoadingState',
    ]);

    standingsServiceSpy.getStandings.and.returnValue(
      mockStandings.asObservable()
    );
    standingsServiceSpy.getLoadingState.and.returnValue(
      mockLoadingState.asObservable()
    );

    await TestBed.configureTestingModule({
      imports: [StandingsComponent],
      providers: [{ provide: StandingsService, useValue: standingsServiceSpy }],
    }).compileComponents();

    mockStandingsService = TestBed.inject(
      StandingsService
    ) as jasmine.SpyObj<StandingsService>;
    fixture = TestBed.createComponent(StandingsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize observables correctly', () => {
      expect(component.standings$).toBeDefined();
      expect(component.isLoading$).toBeDefined();
    });

    it('should call StandingsService methods on initialization', () => {
      fixture.detectChanges();
      expect(mockStandingsService.getStandings).toHaveBeenCalled();
      expect(mockStandingsService.getLoadingState).toHaveBeenCalled();
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

  describe('Standings Display', () => {
    it('should display standings table when standings exist', () => {
      const standings = [
        createMockStanding('1', 'Player A', 1, 10, 8, 1, 1, 25, 8, 25),
        createMockStanding('2', 'Player B', 2, 10, 6, 2, 2, 20, 12, 20),
        createMockStanding('3', 'Player C', 3, 10, 4, 3, 3, 15, 15, 15),
      ];

      mockStandings.next(standings);
      fixture.detectChanges();

      const standingsSection =
        fixture.nativeElement.querySelector('.standings-section');
      expect(standingsSection).toBeTruthy();

      const desktopPlayerNames = fixture.nativeElement.querySelectorAll(
        '.desktop-table .player-name'
      );
      expect(desktopPlayerNames.length).toBe(3);
      expect(desktopPlayerNames[0].textContent).toContain('Player A');
      expect(desktopPlayerNames[1].textContent).toContain('Player B');
      expect(desktopPlayerNames[2].textContent).toContain('Player C');
    });

    it('should display correct position badges', () => {
      const standings = [
        createMockStanding('1', 'Player A', 1, 10, 8, 1, 1, 25, 8, 25),
        createMockStanding('2', 'Player B', 5, 10, 4, 2, 4, 15, 18, 14),
      ];

      mockStandings.next(standings);
      fixture.detectChanges();

      const positionBadges =
        fixture.nativeElement.querySelectorAll('.position-badge');
      expect(positionBadges[0].classList).toContain('playoff-position');
      expect(positionBadges[1].classList).toContain('regular-position');
    });

    it('should display player statistics correctly', () => {
      const standings = [
        createMockStanding('1', 'Player A', 1, 10, 8, 1, 1, 25, 8, 25),
      ];

      mockStandings.next(standings);
      fixture.detectChanges();

      const standingRow = fixture.nativeElement.querySelector('.standing-row');
      expect(standingRow.textContent).toContain('10'); // matches played
      expect(standingRow.textContent).toContain('8'); // wins
      expect(standingRow.textContent).toContain('1'); // draws
      expect(standingRow.textContent).toContain('1'); // losses
      expect(standingRow.textContent).toContain('25'); // goals for and points
      expect(standingRow.textContent).toContain('8'); // goals against
    });

    it('should highlight playoff qualifiers', () => {
      const standings = [
        createMockStanding('1', 'Player A', 1, 10, 8, 1, 1, 25, 8, 25),
        createMockStanding('2', 'Player B', 4, 10, 6, 2, 2, 20, 12, 20),
        createMockStanding('3', 'Player C', 5, 10, 4, 3, 3, 15, 15, 15),
      ];

      mockStandings.next(standings);
      fixture.detectChanges();

      const standingRows =
        fixture.nativeElement.querySelectorAll('.standing-row');
      expect(standingRows[0].classList).toContain('playoff-qualifier');
      expect(standingRows[1].classList).toContain('playoff-qualifier');
      expect(standingRows[2].classList).not.toContain('playoff-qualifier');
    });

    it('should display empty state when no standings exist', () => {
      mockStandings.next([]);
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toContain('No Standings Available');
    });
  });

  describe('Position Methods', () => {
    it('should return correct position class', () => {
      expect(component.getPositionClass(1)).toBe('playoff-position');
      expect(component.getPositionClass(4)).toBe('playoff-position');
      expect(component.getPositionClass(5)).toBe('regular-position');
      expect(component.getPositionClass(10)).toBe('regular-position');
    });

    it('should return correct position display', () => {
      expect(component.getPositionDisplay(1)).toBe('1st');
      expect(component.getPositionDisplay(2)).toBe('2nd');
      expect(component.getPositionDisplay(3)).toBe('3rd');
      expect(component.getPositionDisplay(4)).toBe('4th');
      expect(component.getPositionDisplay(11)).toBe('11th');
    });

    it('should identify playoff qualifiers correctly', () => {
      expect(component.isPlayoffQualifier(1)).toBe(true);
      expect(component.isPlayoffQualifier(4)).toBe(true);
      expect(component.isPlayoffQualifier(5)).toBe(false);
      expect(component.isPlayoffQualifier(10)).toBe(false);
    });

    it('should return correct position tooltip', () => {
      expect(component.getPositionTooltip(1)).toBe('Qualifies for playoffs');
      expect(component.getPositionTooltip(4)).toBe('Qualifies for playoffs');
      expect(component.getPositionTooltip(5)).toBe(
        'Does not qualify for playoffs'
      );
    });
  });

  describe('Goal Difference Methods', () => {
    it('should format goal difference correctly', () => {
      expect(component.formatGoalDifference(5)).toBe('+5');
      expect(component.formatGoalDifference(0)).toBe('0');
      expect(component.formatGoalDifference(-3)).toBe('-3');
    });

    it('should return correct goal difference class', () => {
      expect(component.getGoalDifferenceClass(5)).toBe('positive');
      expect(component.getGoalDifferenceClass(0)).toBe('neutral');
      expect(component.getGoalDifferenceClass(-3)).toBe('negative');
    });
  });

  describe('Statistics Methods', () => {
    it('should calculate win percentage correctly', () => {
      const standing = createMockStanding(
        '1',
        'Player A',
        1,
        10,
        8,
        1,
        1,
        25,
        8,
        25
      );
      expect(component.getWinPercentage(standing)).toBe(80);

      const standingNoMatches = createMockStanding(
        '2',
        'Player B',
        2,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      );
      expect(component.getWinPercentage(standingNoMatches)).toBe(0);
    });

    it('should return correct form indicator', () => {
      const excellentStanding = createMockStanding(
        '1',
        'Player A',
        1,
        10,
        8,
        1,
        1,
        25,
        8,
        25
      );
      expect(component.getFormIndicator(excellentStanding)).toBe('excellent');

      const goodStanding = createMockStanding(
        '2',
        'Player B',
        2,
        10,
        6,
        2,
        2,
        20,
        12,
        20
      );
      expect(component.getFormIndicator(goodStanding)).toBe('good');

      const averageStanding = createMockStanding(
        '3',
        'Player C',
        3,
        10,
        4,
        3,
        3,
        15,
        15,
        15
      );
      expect(component.getFormIndicator(averageStanding)).toBe('average');

      const poorStanding = createMockStanding(
        '4',
        'Player D',
        4,
        10,
        2,
        1,
        7,
        8,
        20,
        7
      );
      expect(component.getFormIndicator(poorStanding)).toBe('poor');
    });

    it('should calculate points per game correctly', () => {
      const standing = createMockStanding(
        '1',
        'Player A',
        1,
        10,
        8,
        1,
        1,
        25,
        8,
        25
      );
      expect(component.getPointsPerGame(standing)).toBe(2.5);

      const standingNoMatches = createMockStanding(
        '2',
        'Player B',
        2,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      );
      expect(component.getPointsPerGame(standingNoMatches)).toBe(0);
    });

    it('should calculate goals per game correctly', () => {
      const standing = createMockStanding(
        '1',
        'Player A',
        1,
        10,
        8,
        1,
        1,
        25,
        8,
        25
      );
      expect(component.getGoalsPerGame(standing)).toBe(2.5);

      const standingNoMatches = createMockStanding(
        '2',
        'Player B',
        2,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      );
      expect(component.getGoalsPerGame(standingNoMatches)).toBe(0);
    });
  });

  describe('TrackBy Function', () => {
    it('should return player ID for trackBy', () => {
      const standing = createMockStanding(
        'player123',
        'Player A',
        1,
        10,
        8,
        1,
        1,
        25,
        8,
        25
      );
      expect(component.trackByPlayerId(0, standing)).toBe('player123');
    });
  });

  describe('Real-time Updates', () => {
    it('should update display when standings data changes', () => {
      // Initial state
      mockStandings.next([]);
      fixture.detectChanges();

      let emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();

      // Add standings
      const standings = [
        createMockStanding('1', 'Player A', 1, 10, 8, 1, 1, 25, 8, 25),
      ];
      mockStandings.next(standings);
      fixture.detectChanges();

      emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeFalsy();

      const standingsSection =
        fixture.nativeElement.querySelector('.standings-section');
      expect(standingsSection).toBeTruthy();
    });
  });

  describe('Responsive Design', () => {
    it('should show desktop table by default', () => {
      const standings = [
        createMockStanding('1', 'Player A', 1, 10, 8, 1, 1, 25, 8, 25),
      ];
      mockStandings.next(standings);
      fixture.detectChanges();

      const desktopTable =
        fixture.nativeElement.querySelector('.desktop-table');
      const mobileCards = fixture.nativeElement.querySelector('.mobile-cards');

      expect(desktopTable).toBeTruthy();
      expect(mobileCards).toBeTruthy(); // Present in DOM but hidden by CSS
    });
  });

  describe('Legend and Help', () => {
    it('should display legend when standings exist', () => {
      const standings = [
        createMockStanding('1', 'Player A', 1, 10, 8, 1, 1, 25, 8, 25),
      ];
      mockStandings.next(standings);
      fixture.detectChanges();

      const legend = fixture.nativeElement.querySelector('.legend');
      const tableLegend = fixture.nativeElement.querySelector('.table-legend');

      expect(legend).toBeTruthy();
      expect(tableLegend).toBeTruthy();
    });

    it('should display correct legend items', () => {
      const standings = [
        createMockStanding('1', 'Player A', 1, 10, 8, 1, 1, 25, 8, 25),
      ];
      mockStandings.next(standings);
      fixture.detectChanges();

      const tableLegend = fixture.nativeElement.querySelector('.table-legend');
      expect(tableLegend.textContent).toContain('MP: Matches Played');
      expect(tableLegend.textContent).toContain('W: Wins');
      expect(tableLegend.textContent).toContain('GD: Goal Difference');
      expect(tableLegend.textContent).toContain('Pts: Points');
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
