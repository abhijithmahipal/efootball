import { test, expect } from '@playwright/test';
import { TestBed } from '@angular/core/testing';
import { StandingsService } from '../../../src/app/services/standings.service';
import { PlayerService } from '../../../src/app/services/player.service';
import { MatchService } from '../../../src/app/services/match.service';
import { FirebaseService } from '../../../src/app/services/firebase.service';
import { Player } from '../../../src/app/models/player.model';
import { Match } from '../../../src/app/models/match.model';
import { Standing } from '../../../src/app/models/standing.model';
import { BehaviorSubject, of } from 'rxjs';

// Mock Firebase Service for testing
class MockFirebaseService {
  private collections = new Map<string, Map<string, any>>();
  private connectionStatus = new BehaviorSubject({
    isConnected: true,
    retryAttempts: 0,
  });

  getCollectionData<T>(collectionName: string, subscriptionId: string) {
    const collection = this.collections.get(collectionName) || new Map();
    return of(Array.from(collection.values()) as T[]);
  }

  getDocumentData<T>(collectionName: string, docId: string) {
    const collection = this.collections.get(collectionName) || new Map();
    return of((collection.get(docId) as T) || null);
  }

  setDocument(collectionName: string, docId: string, data: any) {
    if (!this.collections.has(collectionName)) {
      this.collections.set(collectionName, new Map());
    }
    this.collections.get(collectionName)!.set(docId, data);
    return of(void 0);
  }

  updateDocument(collectionName: string, docId: string, updates: any) {
    const collection = this.collections.get(collectionName);
    if (collection && collection.has(docId)) {
      const existing = collection.get(docId);
      collection.set(docId, { ...existing, ...updates });
    }
    return of(void 0);
  }

  deleteDocument(collectionName: string, docId: string) {
    const collection = this.collections.get(collectionName);
    if (collection) {
      collection.delete(docId);
    }
    return of(void 0);
  }

  getConnectionStatus() {
    return this.connectionStatus.asObservable();
  }

  // Helper methods for testing
  clearCollection(collectionName: string) {
    this.collections.set(collectionName, new Map());
  }

  addToCollection(collectionName: string, docId: string, data: any) {
    if (!this.collections.has(collectionName)) {
      this.collections.set(collectionName, new Map());
    }
    this.collections.get(collectionName)!.set(docId, data);
  }
}

