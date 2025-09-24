import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

/**
 * Mock Firebase Service for testing
 * Provides in-memory storage and simulates Firebase operations
 */
export class MockFirebaseService {
  private collections = new Map<string, Map<string, any>>();
  private connectionStatus = new BehaviorSubject({
    isConnected: true,
    retryAttempts: 0,
  });
  private shouldSimulateError = false;
  private errorMessage = 'Simulated network error';

  getCollectionData<T>(collectionName: string, subscriptionId: string) {
    if (this.shouldSimulateError) {
      throw new Error(this.errorMessage);
    }
    const collection = this.collections.get(collectionName) || new Map();
    return of(Array.from(collection.values()) as T[]);
  }

  getDocumentData<T>(collectionName: string, docId: string) {
    if (this.shouldSimulateError) {
      throw new Error(this.errorMessage);
    }
    const collection = this.collections.get(collectionName) || new Map();
    return of((collection.get(docId) as T) || null);
  }

  setDocument(collectionName: string, docId: string, data: any) {
    if (this.shouldSimulateError) {
      return of(void 0).pipe(() => {
        throw new Error(this.errorMessage);
      });
    }
    if (!this.collections.has(collectionName)) {
      this.collections.set(collectionName, new Map());
    }
    this.collections.get(collectionName)!.set(docId, data);
    return of(void 0);
  }

  updateDocument(collectionName: string, docId: string, updates: any) {
    if (this.shouldSimulateError) {
      return of(void 0).pipe(() => {
        throw new Error(this.errorMessage);
      });
    }
    const collection = this.collections.get(collectionName);
    if (collection && collection.has(docId)) {
      const existing = collection.get(docId);
      collection.set(docId, { ...existing, ...updates });
      return of(void 0);
    }
    return of(void 0).pipe(() => {
      throw new Error('Document not found');
    });
  }

  deleteDocument(collectionName: string, docId: string) {
    if (this.shouldSimulateError) {
      return of(void 0).pipe(() => {
        throw new Error(this.errorMessage);
      });
    }
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

  simulateError(shouldError: boolean, message?: string) {
    this.shouldSimulateError = shouldError;
    if (message) {
      this.errorMessage = message;
    }
  }

  setConnectionStatus(isConnected: boolean, retryAttempts: number = 0) {
    this.connectionStatus.next({ isConnected, retryAttempts });
  }

  addToCollection(collectionName: string, docId: string, data: any) {
    if (!this.collections.has(collectionName)) {
      this.collections.set(collectionName, new Map());
    }
    this.collections.get(collectionName)!.set(docId, data);
  }

  getCollectionSize(collectionName: string): number {
    return this.collections.get(collectionName)?.size || 0;
  }

  getAllCollections(): string[] {
    return Array.from(this.collections.keys());
  }
}

/**
 * Mock Firebase Auth for testing
 */
export class MockFirebaseAuth {
  private userSubject = new BehaviorSubject<any>(null);
  private validCredentials = new Map([
    ['admin@test.com', 'password123'],
    ['test@example.com', 'testpass'],
  ]);

  get currentUser() {
    return this.userSubject.value;
  }

  authState() {
    return this.userSubject.asObservable();
  }

  signInWithEmailAndPassword(email: string, password: string) {
    if (this.validCredentials.get(email) === password) {
      const mockUser = {
        uid: `uid-${Date.now()}`,
        email: email,
        emailVerified: true,
      };
      this.userSubject.next(mockUser);
      return Promise.resolve({ user: mockUser });
    } else {
      return Promise.reject(new Error('Invalid credentials'));
    }
  }

  createUserWithEmailAndPassword(email: string, password: string) {
    const mockUser = {
      uid: `new-uid-${Date.now()}`,
      email: email,
      emailVerified: false,
    };
    this.userSubject.next(mockUser);
    this.validCredentials.set(email, password);
    return Promise.resolve({ user: mockUser });
  }

  signOut() {
    this.userSubject.next(null);
    return Promise.resolve();
  }

  // Helper methods for testing
  setCurrentUser(user: any) {
    this.userSubject.next(user);
  }

  addValidCredentials(email: string, password: string) {
    this.validCredentials.set(email, password);
  }

  clearValidCredentials() {
    this.validCredentials.clear();
  }
}

/**
 * Test data factory for creating consistent test data
 */
export class TestDataFactory {
  static createPlayer(overrides: Partial<any> = {}) {
    return {
      id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'Test Player',
      isActive: true,
      createdAt: new Date(),
      ...overrides,
    };
  }

  static createMatch(overrides: Partial<any> = {}) {
    return {
      id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      homePlayerId: 'player1',
      awayPlayerId: 'player2',
      homePlayerName: 'Home Player',
      awayPlayerName: 'Away Player',
      matchday: 1,
      isPlayed: false,
      isPlayoff: false,
      createdAt: new Date(),
      ...overrides,
    };
  }

