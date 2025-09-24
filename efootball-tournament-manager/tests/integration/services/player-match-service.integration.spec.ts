import { test, expect } from '@playwright/test';
import { TestBed } from '@angular/core/testing';
import { PlayerService } from '../../../src/app/services/player.service';
import { MatchService } from '../../../src/app/services/match.service';
import { FirebaseService } from '../../../src/app/services/firebase.service';
import { Player } from '../../../src/app/models/player.model';
import { Match } from '../../../src/app/models/match.model';
import { BehaviorSubject, of, throwError } from 'rxjs';

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

  setConnectionStatus(isConnected: boolean, retryAttempts: number = 0) {
    this.connectionStatus.next({ isConnected, retryAttempts });
  }
}

test.describe('PlayerService and MatchService Integration', () => {
  let playerService: PlayerService;
  let matchService: MatchService;
  let mockFirebaseService: MockFirebaseService;

  test.beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        PlayerService,
        MatchService,
        { provide: FirebaseService, useClass: MockFirebaseService },
      ],
    }).compileComponents();

    playerService = TestBed.inject(PlayerService);
    matchService = TestBed.inject(MatchService);
    mockFirebaseService = TestBed.inject(FirebaseService) as any;

    // Clear collections before each test
    mockFirebaseService.clearCollection('players');
    mockFirebaseService.clearCollection('matches');
  });

  test('should coordinate player creation and schedule generation', async () => {
    // Add 5 players
    const playerNames = ['Player1', 'Player2', 'Player3', 'Player4', 'Player5'];
    const addedPlayers: Player[] = [];

    for (const name of playerNames) {
      const player = await playerService.addPlayer({ name }).toPromise();
      addedPlayers.push(player!);
    }

    // Verify minimum players requirement is met
    const hasMinimum = await playerService.hasMinimumPlayers().toPromise();
    expect(hasMinimum).toBe(true);

    // Generate schedule
    const scheduleResult = await matchService
      .generateRoundRobinSchedule()
      .toPromise();

    expect(scheduleResult).toBeDefined();
    expect(scheduleResult!.matches.length).toBeGreaterThan(0);
    expect(scheduleResult!.totalMatchdays).toBeGreaterThan(0);

    // Verify each player plays against every other player twice (home and away)
    const expectedMatches = 5 * 4; // 5 players * 4 opponents = 20 matches per round
    expect(scheduleResult!.matches.length).toBe(expectedMatches);

    // Verify all players are included in matches
    const playerIdsInMatches = new Set<string>();
    scheduleResult!.matches.forEach((match) => {
      playerIdsInMatches.add(match.homePlayerId);
      playerIdsInMatches.add(match.awayPlayerId);
    });

    addedPlayers.forEach((player) => {
      expect(playerIdsInMatches.has(player.id)).toBe(true);
    });
  });

  test('should prevent schedule generation with insufficient players', async () => {
    // Add only 3 players (below minimum of 5)
    const playerNames = ['Player1', 'Player2', 'Player3'];

    for (const name of playerNames) {
      await playerService.addPlayer({ name }).toPromise();
    }

    // Verify minimum players requirement is not met
    const hasMinimum = await playerService.hasMinimumPlayers().toPromise();
    expect(hasMinimum).toBe(false);

    // Attempt to generate schedule should fail
    try {
      await matchService.generateRoundRobinSchedule().toPromise();
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Minimum 5 active players required');
    }
  });

  test('should handle player deletion and schedule regeneration', async () => {
    // Add 6 players
    const playerNames = [
      'Player1',
      'Player2',
      'Player3',
      'Player4',
      'Player5',
      'Player6',
    ];
    const addedPlayers: Player[] = [];

    for (const name of playerNames) {
      const player = await playerService.addPlayer({ name }).toPromise();
      addedPlayers.push(player!);
    }

    // Generate initial schedule
    const initialSchedule = await matchService
      .generateRoundRobinSchedule()
      .toPromise();
    expect(initialSchedule!.matches.length).toBe(30); // 6 players * 5 opponents

    // Delete one player (soft delete)
    await playerService.deletePlayer(addedPlayers[0].id).toPromise();

    // Verify active player count
    const activeCount = await playerService.getActivePlayerCount().toPromise();
    expect(activeCount).toBe(5);

    // Clear existing matches and regenerate schedule
    await matchService.deleteAllMatches().toPromise();
    const newSchedule = await matchService
      .generateRoundRobinSchedule()
      .toPromise();

    expect(newSchedule!.matches.length).toBe(20); // 5 players * 4 opponents

    // Verify deleted player is not in new schedule
    const playerIdsInNewMatches = new Set<string>();
    newSchedule!.matches.forEach((match) => {
      playerIdsInNewMatches.add(match.homePlayerId);
      playerIdsInNewMatches.add(match.awayPlayerId);
    });

    expect(playerIdsInNewMatches.has(addedPlayers[0].id)).toBe(false);
  });

  test('should handle duplicate player name validation', async () => {
    // Add a player
    await playerService.addPlayer({ name: 'TestPlayer' }).toPromise();

    // Attempt to add another player with the same name
    try {
      await playerService.addPlayer({ name: 'TestPlayer' }).toPromise();
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('already exists');
    }

    // Verify only one player exists
    const players = await playerService.getPlayers().toPromise();
    expect(players!.length).toBe(1);
  });

  test('should coordinate match result updates with player data', async () => {
    // Add players and generate schedule
    const playerNames = ['Player1', 'Player2', 'Player3', 'Player4', 'Player5'];

    for (const name of playerNames) {
      await playerService.addPlayer({ name }).toPromise();
    }

    const scheduleResult = await matchService
      .generateRoundRobinSchedule()
      .toPromise();
    const firstMatch = scheduleResult!.matches[0];

    // Update match result
    const updatedMatch = await matchService
      .updateMatchResult(firstMatch.id, 2, 1)
      .toPromise();

    expect(updatedMatch!.isPlayed).toBe(true);
    expect(updatedMatch!.homeGoals).toBe(2);
    expect(updatedMatch!.awayGoals).toBe(1);

    // Verify match is marked as played
    const matches = await matchService.getMatches().toPromise();
    const playedMatch = matches!.find((m) => m.id === firstMatch.id);
    expect(playedMatch!.isPlayed).toBe(true);
  });

  test('should handle Firebase connection errors gracefully', async () => {
    // Simulate connection loss
    mockFirebaseService.setConnectionStatus(false, 1);

    // Operations should still work with cached data
    const players = await playerService.getPlayers().toPromise();
    expect(Array.isArray(players)).toBe(true);

    // Simulate connection restoration
    mockFirebaseService.setConnectionStatus(true, 0);

    // Should be able to add players after reconnection
    const newPlayer = await playerService
      .addPlayer({ name: 'TestPlayer' })
      .toPromise();
    expect(newPlayer!.name).toBe('TestPlayer');
  });

  test('should validate match result input correctly', async () => {
    // Add players and generate a match
    const playerNames = ['Player1', 'Player2', 'Player3', 'Player4', 'Player5'];

    for (const name of playerNames) {
      await playerService.addPlayer({ name }).toPromise();
    }

    const scheduleResult = await matchService
      .generateRoundRobinSchedule()
      .toPromise();
    const firstMatch = scheduleResult!.matches[0];

    // Test invalid inputs
    const invalidInputs = [
      [-1, 0], // Negative goals
      [0, -1], // Negative goals
      [1.5, 2], // Non-integer goals
      [2, 2.5], // Non-integer goals
    ];

    for (const [homeGoals, awayGoals] of invalidInputs) {
      try {
        await matchService
          .updateMatchResult(firstMatch.id, homeGoals, awayGoals)
          .toPromise();
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('non-negative integers');
      }
    }

    // Test valid input
    const validResult = await matchService
      .updateMatchResult(firstMatch.id, 3, 1)
      .toPromise();
    expect(validResult!.homeGoals).toBe(3);
    expect(validResult!.awayGoals).toBe(1);
  });
});
