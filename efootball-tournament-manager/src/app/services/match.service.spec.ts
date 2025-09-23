import { TestBed } from '@angular/core/testing';
import {
  MatchService,
  ScheduleGenerationResult,
  PlayoffBracket,
} from './match.service';
import { FirebaseService } from './firebase.service';
import { PlayerService } from './player.service';
import { Match } from '../models/match.model';
import { Player } from '../models/player.model';
import { PlayoffRound } from '../models/enums';
import { of, throwError } from 'rxjs';

describe('MatchService', () => {
  let service: MatchService;
  let mockFirebaseService: jasmine.SpyObj<FirebaseService>;
  let mockPlayerService: jasmine.SpyObj<PlayerService>;

  const mockPlayers: Player[] = [
    { id: 'player1', name: 'Player 1', isActive: true, createdAt: new Date() },
    { id: 'player2', name: 'Player 2', isActive: true, createdAt: new Date() },
    { id: 'player3', name: 'Player 3', isActive: true, createdAt: new Date() },
    { id: 'player4', name: 'Player 4', isActive: true, createdAt: new Date() },
    { id: 'player5', name: 'Player 5', isActive: true, createdAt: new Date() },
  ];

  const mockMatches: Match[] = [
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
      isPlayed: false,
      isPlayoff: false,
      createdAt: new Date(),
    },
    {
      id: 'match3',
      homePlayerId: 'player1',
      awayPlayerId: 'player2',
      homePlayerName: 'Player 1',
      awayPlayerName: 'Player 2',
      matchday: 1,
      isPlayed: false,
      isPlayoff: true,
      playoffRound: PlayoffRound.SEMIFINAL,
      createdAt: new Date(),
    },
  ];

  beforeEach(() => {
    const firebaseServiceSpy = jasmine.createSpyObj('FirebaseService', [
      'getCollectionData',
      'getDocumentData',
      'setDocument',
      'updateDocument',
      'deleteDocument',
    ]);

    const playerServiceSpy = jasmine.createSpyObj('PlayerService', [
      'getActivePlayers',
    ]);

    // Setup default mock behavior
    firebaseServiceSpy.getCollectionData.and.returnValue(of(mockMatches));
    playerServiceSpy.getActivePlayers.and.returnValue(of(mockPlayers));

    TestBed.configureTestingModule({
      providers: [
        MatchService,
        { provide: FirebaseService, useValue: firebaseServiceSpy },
        { provide: PlayerService, useValue: playerServiceSpy },
      ],
    });

    mockFirebaseService = TestBed.inject(
      FirebaseService
    ) as jasmine.SpyObj<FirebaseService>;
    mockPlayerService = TestBed.inject(
      PlayerService
    ) as jasmine.SpyObj<PlayerService>;
    service = TestBed.inject(MatchService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize matches subscription on creation', () => {
      expect(mockFirebaseService.getCollectionData).toHaveBeenCalledWith(
        'matches'
      );
    });
  });

  describe('getMatches', () => {
    it('should return matches observable', (done) => {
      service.getMatches().subscribe((matches) => {
        expect(matches).toEqual(mockMatches);
        done();
      });
    });

    it('should sort matches by matchday and creation date', (done) => {
      const unsortedMatches = [
        { ...mockMatches[0], matchday: 2, createdAt: new Date('2023-01-03') },
        { ...mockMatches[1], matchday: 1, createdAt: new Date('2023-01-02') },
        { ...mockMatches[2], matchday: 1, createdAt: new Date('2023-01-01') },
      ];

      mockFirebaseService.getCollectionData.and.returnValue(
        of(unsortedMatches)
      );

      const newService = new MatchService(
        mockFirebaseService,
        mockPlayerService
      );

      newService.getMatches().subscribe((matches) => {
        expect(matches[0].matchday).toBe(1);
        expect(matches[1].matchday).toBe(1);
        expect(matches[2].matchday).toBe(2);
        expect(matches[0].createdAt.getTime()).toBeLessThan(
          matches[1].createdAt.getTime()
        );
        done();
      });
    });
  });

  describe('getLeagueMatches', () => {
    it('should return only league matches', (done) => {
      service.getLeagueMatches().subscribe((matches) => {
        expect(matches.length).toBe(2);
        expect(matches.every((match) => !match.isPlayoff)).toBe(true);
        done();
      });
    });
  });

  describe('getPlayoffMatches', () => {
    it('should return only playoff matches', (done) => {
      service.getPlayoffMatches().subscribe((matches) => {
        expect(matches.length).toBe(1);
        expect(matches.every((match) => match.isPlayoff)).toBe(true);
        done();
      });
    });
  });

  describe('getMatchesByMatchday', () => {
    it('should return matches for specific matchday', (done) => {
      service.getMatchesByMatchday(1).subscribe((matches) => {
        expect(matches.length).toBe(3);
        expect(matches.every((match) => match.matchday === 1)).toBe(true);
        done();
      });
    });
  });

  describe('getMatchById', () => {
    it('should return match by ID', (done) => {
      const matchId = 'match1';
      mockFirebaseService.getDocumentData.and.returnValue(of(mockMatches[0]));

      service.getMatchById(matchId).subscribe((match) => {
        expect(match).toEqual(mockMatches[0]);
        expect(mockFirebaseService.getDocumentData).toHaveBeenCalledWith(
          'matches',
          matchId
        );
        done();
      });
    });

    it('should return null if match not found', (done) => {
      mockFirebaseService.getDocumentData.and.returnValue(of(null));

      service.getMatchById('nonexistent').subscribe((match) => {
        expect(match).toBeNull();
        done();
      });
    });

    it('should throw error for empty ID', (done) => {
      service.getMatchById('').subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toBe('Match ID is required');
          done();
        },
      });
    });
  });

  describe('generateRoundRobinSchedule', () => {
    beforeEach(() => {
      mockFirebaseService.setDocument.and.returnValue(of(void 0));
    });

    it('should generate schedule for 5 players', (done) => {
      service
        .generateRoundRobinSchedule()
        .subscribe((result: ScheduleGenerationResult) => {
          expect(result.matches.length).toBe(20); // 5 players * 4 opponents * 2 (home/away)
          expect(result.totalMatches).toBe(20);
          expect(result.totalMatchdays).toBeGreaterThan(0);

          // Verify all matches are league matches
          expect(result.matches.every((match) => !match.isPlayoff)).toBe(true);

          // Verify each player plays every other player twice
          const playerPairs = new Set<string>();
          result.matches.forEach((match) => {
            const pair = [match.homePlayerId, match.awayPlayerId]
              .sort()
              .join('-');
            playerPairs.add(pair);
          });
          expect(playerPairs.size).toBe(10); // C(5,2) = 10 unique pairs

          done();
        });
    });

    it('should reject schedule generation with less than 5 players', (done) => {
      const fewPlayers = mockPlayers.slice(0, 4);
      mockPlayerService.getActivePlayers.and.returnValue(of(fewPlayers));

      service.generateRoundRobinSchedule().subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toBe(
            'Minimum 5 active players required to generate schedule'
          );
          done();
        },
      });
    });

    it('should handle Firebase save errors', (done) => {
      mockFirebaseService.setDocument.and.returnValue(
        throwError(() => new Error('Save failed'))
      );

      service.generateRoundRobinSchedule().subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toContain('Failed to save matches');
          done();
        },
      });
    });
  });

  describe('updateMatchResult', () => {
    const matchId = 'match1';
    const homeGoals = 3;
    const awayGoals = 1;

    beforeEach(() => {
      mockFirebaseService.updateDocument.and.returnValue(of(void 0));
      mockFirebaseService.getDocumentData.and.returnValue(
        of({
          ...mockMatches[0],
          homeGoals,
          awayGoals,
          isPlayed: true,
        })
      );
    });

    it('should update match result successfully', (done) => {
      service
        .updateMatchResult(matchId, homeGoals, awayGoals)
        .subscribe((match) => {
          expect(match.homeGoals).toBe(homeGoals);
          expect(match.awayGoals).toBe(awayGoals);
          expect(match.isPlayed).toBe(true);
          expect(mockFirebaseService.updateDocument).toHaveBeenCalledWith(
            'matches',
            matchId,
            {
              homeGoals,
              awayGoals,
              isPlayed: true,
            }
          );
          done();
        });
    });

    it('should reject empty match ID', (done) => {
      service.updateMatchResult('', homeGoals, awayGoals).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toBe('Match ID is required');
          done();
        },
      });
    });

    it('should reject negative goals', (done) => {
      service.updateMatchResult(matchId, -1, awayGoals).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toBe('Goals must be non-negative integers');
          done();
        },
      });
    });

    it('should reject non-integer goals', (done) => {
      service.updateMatchResult(matchId, 2.5, awayGoals).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toBe('Goals must be non-negative integers');
          done();
        },
      });
    });
  });

  describe('generatePlayoffBracket', () => {
    const standings = [
      { playerId: 'player1', playerName: 'Player 1', points: 9 },
      { playerId: 'player2', playerName: 'Player 2', points: 7 },
      { playerId: 'player3', playerName: 'Player 3', points: 5 },
      { playerId: 'player4', playerName: 'Player 4', points: 3 },
    ];

    beforeEach(() => {
      mockFirebaseService.setDocument.and.returnValue(of(void 0));
    });

    it('should generate playoff bracket with correct matchups', (done) => {
      service
        .generatePlayoffBracket(standings)
        .subscribe((bracket: PlayoffBracket) => {
          expect(bracket.semifinals.length).toBe(2);

          // Check 1st vs 4th
          const firstSemifinal = bracket.semifinals[0];
          expect(firstSemifinal.homePlayerId).toBe('player1');
          expect(firstSemifinal.awayPlayerId).toBe('player4');
          expect(firstSemifinal.playoffRound).toBe(PlayoffRound.SEMIFINAL);

          // Check 2nd vs 3rd
          const secondSemifinal = bracket.semifinals[1];
          expect(secondSemifinal.homePlayerId).toBe('player2');
          expect(secondSemifinal.awayPlayerId).toBe('player3');
          expect(secondSemifinal.playoffRound).toBe(PlayoffRound.SEMIFINAL);

          done();
        });
    });

    it('should reject bracket generation with less than 4 players', (done) => {
      const fewStandings = standings.slice(0, 3);

      service.generatePlayoffBracket(fewStandings).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toBe(
            'At least 4 players required for playoffs'
          );
          done();
        },
      });
    });
  });

  describe('generateFinalMatches', () => {
    const semifinalResults = [
      {
        matchId: 'semi1',
        winnerId: 'player1',
        winnerName: 'Player 1',
        loserId: 'player4',
        loserName: 'Player 4',
      },
      {
        matchId: 'semi2',
        winnerId: 'player2',
        winnerName: 'Player 2',
        loserId: 'player3',
        loserName: 'Player 3',
      },
    ];

    beforeEach(() => {
      mockFirebaseService.setDocument.and.returnValue(of(void 0));
    });

    it('should generate final and third-place matches', (done) => {
      service
        .generateFinalMatches(semifinalResults)
        .subscribe((bracket: PlayoffBracket) => {
          expect(bracket.final).toBeDefined();
          expect(bracket.thirdPlace).toBeDefined();

          // Check final match (winners)
          expect(bracket.final!.homePlayerId).toBe('player1');
          expect(bracket.final!.awayPlayerId).toBe('player2');
          expect(bracket.final!.playoffRound).toBe(PlayoffRound.FINAL);

          // Check third-place match (losers)
          expect(bracket.thirdPlace!.homePlayerId).toBe('player4');
          expect(bracket.thirdPlace!.awayPlayerId).toBe('player3');
          expect(bracket.thirdPlace!.playoffRound).toBe(
            PlayoffRound.THIRD_PLACE
          );

          done();
        });
    });

    it('should reject generation with incorrect number of results', (done) => {
      const incorrectResults = semifinalResults.slice(0, 1);

      service.generateFinalMatches(incorrectResults).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toBe('Exactly 2 semifinal results required');
          done();
        },
      });
    });
  });

  describe('deleteAllMatches', () => {
    beforeEach(() => {
      mockFirebaseService.deleteDocument.and.returnValue(of(void 0));
    });

    it('should delete all matches', (done) => {
      service.deleteAllMatches().subscribe(() => {
        expect(mockFirebaseService.deleteDocument).toHaveBeenCalledTimes(
          mockMatches.length
        );
        mockMatches.forEach((match) => {
          expect(mockFirebaseService.deleteDocument).toHaveBeenCalledWith(
            'matches',
            match.id
          );
        });
        done();
      });
    });

    it('should handle empty matches list', () => {
      // Mock the service to return empty matches directly
      spyOn(service, 'getMatches').and.returnValue(of([]));

      service.deleteAllMatches().subscribe(() => {
        expect(mockFirebaseService.deleteDocument).not.toHaveBeenCalled();
      });
    });
  });

  describe('getMatchStatistics', () => {
    it('should return correct match statistics', (done) => {
      service.getMatchStatistics().subscribe((stats) => {
        expect(stats.totalMatches).toBe(3);
        expect(stats.playedMatches).toBe(1);
        expect(stats.pendingMatches).toBe(2);
        expect(stats.leagueMatches).toBe(2);
        expect(stats.playoffMatches).toBe(1);
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

  describe('Error Handling', () => {
    it('should handle Firebase errors gracefully', (done) => {
      const errorMessage = 'Firebase connection error';
      mockFirebaseService.getDocumentData.and.returnValue(
        throwError(() => new Error(errorMessage))
      );

      service.getMatchById('match1').subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toContain('Failed to fetch match');
          done();
        },
      });
    });

    it('should handle subscription errors without crashing', () => {
      mockFirebaseService.getCollectionData.and.returnValue(
        throwError(() => new Error('Connection failed'))
      );

      expect(
        () => new MatchService(mockFirebaseService, mockPlayerService)
      ).not.toThrow();
    });
  });
});