  static createStanding(overrides: Partial<any> = {}) {
    return {
      playerId: 'player1',
      playerName: 'Test Player',
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      position: 1,
      ...overrides,
    };
  }

  static createPlayers(count: number): any[] {
    return Array.from({ length: count }, (_, i) =>
      this.createPlayer({
        id: `player${i + 1}`,
        name: `Player ${i + 1}`,
      })
    );
  }

  static createCompletedMatch(
    homeGoals: number,
    awayGoals: number,
    overrides: Partial<any> = {}
  ) {
    return this.createMatch({
      homeGoals,
      awayGoals,
      isPlayed: true,
      ...overrides,
    });
  }

  static createPlayoffMatch(
    round: 'semifinal' | 'final' | 'third-place',
    overrides: Partial<any> = {}
  ) {
    return this.createMatch({
      isPlayoff: true,
      playoffRound: round,
      ...overrides,
    });
  }
}

/**
 * Test utilities for common testing operations
 */
export class TestUtils {
  /**
   * Wait for async operations to complete
   */
  static async waitForAsync(ms: number = 10): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a spy that tracks calls and returns
   */
  static createSpy<T extends (...args: any[]) => any>(
    implementation?: T
  ): jest.SpyInstance<ReturnType<T>, Parameters<T>> {
    return jest.fn(implementation) as jest.SpyInstance<
      ReturnType<T>,
      Parameters<T>
    >;
  }

  /**
   * Setup common test environment
   */
  static setupTestEnvironment() {
    // Reset any global state
    localStorage.clear();
    sessionStorage.clear();

    // Setup common test configuration
    TestBed.configureTestingModule({
      // Common test configuration
    });
  }

  /**
   * Cleanup after tests
   */
  static cleanupTestEnvironment() {
    localStorage.clear();
    sessionStorage.clear();
  }

  /**
   * Generate random test data
   */
  static generateRandomString(length: number = 10): string {
    return Math.random()
      .toString(36)
      .substring(2, 2 + length);
  }

  static generateRandomNumber(min: number = 0, max: number = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Validate test data structure
   */
  static validatePlayer(player: any): boolean {
    return (
      typeof player.id === 'string' &&
      typeof player.name === 'string' &&
      typeof player.isActive === 'boolean' &&
      player.createdAt instanceof Date
    );
  }

  static validateMatch(match: any): boolean {
    return (
      typeof match.id === 'string' &&
      typeof match.homePlayerId === 'string' &&
      typeof match.awayPlayerId === 'string' &&
      typeof match.homePlayerName === 'string' &&
      typeof match.awayPlayerName === 'string' &&
      typeof match.matchday === 'number' &&
      typeof match.isPlayed === 'boolean' &&
      typeof match.isPlayoff === 'boolean' &&
      match.createdAt instanceof Date
    );
  }

  static validateStanding(standing: any): boolean {
    return (
      typeof standing.playerId === 'string' &&
      typeof standing.playerName === 'string' &&
      typeof standing.matchesPlayed === 'number' &&
      typeof standing.wins === 'number' &&
      typeof standing.draws === 'number' &&
      typeof standing.losses === 'number' &&
      typeof standing.goalsFor === 'number' &&
      typeof standing.goalsAgainst === 'number' &&
      typeof standing.goalDifference === 'number' &&
      typeof standing.points === 'number' &&
      typeof standing.position === 'number'
    );
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  static async measureExecutionTime<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    return { result, duration };
  }

  static async measureMemoryUsage<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; memoryDelta: number }> {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const result = await operation();
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryDelta = finalMemory - initialMemory;

    return { result, memoryDelta };
  }

  static expectPerformance(duration: number, maxDuration: number) {
    expect(duration).toBeLessThan(maxDuration);
  }

  static expectMemoryUsage(memoryDelta: number, maxMemoryIncrease: number) {
    expect(memoryDelta).toBeLessThan(maxMemoryIncrease);
  }
}

/**
 * Error simulation utilities
 */
export class ErrorSimulationUtils {
  static createNetworkError(message: string = 'Network error') {
    const error = new Error(message);
    error.name = 'NetworkError';
    return error;
  }

  static createValidationError(message: string = 'Validation error') {
    const error = new Error(message);
    error.name = 'ValidationError';
    return error;
  }

  static createAuthenticationError(message: string = 'Authentication error') {
    const error = new Error(message);
    error.name = 'AuthenticationError';
    return error;
  }

  static createTimeoutError(message: string = 'Operation timed out') {
    const error = new Error(message);
    error.name = 'TimeoutError';
    return error;
  }
}