test.describe('StandingsService Integration with Match Results', () => {
  let standingsService: StandingsService;
  let playerService: PlayerService;
  let matchService: MatchService;
  let mockFirebaseService: MockFirebaseService;

  test.beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        StandingsService,
        PlayerService,
        MatchService,
        { provide: FirebaseService, useClass: MockFirebaseService },
      ],
    }).compileComponents();

    standingsService = TestBed.inject(StandingsService);
    playerService = TestBed.inject(PlayerService);
    matchService = TestBed.inject(MatchService);
    mockFirebaseService = TestBed.inject(FirebaseService) as any;

    // Clear collections before each test
    mockFirebaseService.clearCollection('players');
    mockFirebaseService.clearCollection('matches');
  });

  test('should calculate standings correctly from match results', async () => {
    // Setup test data
    const players: Player[] = [
      { id: 'p1', name: 'Player1', isActive: true, createdAt: new Date() },
      { id: 'p2', name: 'Player2', isActive: true, createdAt: new Date() },
      { id: 'p3', name: 'Player3', isActive: true, createdAt: new Date() },
    ];

    const matches: Match[] = [
      {
        id: 'm1',
        homePlayerId: 'p1',
        awayPlayerId: 'p2',
        homePlayerName: 'Player1',
        awayPlayerName: 'Player2',
        matchday: 1,
        homeGoals: 3,
        awayGoals: 1,
        isPlayed: true,
        isPlayoff: false,
        createdAt: new Date(),
      },
      {
        id: 'm2',
        homePlayerId: 'p2',
        awayPlayerId: 'p3',
        homePlayerName: 'Player2',
        awayPlayerName: 'Player3',
        matchday: 1,
        homeGoals: 2,
        awayGoals: 2,
        isPlayed: true,
        isPlayoff: false,
        createdAt: new Date(),
      },
      {
        id: 'm3',
        homePlayerId: 'p3',
        awayPlayerId: 'p1',
        homePlayerName: 'Player3',
        awayPlayerName: 'Player1',
        matchday: 2,
        homeGoals: 0,
        awayGoals: 2,
        isPlayed: true,
        isPlayoff: false,
        createdAt: new Date(),
      },
    ];

    // Add test data to mock Firebase
    players.forEach((player) => {
      mockFirebaseService.addToCollection('players', player.id, player);
    });

    matches.forEach((match) => {
      mockFirebaseService.addToCollection('matches', match.id, match);
    });

    // Wait for standings calculation
    await new Promise((resolve) => setTimeout(resolve, 100));

    const standings = await standingsService.getStandings().toPromise();

    expect(standings!.length).toBe(3);

    // Player1 should be first (2 wins, 6 points)
    const player1Standing = standings!.find((s) => s.playerId === 'p1')!;
    expect(player1Standing.wins).toBe(2);
    expect(player1Standing.losses).toBe(0);
    expect(player1Standing.draws).toBe(0);
    expect(player1Standing.points).toBe(6);
    expect(player1Standing.goalsFor).toBe(5);
    expect(player1Standing.goalsAgainst).toBe(1);
    expect(player1Standing.goalDifference).toBe(4);
    expect(player1Standing.position).toBe(1);

    // Player2 should be second (1 draw, 1 loss, 1 point)
    const player2Standing = standings!.find((s) => s.playerId === 'p2')!;
    expect(player2Standing.wins).toBe(0);
    expect(player2Standing.losses).toBe(1);
    expect(player2Standing.draws).toBe(1);
    expect(player2Standing.points).toBe(1);
    expect(player2Standing.goalsFor).toBe(3);
    expect(player2Standing.goalsAgainst).toBe(5);
    expect(player2Standing.goalDifference).toBe(-2);

    // Player3 should be third (1 draw, 1 loss, 1 point but worse goal difference)
    const player3Standing = standings!.find((s) => s.playerId === 'p3')!;
    expect(player3Standing.wins).toBe(0);
    expect(player3Standing.losses).toBe(1);
    expect(player3Standing.draws).toBe(1);
    expect(player3Standing.points).toBe(1);
    expect(player3Standing.goalsFor).toBe(2);
    expect(player3Standing.goalsAgainst).toBe(4);
    expect(player3Standing.goalDifference).toBe(-2);
  });

  test('should update standings in real-time when match results change', async () => {
    // Setup initial data
    const players: Player[] = [
      { id: 'p1', name: 'Player1', isActive: true, createdAt: new Date() },
      { id: 'p2', name: 'Player2', isActive: true, createdAt: new Date() },
    ];

    const initialMatch: Match = {
      id: 'm1',
      homePlayerId: 'p1',
      awayPlayerId: 'p2',
      homePlayerName: 'Player1',
      awayPlayerName: 'Player2',
      matchday: 1,
      isPlayed: false,
      isPlayoff: false,
      createdAt: new Date(),
    };

    players.forEach((player) => {
      mockFirebaseService.addToCollection('players', player.id, player);
    });
    mockFirebaseService.addToCollection(
      'matches',
      initialMatch.id,
      initialMatch
    );

    // Initial standings should show no matches played
    await new Promise((resolve) => setTimeout(resolve, 100));
    let standings = await standingsService.getStandings().toPromise();

    expect(standings!.every((s) => s.matchesPlayed === 0)).toBe(true);
    expect(standings!.every((s) => s.points === 0)).toBe(true);

    // Update match with result
    const updatedMatch = {
      ...initialMatch,
      homeGoals: 2,
      awayGoals: 1,
      isPlayed: true,
    };
    mockFirebaseService.addToCollection(
      'matches',
      updatedMatch.id,
      updatedMatch
    );

    // Wait for real-time update
    await new Promise((resolve) => setTimeout(resolve, 100));
    standings = await standingsService.getStandings().toPromise();

    const player1Standing = standings!.find((s) => s.playerId === 'p1')!;
    const player2Standing = standings!.find((s) => s.playerId === 'p2')!;

    expect(player1Standing.matchesPlayed).toBe(1);
    expect(player1Standing.wins).toBe(1);
    expect(player1Standing.points).toBe(3);
    expect(player1Standing.position).toBe(1);

    expect(player2Standing.matchesPlayed).toBe(1);
    expect(player2Standing.losses).toBe(1);
    expect(player2Standing.points).toBe(0);
    expect(player2Standing.position).toBe(2);
  });

  test('should handle tiebreaking correctly', async () => {
    // Setup players with same points but different goal differences
    const players: Player[] = [
      { id: 'p1', name: 'Player1', isActive: true, createdAt: new Date() },
      { id: 'p2', name: 'Player2', isActive: true, createdAt: new Date() },
      { id: 'p3', name: 'Player3', isActive: true, createdAt: new Date() },
    ];

    const matches: Match[] = [
      // Player1 vs Player3: 3-0 (Player1 wins)
      {
        id: 'm1',
        homePlayerId: 'p1',
        awayPlayerId: 'p3',
        homePlayerName: 'Player1',
        awayPlayerName: 'Player3',
        matchday: 1,
        homeGoals: 3,
        awayGoals: 0,
        isPlayed: true,
        isPlayoff: false,
        createdAt: new Date(),
      },
      // Player2 vs Player3: 1-0 (Player2 wins)
      {
        id: 'm2',
        homePlayerId: 'p2',
        awayPlayerId: 'p3',
        homePlayerName: 'Player2',
        awayPlayerName: 'Player3',
        matchday: 1,
        homeGoals: 1,
        awayGoals: 0,
        isPlayed: true,
        isPlayoff: false,
        createdAt: new Date(),
      },
    ];

    players.forEach((player) => {
      mockFirebaseService.addToCollection('players', player.id, player);
    });

    matches.forEach((match) => {
      mockFirebaseService.addToCollection('matches', match.id, match);
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    const standings = await standingsService.getStandings().toPromise();

    // Both Player1 and Player2 have 3 points, but Player1 has better goal difference
    const player1Standing = standings!.find((s) => s.playerId === 'p1')!;
    const player2Standing = standings!.find((s) => s.playerId === 'p2')!;

    expect(player1Standing.points).toBe(3);
    expect(player2Standing.points).toBe(3);
    expect(player1Standing.goalDifference).toBe(3); // 3-0
    expect(player2Standing.goalDifference).toBe(1); // 1-0

    // Player1 should be ranked higher due to better goal difference
    expect(player1Standing.position).toBe(1);
    expect(player2Standing.position).toBe(2);
  });

  test('should get playoff qualifiers correctly', async () => {
    // Setup 6 players with different points
    const players: Player[] = Array.from({ length: 6 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player${i + 1}`,
      isActive: true,
      createdAt: new Date(),
    }));

    // Create matches to establish clear standings
    const matches: Match[] = [
      // Player1 beats Player6: 3 points
      {
        id: 'm1',
        homePlayerId: 'p1',
        awayPlayerId: 'p6',
        homePlayerName: 'Player1',
        awayPlayerName: 'Player6',
        matchday: 1,
        homeGoals: 2,
        awayGoals: 0,
        isPlayed: true,
        isPlayoff: false,
        createdAt: new Date(),
      },
      // Player2 beats Player5: 3 points
      {
        id: 'm2',
        homePlayerId: 'p2',
        awayPlayerId: 'p5',
        homePlayerName: 'Player2',
        awayPlayerName: 'Player5',
        matchday: 1,
        homeGoals: 1,
        awayGoals: 0,
        isPlayed: true,
        isPlayoff: false,
        createdAt: new Date(),
      },
      // Player3 beats Player4: 3 points
      {
        id: 'm3',
        homePlayerId: 'p3',
        awayPlayerId: 'p4',
        homePlayerName: 'Player3',
        awayPlayerName: 'Player4',
        matchday: 1,
        homeGoals: 3,
        awayGoals: 1,
        isPlayed: true,
        isPlayoff: false,
        createdAt: new Date(),
      },
      // Player4 beats Player6: 3 points (Player4 now has 3 points total)
      {
        id: 'm4',
        homePlayerId: 'p4',
        awayPlayerId: 'p6',
        homePlayerName: 'Player4',
        awayPlayerName: 'Player6',
        matchday: 2,
        homeGoals: 2,
        awayGoals: 1,
        isPlayed: true,
        isPlayoff: false,
        createdAt: new Date(),
      },
    ];

    players.forEach((player) => {
      mockFirebaseService.addToCollection('players', player.id, player);
    });

    matches.forEach((match) => {
      mockFirebaseService.addToCollection('matches', match.id, match);
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const playoffQualifiers = await standingsService
      .getPlayoffQualifiers()
      .toPromise();

    expect(playoffQualifiers!.length).toBe(4);

    // Should be top 4 players by points and goal difference
    const qualifierIds = playoffQualifiers!.map((q) => q.playerId);
    expect(qualifierIds).toContain('p1');
    expect(qualifierIds).toContain('p2');
    expect(qualifierIds).toContain('p3');
    expect(qualifierIds).toContain('p4');

    // Should be sorted by position
    expect(playoffQualifiers![0].position).toBe(1);
    expect(playoffQualifiers![1].position).toBe(2);
    expect(playoffQualifiers![2].position).toBe(3);
    expect(playoffQualifiers![3].position).toBe(4);
  });

  test('should calculate head-to-head records correctly', async () => {
    const players: Player[] = [
      { id: 'p1', name: 'Player1', isActive: true, createdAt: new Date() },
      { id: 'p2', name: 'Player2', isActive: true, createdAt: new Date() },
    ];

    const matches: Match[] = [
      // Player1 vs Player2: 2-1 (Player1 wins)
      {
        id: 'm1',
        homePlayerId: 'p1',
        awayPlayerId: 'p2',
        homePlayerName: 'Player1',
        awayPlayerName: 'Player2',
        matchday: 1,
        homeGoals: 2,
        awayGoals: 1,
        isPlayed: true,
        isPlayoff: false,
        createdAt: new Date(),
      },
      // Player2 vs Player1: 1-1 (Draw)
      {
        id: 'm2',
        homePlayerId: 'p2',
        awayPlayerId: 'p1',
        homePlayerName: 'Player2',
        awayPlayerName: 'Player1',
        matchday: 2,
        homeGoals: 1,
        awayGoals: 1,
        isPlayed: true,
        isPlayoff: false,
        createdAt: new Date(),
      },
    ];

    players.forEach((player) => {
      mockFirebaseService.addToCollection('players', player.id, player);
    });

    matches.forEach((match) => {
      mockFirebaseService.addToCollection('matches', match.id, match);
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const headToHead = await standingsService
      .getHeadToHeadRecord('p1', 'p2')
      .toPromise();

    expect(headToHead!.totalMatches).toBe(2);
    expect(headToHead!.player1Wins).toBe(1);
    expect(headToHead!.player2Wins).toBe(0);
    expect(headToHead!.draws).toBe(1);
    expect(headToHead!.player1Goals).toBe(3); // 2 + 1
    expect(headToHead!.player2Goals).toBe(2); // 1 + 1
  });

  test('should calculate player form correctly', async () => {
    const players: Player[] = [
      { id: 'p1', name: 'Player1', isActive: true, createdAt: new Date() },
      { id: 'p2', name: 'Player2', isActive: true, createdAt: new Date() },
      { id: 'p3', name: 'Player3', isActive: true, createdAt: new Date() },
    ];

    // Create matches with different results for Player1
    const matches: Match[] = [
      // Win
      {
        id: 'm1',
        homePlayerId: 'p1',
        awayPlayerId: 'p2',
        homePlayerName: 'Player1',
        awayPlayerName: 'Player2',
        matchday: 1,
        homeGoals: 2,
        awayGoals: 0,
        isPlayed: true,
        isPlayoff: false,
        createdAt: new Date('2024-01-01'),
      },
      // Loss
      {
        id: 'm2',
        homePlayerId: 'p3',
        awayPlayerId: 'p1',
        homePlayerName: 'Player3',
        awayPlayerName: 'Player1',
        matchday: 2,
        homeGoals: 3,
        awayGoals: 1,
        isPlayed: true,
        isPlayoff: false,
        createdAt: new Date('2024-01-02'),
      },
      // Draw
      {
        id: 'm3',
        homePlayerId: 'p1',
        awayPlayerId: 'p3',
        homePlayerName: 'Player1',
        awayPlayerName: 'Player3',
        matchday: 3,
        homeGoals: 1,
        awayGoals: 1,
        isPlayed: true,
        isPlayoff: false,
        createdAt: new Date('2024-01-03'),
      },
      // Win
      {
        id: 'm4',
        homePlayerId: 'p2',
        awayPlayerId: 'p1',
        homePlayerName: 'Player2',
        awayPlayerName: 'Player1',
        matchday: 4,
        homeGoals: 0,
        awayGoals: 2,
        isPlayed: true,
        isPlayoff: false,
        createdAt: new Date('2024-01-04'),
      },
    ];

    players.forEach((player) => {
      mockFirebaseService.addToCollection('players', player.id, player);
    });

    matches.forEach((match) => {
      mockFirebaseService.addToCollection('matches', match.id, match);
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const form = await standingsService.getPlayerForm('p1', 4).toPromise();

    expect(form!.results.length).toBe(4);
    expect(form!.results).toEqual(['W', 'D', 'L', 'W']); // Most recent first
    expect(form!.wins).toBe(2);
    expect(form!.draws).toBe(1);
    expect(form!.losses).toBe(1);
    expect(form!.points).toBe(7); // 2 wins (6 points) + 1 draw (1 point)
    expect(form!.goalsFor).toBe(6); // 2 + 1 + 1 + 2
    expect(form!.goalsAgainst).toBe(5); // 0 + 3 + 1 + 0
  });

  test('should handle empty match data gracefully', async () => {
    const players: Player[] = [
      { id: 'p1', name: 'Player1', isActive: true, createdAt: new Date() },
      { id: 'p2', name: 'Player2', isActive: true, createdAt: new Date() },
    ];

    players.forEach((player) => {
      mockFirebaseService.addToCollection('players', player.id, player);
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const standings = await standingsService.getStandings().toPromise();

    expect(standings!.length).toBe(2);
    expect(standings!.every((s) => s.matchesPlayed === 0)).toBe(true);
    expect(standings!.every((s) => s.points === 0)).toBe(true);
    expect(standings!.every((s) => s.wins === 0)).toBe(true);
    expect(standings!.every((s) => s.draws === 0)).toBe(true);
    expect(standings!.every((s) => s.losses === 0)).toBe(true);
  });
});
