import { TestBed } from '@angular/core/testing';
import { StandingsService } from './standings.service';
import { PlayerService } from './player.service';
import { MatchService } from './match.service';
import { Standing } from '../models/standing.model';
import { Player } from '../models/player.model';
import { Match } from '../models/match.model';
import { of } from 'rxjs';

describe('StandingsService', () => {
  let service: StandingsService;
  let mockPlayerService: jasmine.SpyObj<PlayerService>;
  let mockMatchService: jasmine.SpyObj<MatchService>;

  const mockPlayers: Player[] = [
    { id: 'player1', name: 'Player 1', isActive: true, createdAt: new Date() },
    { id: 'player2', name: 'Player 2', isActive: true, createdAt: new Date() },
    { id: 'player3', name: 'Player 3', isActive: true, createdAt: new Date() },
    { id: 'player4', name: 'Player 4', isActive: true, createdAt: new Date() },
  ];

  const mockMatches: Match[] = [
    {
      id: 'match1',
      homePlayerId: 'player1',
      awayPlayerId: 'player2',
      homePlayerName: 'Player 1',
      awayPlayerName: 'Player 2',
      matchday: 1,
      homeGoals: 3,
      awayGoals: 1,
      isPlayed: true,
      isPlayoff: false,
      createdAt: new Date('2023-01-01'),
    },
    {
      id: 'match2',
      homePlayerId: 'player2',
      awayPlayerId: 'player1',
      homePlayerName: 'Player 2',
      awayPlayerName: 'Player 1',
      matchday: 1,
      homeGoals: 1,
      awayGoals: 1,
      isPlayed: true,
      isPlayoff: false,
      createdAt: new Date('2023-01-02'),
    },
    {
      id: 'match3',
      homePlayerId: 'player3',
      awayPlayerId: 'player4',
      homePlayerName: 'Player 3',
      awayPlayerName: 'Player 4',
      matchday: 1,
      homeGoals: 2,
      awayGoals: 0,
      isPlayed: true,
      isPlayoff: false,
      createdAt: new Date('2023-01-03'),
    },
    {
      id: 'match4',
      homePlayerId: 'player1',
      awayPlayerId: 'player3',
      homePlayerName: 'Player 1',
      awayPlayerName: 'Player 3',
      matchday: 2,
      isPlayed: false,
      isPlayoff: false,
      createdAt: new Date('2023-01-04'),
    },
  ];

  beforeEach(() => {
    const playerServiceSpy = jasmine.createSpyObj('PlayerService', [
      'getActivePlayers',
    ]);

    const matchServiceSpy = jasmine.createSpyObj('MatchService', [
      'getLeagueMatches',
    ]);

    // Setup default mock behavior
    playerServiceSpy.getActivePlayers.and.returnValue(of(mockPlayers));
    matchServiceSpy.getLeagueMatches.and.returnValue(of(mockMatches));

    TestBed.configureTestingModule({
      providers: [
        StandingsService,
        { provide: PlayerService, useValue: playerServiceSpy },
        { provide: MatchService, useValue: matchServiceSpy },
      ],
    });

    mockPlayerService = TestBed.inject(
      PlayerService
    ) as jasmine.SpyObj<PlayerService>;
    mockMatchService = TestBed.inject(
      MatchService
    ) as jasmine.SpyObj<MatchService>;
    service = TestBed.inject(StandingsService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize standings calculation on creation', () => {
      expect(mockPlayerService.getActivePlayers).toHaveBeenCalled();
      expect(mockMatchService.getLeagueMatches).toHaveBeenCalled();
    });
  });

  describe('getStandings', () => {
    it('should return calculated standings', (done) => {
      service.getStandings().subscribe((standings) => {
        expect(standings.length).toBe(4);

        // Check that standings are sorted by points (descending)
        for (let i = 0; i < standings.length - 1; i++) {
          expect(standings[i].points).toBeGreaterThanOrEqual(
            standings[i + 1].points
          );
        }

        // Check positions are assigned correctly
        standings.forEach((standing, index) => {
          expect(standing.position).toBe(index + 1);
        });

        done();
      });
    });

    it('should calculate correct statistics for players', (done) => {
      service.getStandings().subscribe((standings) => {
        const player1 = standings.find((s) => s.playerId === 'player1');
        const player2 = standings.find((s) => s.playerId === 'player2');
        const player3 = standings.find((s) => s.playerId === 'player3');
        const player4 = standings.find((s) => s.playerId === 'player4');

        expect(player1).toBeDefined();
        expect(player2).toBeDefined();
        expect(player3).toBeDefined();
        expect(player4).toBeDefined();

        // Player 1: 1 win (3-1), 1 draw (1-1) = 4 points, 4 goals for, 2 against, +2 GD
        expect(player1!.matchesPlayed).toBe(2);
        expect(player1!.wins).toBe(1);
        expect(player1!.draws).toBe(1);
        expect(player1!.losses).toBe(0);
        expect(player1!.goalsFor).toBe(4);
        expect(player1!.goalsAgainst).toBe(2);
        expect(player1!.goalDifference).toBe(2);
        expect(player1!.points).toBe(4);

        // Player 2: 1 loss (1-3), 1 draw (1-1) = 1 point, 2 goals for, 4 against, -2 GD
        expect(player2!.matchesPlayed).toBe(2);
        expect(player2!.wins).toBe(0);
        expect(player2!.draws).toBe(1);
        expect(player2!.losses).toBe(1);
        expect(player2!.goalsFor).toBe(2);
        expect(player2!.goalsAgainst).toBe(4);
        expect(player2!.goalDifference).toBe(-2);
        expect(player2!.points).toBe(1);

        // Player 3: 1 win (2-0) = 3 points, 2 goals for, 0 against, +2 GD
        expect(player3!.matchesPlayed).toBe(1);
        expect(player3!.wins).toBe(1);
        expect(player3!.draws).toBe(0);
        expect(player3!.losses).toBe(0);
        expect(player3!.goalsFor).toBe(2);
        expect(player3!.goalsAgainst).toBe(0);
        expect(player3!.goalDifference).toBe(2);
        expect(player3!.points).toBe(3);

        // Player 4: 1 loss (0-2) = 0 points, 0 goals for, 2 against, -2 GD
        expect(player4!.matchesPlayed).toBe(1);
        expect(player4!.wins).toBe(0);
        expect(player4!.draws).toBe(0);
        expect(player4!.losses).toBe(1);
        expect(player4!.goalsFor).toBe(0);
        expect(player4!.goalsAgainst).toBe(2);
        expect(player4!.goalDifference).toBe(-2);
        expect(player4!.points).toBe(0);

        done();
      });
    });

    it('should sort standings correctly by points and goal difference', (done) => {
      service.getStandings().subscribe((standings) => {
        // Expected order: Player 1 (4 pts, +2 GD), Player 3 (3 pts, +2 GD), Player 2 (1 pt, -2 GD), Player 4 (0 pts, -2 GD)
        expect(standings[0].playerId).toBe('player1');
        expect(standings[1].playerId).toBe('player3');
        expect(standings[2].playerId).toBe('player2');
        expect(standings[3].playerId).toBe('player4');

        done();
      });
    });
  });

  describe('getLeagueStandings', () => {
    it('should return league standings only', (done) => {
      service.getLeagueStandings().subscribe((standings) => {
        expect(standings.length).toBe(4);
        // Should be the same as regular standings since we only have league matches
        done();
      });
    });
  });

  describe('getTopPlayers', () => {
    it('should return top N players', (done) => {
      service.getTopPlayers(2).subscribe((topPlayers) => {
        expect(topPlayers.length).toBe(2);
        expect(topPlayers[0].position).toBe(1);
        expect(topPlayers[1].position).toBe(2);
        done();
      });
    });
  });

  describe('getPlayoffQualifiers', () => {
    it('should return top 4 players for playoffs', (done) => {
      service.getPlayoffQualifiers().subscribe((qualifiers) => {
        expect(qualifiers.length).toBe(4);
        qualifiers.forEach((qualifier, index) => {
          expect(qualifier.position).toBe(index + 1);
        });
        done();
      });
    });
  });

  describe('getPlayerStanding', () => {
    it('should return specific player standing', (done) => {
      service.getPlayerStanding('player1').subscribe((standing) => {
        expect(standing).toBeDefined();
        expect(standing!.playerId).toBe('player1');
        expect(standing!.playerName).toBe('Player 1');
        done();
      });
    });

    it('should return null for non-existent player', (done) => {
      service.getPlayerStanding('nonexistent').subscribe((standing) => {
        expect(standing).toBeNull();
        done();
      });
    });
  });

  describe('getStandingsStatistics', () => {
    it('should return correct statistics', (done) => {
      service.getStandingsStatistics().subscribe((stats) => {
        expect(stats.totalPlayers).toBe(4);
        expect(stats.playersWithMatches).toBe(4); // All players have played at least one match
        expect(stats.highestPoints).toBe(4); // Player 1
        expect(stats.lowestPoints).toBe(0); // Player 4
        expect(stats.averagePoints).toBe(2); // (4 + 3 + 1 + 0) / 4 = 2
        expect(stats.totalGoals).toBe(8); // 4 + 2 + 2 + 0 = 8
        done();
      });
    });
  });

  describe('getHeadToHeadRecord', () => {
    it('should return correct head-to-head record', (done) => {
      service.getHeadToHeadRecord('player1', 'player2').subscribe((record) => {
        expect(record.totalMatches).toBe(2);
        expect(record.player1Wins).toBe(1); // Player 1 won 3-1
        expect(record.player2Wins).toBe(0);
        expect(record.draws).toBe(1); // 1-1 draw
        expect(record.player1Goals).toBe(4); // 3 + 1
        expect(record.player2Goals).toBe(2); // 1 + 1
        done();
      });
    });

    it('should return empty record for players with no matches', (done) => {
      service.getHeadToHeadRecord('player1', 'player4').subscribe((record) => {
        expect(record.totalMatches).toBe(0);
        expect(record.player1Wins).toBe(0);
        expect(record.player2Wins).toBe(0);
        expect(record.draws).toBe(0);
        expect(record.player1Goals).toBe(0);
        expect(record.player2Goals).toBe(0);
        done();
      });
    });
  });

  describe('getPlayerForm', () => {
    it('should return player form guide', (done) => {
      service.getPlayerForm('player1', 5).subscribe((form) => {
        expect(form.results.length).toBe(2); // Player 1 has played 2 matches
        expect(form.results).toContain('W'); // Won one match
        expect(form.results).toContain('D'); // Drew one match
        expect(form.wins).toBe(1);
        expect(form.draws).toBe(1);
        expect(form.losses).toBe(0);
        expect(form.goalsFor).toBe(4);
        expect(form.goalsAgainst).toBe(2);
        expect(form.points).toBe(4);
        done();
      });
    });

    it('should limit results to specified number of matches', (done) => {
      service.getPlayerForm('player1', 1).subscribe((form) => {
        expect(form.results.length).toBe(1); // Limited to 1 match
        done();
      });
    });

    it('should return empty form for player with no matches', (done) => {
      // Create a player with no matches
      const playersWithNoMatches = [
        ...mockPlayers,
        {
          id: 'player5',
          name: 'Player 5',
          isActive: true,
          createdAt: new Date(),
        },
      ];
      mockPlayerService.getActivePlayers.and.returnValue(
        of(playersWithNoMatches)
      );

      const newService = new StandingsService(
        mockPlayerService,
        mockMatchService
      );

      newService.getPlayerForm('player5', 5).subscribe((form) => {
        expect(form.results.length).toBe(0);
        expect(form.wins).toBe(0);
        expect(form.draws).toBe(0);
        expect(form.losses).toBe(0);
        expect(form.goalsFor).toBe(0);
        expect(form.goalsAgainst).toBe(0);
        expect(form.points).toBe(0);
        done();
      });
    });
  });

  describe('getLoadingState', () => {
    it('should return loading state observable', (done) => {
      service.getLoadingState().subscribe((isLoading) => {
        expect(typeof isLoading).toBe('boolean');
        done();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty players list', (done) => {
      mockPlayerService.getActivePlayers.and.returnValue(of([]));
      const newService = new StandingsService(
        mockPlayerService,
        mockMatchService
      );

      newService.getStandings().subscribe((standings) => {
        expect(standings.length).toBe(0);
        done();
      });
    });

    it('should handle empty matches list', (done) => {
      mockMatchService.getLeagueMatches.and.returnValue(of([]));
      const newService = new StandingsService(
        mockPlayerService,
        mockMatchService
      );

      newService.getStandings().subscribe((standings) => {
        expect(standings.length).toBe(4);
        // All players should have zero stats
        standings.forEach((standing) => {
          expect(standing.matchesPlayed).toBe(0);
          expect(standing.points).toBe(0);
          expect(standing.goalsFor).toBe(0);
          expect(standing.goalsAgainst).toBe(0);
        });
        done();
      });
    });

    it('should handle matches with undefined goals', (done) => {
      const matchesWithUndefinedGoals = [
        {
          ...mockMatches[0],
          homeGoals: undefined,
          awayGoals: undefined,
          isPlayed: true,
        },
      ];

      mockMatchService.getLeagueMatches.and.returnValue(
        of(matchesWithUndefinedGoals)
      );
      const newService = new StandingsService(
        mockPlayerService,
        mockMatchService
      );

      newService.getStandings().subscribe((standings) => {
        // Should not crash and should ignore matches with undefined goals
        expect(standings.length).toBe(4);
        standings.forEach((standing) => {
          expect(standing.matchesPlayed).toBe(0);
        });
        done();
      });
    });

    it('should sort by goals for when points and goal difference are equal', (done) => {
      const equalPointsMatches: Match[] = [
        {
          id: 'match1',
          homePlayerId: 'player1',
          awayPlayerId: 'player2',
          homePlayerName: 'Player 1',
          awayPlayerName: 'Player 2',
          matchday: 1,
          homeGoals: 2,
          awayGoals: 1,
          isPlayed: true,
          isPlayoff: false,
          createdAt: new Date(),
        },
        {
          id: 'match2',
          homePlayerId: 'player3',
          awayPlayerId: 'player4',
          homePlayerName: 'Player 3',
          awayPlayerName: 'Player 4',
          matchday: 1,
          homeGoals: 3,
          awayGoals: 2,
          isPlayed: true,
          isPlayoff: false,
          createdAt: new Date(),
        },
      ];

      mockMatchService.getLeagueMatches.and.returnValue(of(equalPointsMatches));
      const newService = new StandingsService(
        mockPlayerService,
        mockMatchService
      );

      newService.getStandings().subscribe((standings) => {
        // Both Player 1 and Player 3 have 3 points and +1 goal difference
        // Player 3 should be first due to more goals for (3 vs 2)
        const topTwo = standings.slice(0, 2);
        expect(topTwo[0].playerId).toBe('player3');
        expect(topTwo[1].playerId).toBe('player1');
        done();
      });
    });
  });
});
