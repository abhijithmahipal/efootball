import { TestBed } from '@angular/core/testing';
import { PlayerService } from './player.service';
import { FirebaseService, ConnectionStatus } from './firebase.service';
import { Player } from '../models/player.model';
import { of, throwError, BehaviorSubject, Subject } from 'rxjs';

describe('PlayerService', () => {
  let service: PlayerService;
  let mockFirebaseService: jasmine.SpyObj<FirebaseService>;
  let connectionStatusSubject: BehaviorSubject<ConnectionStatus>;

  const mockPlayers: Player[] = [
    {
      id: 'player1',
      name: 'John Doe',
      isActive: true,
      createdAt: new Date('2023-01-01'),
    },
    {
      id: 'player2',
      name: 'Jane Smith',
      isActive: true,
      createdAt: new Date('2023-01-02'),
    },
    {
      id: 'player3',
      name: 'Bob Johnson',
      isActive: false,
      createdAt: new Date('2023-01-03'),
    },
  ];

  beforeEach(() => {
    connectionStatusSubject = new BehaviorSubject<ConnectionStatus>({
      isConnected: true,
      isOnline: true,
      retryAttempts: 0,
    });

    const firebaseServiceSpy = jasmine.createSpyObj('FirebaseService', [
      'getCollectionData',
      'getDocumentData',
      'setDocument',
      'updateDocument',
      'deleteDocument',
      'getConnectionStatus',
    ]);

    // Setup default mock behavior before TestBed configuration
    firebaseServiceSpy.getCollectionData.and.returnValue(of(mockPlayers));
    firebaseServiceSpy.getConnectionStatus.and.returnValue(
      connectionStatusSubject.asObservable()
    );

    TestBed.configureTestingModule({
      providers: [
        PlayerService,
        { provide: FirebaseService, useValue: firebaseServiceSpy },
      ],
    });

    mockFirebaseService = TestBed.inject(
      FirebaseService
    ) as jasmine.SpyObj<FirebaseService>;
    service = TestBed.inject(PlayerService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize players subscription on creation', () => {
      expect(mockFirebaseService.getCollectionData).toHaveBeenCalledWith(
        'players'
      );
    });
  });

  describe('getPlayers', () => {
    it('should return players observable', (done) => {
      service.getPlayers().subscribe((players) => {
        expect(players).toEqual(mockPlayers);
        done();
      });
    });

    it('should sort players by creation date (newest first)', (done) => {
      const unsortedPlayers = [
        { ...mockPlayers[0], createdAt: new Date('2023-01-01') },
        { ...mockPlayers[1], createdAt: new Date('2023-01-03') },
        { ...mockPlayers[2], createdAt: new Date('2023-01-02') },
      ];

      mockFirebaseService.getCollectionData.and.returnValue(
        of(unsortedPlayers)
      );

      // Create new service instance to trigger initialization
      const newService = new PlayerService(mockFirebaseService);

      newService.getPlayers().subscribe((players) => {
        expect(players[0].createdAt.getTime()).toBeGreaterThan(
          players[1].createdAt.getTime()
        );
        expect(players[1].createdAt.getTime()).toBeGreaterThan(
          players[2].createdAt.getTime()
        );
        done();
      });
    });
  });

  describe('getPlayerById', () => {
    it('should return player by ID', (done) => {
      const playerId = 'player1';
      mockFirebaseService.getDocumentData.and.returnValue(of(mockPlayers[0]));

      service.getPlayerById(playerId).subscribe((player) => {
        expect(player).toEqual(mockPlayers[0]);
        expect(mockFirebaseService.getDocumentData).toHaveBeenCalledWith(
          'players',
          playerId
        );
        done();
      });
    });

    it('should return null if player not found', (done) => {
      mockFirebaseService.getDocumentData.and.returnValue(of(null));

      service.getPlayerById('nonexistent').subscribe((player) => {
        expect(player).toBeNull();
        done();
      });
    });

    it('should throw error for empty ID', (done) => {
      service.getPlayerById('').subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toBe('Player ID is required');
          done();
        },
      });
    });
  });

  describe('addPlayer', () => {
    const newPlayerData = {
      name: 'New Player',
      isActive: true,
    };

    beforeEach(() => {
      mockFirebaseService.setDocument.and.returnValue(of(void 0));
    });

    it('should add a new player successfully', (done) => {
      service.addPlayer(newPlayerData).subscribe((player) => {
        expect(player.name).toBe(newPlayerData.name);
        expect(player.isActive).toBe(newPlayerData.isActive);
        expect(player.id).toBeDefined();
        expect(player.createdAt).toBeInstanceOf(Date);
        expect(mockFirebaseService.setDocument).toHaveBeenCalled();
        done();
      });
    });

    it('should trim player name', (done) => {
      const playerWithSpaces = { ...newPlayerData, name: '  Spaced Name  ' };

      service.addPlayer(playerWithSpaces).subscribe((player) => {
        expect(player.name).toBe('Spaced Name');
        done();
      });
    });

    it('should set default isActive to true if not provided', (done) => {
      const playerWithoutActive = { name: 'Test Player' };

      service.addPlayer(playerWithoutActive).subscribe((player) => {
        expect(player.isActive).toBe(true);
        done();
      });
    });

    it('should reject duplicate player names', (done) => {
      const duplicatePlayer = { name: 'John Doe', isActive: true };

      service.addPlayer(duplicatePlayer).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toContain('already exists');
          done();
        },
      });
    });

    it('should validate player data', (done) => {
      const invalidPlayer = { name: '', isActive: true };

      service.addPlayer(invalidPlayer).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toContain('Validation failed');
          done();
        },
      });
    });
  });

  describe('updatePlayer', () => {
    const playerId = 'player1';
    const updates = { name: 'Updated Name' };

    beforeEach(() => {
      mockFirebaseService.updateDocument.and.returnValue(of(void 0));
      mockFirebaseService.getDocumentData.and.returnValue(
        of({ ...mockPlayers[0], ...updates })
      );
    });

    it('should update player successfully', (done) => {
      service.updatePlayer(playerId, updates).subscribe((player) => {
        expect(player.name).toBe(updates.name);
        expect(mockFirebaseService.updateDocument).toHaveBeenCalledWith(
          'players',
          playerId,
          { name: 'Updated Name' }
        );
        done();
      });
    });

    it('should trim updated name', (done) => {
      const spacedUpdate = { name: '  Spaced Update  ' };

      service.updatePlayer(playerId, spacedUpdate).subscribe(() => {
        expect(mockFirebaseService.updateDocument).toHaveBeenCalledWith(
          'players',
          playerId,
          { name: 'Spaced Update' }
        );
        done();
      });
    });

    it('should reject empty player ID', (done) => {
      service.updatePlayer('', updates).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toBe('Player ID is required');
          done();
        },
      });
    });

    it('should reject duplicate names', (done) => {
      const duplicateUpdate = { name: 'Jane Smith' };

      service.updatePlayer(playerId, duplicateUpdate).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toContain('already exists');
          done();
        },
      });
    });

    it('should validate update data', (done) => {
      const invalidUpdate = { name: '' };

      service.updatePlayer(playerId, invalidUpdate).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toContain('Validation failed');
          done();
        },
      });
    });
  });

  describe('deletePlayer', () => {
    const playerId = 'player1';

    beforeEach(() => {
      mockFirebaseService.updateDocument.and.returnValue(of(void 0));
    });

    it('should soft delete player by setting isActive to false', (done) => {
      service.deletePlayer(playerId).subscribe(() => {
        expect(mockFirebaseService.updateDocument).toHaveBeenCalledWith(
          'players',
          playerId,
          { isActive: false }
        );
        done();
      });
    });

    it('should reject empty player ID', (done) => {
      service.deletePlayer('').subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toBe('Player ID is required');
          done();
        },
      });
    });
  });

  describe('permanentlyDeletePlayer', () => {
    const playerId = 'player1';

    beforeEach(() => {
      mockFirebaseService.deleteDocument.and.returnValue(of(void 0));
    });

    it('should permanently delete player', (done) => {
      service.permanentlyDeletePlayer(playerId).subscribe(() => {
        expect(mockFirebaseService.deleteDocument).toHaveBeenCalledWith(
          'players',
          playerId
        );
        done();
      });
    });

    it('should reject empty player ID', (done) => {
      service.permanentlyDeletePlayer('').subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toBe('Player ID is required');
          done();
        },
      });
    });
  });

  describe('getActivePlayers', () => {
    it('should return only active players', (done) => {
      service.getActivePlayers().subscribe((players) => {
        expect(players.length).toBe(2);
        expect(players.every((player) => player.isActive)).toBe(true);
        done();
      });
    });
  });

  describe('getPlayerCount', () => {
    it('should return total player count', (done) => {
      service.getPlayerCount().subscribe((count) => {
        expect(count).toBe(3);
        done();
      });
    });
  });

  describe('getActivePlayerCount', () => {
    it('should return active player count', (done) => {
      service.getActivePlayerCount().subscribe((count) => {
        expect(count).toBe(2);
        done();
      });
    });
  });

  describe('hasMinimumPlayers', () => {
    it('should return false when less than 5 active players', (done) => {
      service.hasMinimumPlayers().subscribe((hasMinimum) => {
        expect(hasMinimum).toBe(false);
        done();
      });
    });

    it('should return true when 5 or more active players', (done) => {
      const manyPlayers = Array.from({ length: 6 }, (_, i) => ({
        id: `player${i}`,
        name: `Player ${i}`,
        isActive: true,
        createdAt: new Date(),
      }));

      mockFirebaseService.getCollectionData.and.returnValue(of(manyPlayers));

      // Create new service instance to trigger initialization with new data
      const newService = new PlayerService(mockFirebaseService);

      newService.hasMinimumPlayers().subscribe((hasMinimum) => {
        expect(hasMinimum).toBe(true);
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

  describe('Real-time Data Synchronization', () => {
    it('should setup real-time subscription with proper key', () => {
      expect(mockFirebaseService.getCollectionData).toHaveBeenCalledWith(
        'players',
        'players_main'
      );
    });

    it('should handle real-time data updates', (done) => {
      const updatedPlayers = [
        ...mockPlayers,
        {
          id: 'player4',
          name: 'New Player',
          isActive: true,
          createdAt: new Date(),
        },
      ];

      const dataSubject = new Subject<Player[]>();
      mockFirebaseService.getCollectionData.and.returnValue(
        dataSubject.asObservable()
      );

      const newService = new PlayerService(mockFirebaseService);

      newService.getPlayers().subscribe((players) => {
        if (players.length === 4) {
          expect(players).toEqual(updatedPlayers);
          done();
        }
      });

      // Simulate real-time update
      dataSubject.next(updatedPlayers);
    });

    it('should handle connection status changes', (done) => {
      let errorCallCount = 0;
      const errorSubject = new Subject<any>();

      mockFirebaseService.getCollectionData.and.returnValue(
        errorSubject.asObservable()
      );

      const newService = new PlayerService(mockFirebaseService);

      newService.getErrorState().subscribe((error) => {
        if (error) {
          errorCallCount++;
          expect(error).toContain('Failed to load players');

          // Simulate connection restoration
          connectionStatusSubject.next({
            isConnected: true,
            isOnline: true,
            retryAttempts: 0,
          });

          if (errorCallCount === 1) {
            done();
          }
        }
      });

      // Simulate connection error
      errorSubject.error(new Error('Connection lost'));
    });

    it('should provide error state management', (done) => {
      service.getErrorState().subscribe((error) => {
        expect(error).toBeNull(); // Initially no error
        done();
      });
    });

    it('should allow error clearing', () => {
      service.clearError();
      service.getErrorState().subscribe((error) => {
        expect(error).toBeNull();
      });
    });

    it('should allow retry operations', () => {
      spyOn(service as any, 'initializePlayersSubscription');
      service.retryOperation();
      expect((service as any).initializePlayersSubscription).toHaveBeenCalled();
    });

    it('should cleanup subscriptions on destroy', () => {
      const subscriptions = (service as any).subscriptions;
      spyOn(subscriptions[0], 'unsubscribe').and.callThrough();

      service.ngOnDestroy();

      expect(subscriptions[0].unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle Firebase errors gracefully', (done) => {
      const errorMessage = 'Firebase connection error';
      mockFirebaseService.getDocumentData.and.returnValue(
        throwError(() => new Error(errorMessage))
      );

      service.getPlayerById('player1').subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toContain('Failed to fetch player');
          done();
        },
      });
    });

    it('should handle subscription errors without crashing', () => {
      mockFirebaseService.getCollectionData.and.returnValue(
        throwError(() => new Error('Connection failed'))
      );

      // Should not throw during service creation
      expect(() => new PlayerService(mockFirebaseService)).not.toThrow();
    });

    it('should set error state on subscription failures', (done) => {
      const errorSubject = new Subject<Player[]>();
      mockFirebaseService.getCollectionData.and.returnValue(
        errorSubject.asObservable()
      );

      const newService = new PlayerService(mockFirebaseService);

      newService.getErrorState().subscribe((error) => {
        if (error) {
          expect(error).toContain('Failed to load players');
          done();
        }
      });

      errorSubject.error(new Error('Subscription failed'));
    });
  });
});
