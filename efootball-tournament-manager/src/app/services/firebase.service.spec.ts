import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { FirebaseService, ConnectionStatus } from './firebase.service';
import { of, throwError, Subject } from 'rxjs';

describe('FirebaseService - Real-time Data Synchronization', () => {
  let service: FirebaseService;
  let mockFirestore: jasmine.SpyObj<Firestore>;
  let mockAuth: jasmine.SpyObj<Auth>;

  beforeEach(() => {
    const firestoreSpy = jasmine.createSpyObj('Firestore', [
      'collection',
      'doc',
    ]);
    const authSpy = jasmine.createSpyObj('Auth', [
      'signInWithEmailAndPassword',
    ]);

    TestBed.configureTestingModule({
      providers: [
        FirebaseService,
        { provide: Firestore, useValue: firestoreSpy },
        { provide: Auth, useValue: authSpy },
      ],
    });

    service = TestBed.inject(FirebaseService);
    mockFirestore = TestBed.inject(Firestore) as jasmine.SpyObj<Firestore>;
    mockAuth = TestBed.inject(Auth) as jasmine.SpyObj<Auth>;
  });

  describe('Connection Management', () => {
    it('should initialize with disconnected state', () => {
      service.getConnectionStatus().subscribe((status) => {
        expect(status.isConnected).toBeFalse();
        expect(status.retryAttempts).toBe(0);
      });
    });

    it('should update connection status on successful connection', (done) => {
      spyOn(service, 'testConnection').and.returnValue(of([]));

      service.getConnectionStatus().subscribe((status) => {
        if (status.isConnected) {
          expect(status.isConnected).toBeTrue();
          expect(status.retryAttempts).toBe(0);
          expect(status.lastConnected).toBeDefined();
          done();
        }
      });

      // Trigger connection initialization
      (service as any).initializeConnection();
    });

    it('should handle connection failures with retry logic', (done) => {
      const error = new Error('Connection failed');
      spyOn(service, 'testConnection').and.returnValue(throwError(() => error));

      let callCount = 0;
      service.getConnectionStatus().subscribe((status) => {
        callCount++;
        if (callCount === 1) {
          expect(status.isConnected).toBeFalse();
          expect(status.retryAttempts).toBe(1);
          done();
        }
      });

      (service as any).initializeConnection();
    });

    it('should detect network status changes', () => {
      const onlineEvent = new Event('online');
      const offlineEvent = new Event('offline');

      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      service.getConnectionStatus().subscribe((status) => {
        expect(status.isOnline).toBeTrue();
      });

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      window.dispatchEvent(offlineEvent);

      service.getConnectionStatus().subscribe((status) => {
        expect(status.isOnline).toBeFalse();
      });
    });
  });

  describe('Real-time Collection Data', () => {
    it('should setup real-time listener with proper subscription management', (done) => {
      const mockData = [
        { id: '1', name: 'Test Item 1' },
        { id: '2', name: 'Test Item 2' },
      ];

      const mockSnapshot = {
        docs: mockData.map((item) => ({
          id: item.id,
          data: () => ({ name: item.name }),
        })),
      };

      // Mock onSnapshot
      const mockUnsubscribe = jasmine.createSpy('unsubscribe');
      spyOn(service as any, 'onSnapshot').and.callFake(
        (ref: any, onNext: any, onError: any) => {
          setTimeout(() => onNext(mockSnapshot), 0);
          return mockUnsubscribe;
        }
      );

      const subscription = service
        .getCollectionData('test-collection')
        .subscribe({
          next: (data) => {
            expect(data).toEqual(mockData);
            expect(
              (service as any).subscriptions.has('collection_test-collection')
            ).toBeTrue();

            // Test cleanup
            subscription.unsubscribe();
            expect(mockUnsubscribe).toHaveBeenCalled();
            done();
          },
        });
    });

    it('should handle real-time listener errors with retry logic', (done) => {
      const error = { code: 'unavailable', message: 'Service unavailable' };
      let attemptCount = 0;

      spyOn(service as any, 'onSnapshot').and.callFake(
        (ref: any, onNext: any, onError: any) => {
          attemptCount++;
          if (attemptCount === 1) {
            setTimeout(() => onError(error), 0);
          } else {
            // Succeed on retry
            setTimeout(() => onNext({ docs: [] }), 0);
          }
          return jasmine.createSpy('unsubscribe');
        }
      );

      service.getCollectionData('test-collection').subscribe({
        next: (data) => {
          if (attemptCount > 1) {
            expect(data).toEqual([]);
            done();
          }
        },
        error: (err) => {
          // Should not reach here due to retry logic
          fail('Should have retried the operation');
        },
      });
    });

    it('should prevent memory leaks by cleaning up subscriptions', () => {
      const mockUnsubscribe = jasmine.createSpy('unsubscribe');
      spyOn(service as any, 'onSnapshot').and.returnValue(mockUnsubscribe);

      const subscription1 = service
        .getCollectionData('test-collection', 'key1')
        .subscribe();
      const subscription2 = service
        .getCollectionData('test-collection', 'key1')
        .subscribe(); // Same key

      expect((service as any).subscriptions.size).toBe(1); // Should replace previous subscription
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1); // Previous subscription cleaned up

      subscription2.unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe('Real-time Document Data', () => {
    it('should setup real-time document listener', (done) => {
      const mockData = { id: 'doc1', name: 'Test Document' };
      const mockDocSnapshot = {
        exists: () => true,
        id: mockData.id,
        data: () => ({ name: mockData.name }),
      };

      spyOn(service as any, 'onSnapshot').and.callFake(
        (ref: any, onNext: any) => {
          setTimeout(() => onNext(mockDocSnapshot), 0);
          return jasmine.createSpy('unsubscribe');
        }
      );

      service.getDocumentDataRealtime('test-collection', 'doc1').subscribe({
        next: (data) => {
          expect(data).toEqual(mockData);
          done();
        },
      });
    });

    it('should handle non-existent documents', (done) => {
      const mockDocSnapshot = {
        exists: () => false,
      };

      spyOn(service as any, 'onSnapshot').and.callFake(
        (ref: any, onNext: any) => {
          setTimeout(() => onNext(mockDocSnapshot), 0);
          return jasmine.createSpy('unsubscribe');
        }
      );

      service
        .getDocumentDataRealtime('test-collection', 'non-existent')
        .subscribe({
          next: (data) => {
            expect(data).toBeNull();
            done();
          },
        });
    });
  });

  describe('Error Handling', () => {
    it('should determine retryable errors correctly', () => {
      const retryableErrors = [
        { code: 'unavailable' },
        { code: 'deadline-exceeded' },
        { code: 'resource-exhausted' },
        { code: 'internal' },
        { code: 'unknown' },
      ];

      const nonRetryableErrors = [
        { code: 'permission-denied' },
        { code: 'not-found' },
        { code: 'already-exists' },
        { code: 'invalid-argument' },
      ];

      retryableErrors.forEach((error) => {
        expect((service as any).shouldRetryError(error)).toBeTrue();
      });

      nonRetryableErrors.forEach((error) => {
        expect((service as any).shouldRetryError(error)).toBeFalse();
      });
    });

    it('should create proper error info objects', () => {
      const originalError = {
        code: 'unavailable',
        message: 'Service is unavailable',
      };

      const errorInfo = (service as any).createFirebaseError(
        originalError,
        'testOperation'
      );

      expect(errorInfo.code).toBe('unavailable');
      expect(errorInfo.message).toBe('Service is unavailable');
      expect(errorInfo.operation).toBe('testOperation');
      expect(errorInfo.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Force Reconnection', () => {
    it('should force reconnection and update status', (done) => {
      spyOn(service, 'testConnection').and.returnValue(of([]));

      service.forceReconnect().subscribe({
        next: () => {
          service.getConnectionStatus().subscribe((status) => {
            expect(status.isConnected).toBeTrue();
            expect(status.retryAttempts).toBe(0);
            done();
          });
        },
      });
    });

    it('should handle force reconnection failures', (done) => {
      const error = new Error('Reconnection failed');
      spyOn(service, 'testConnection').and.returnValue(throwError(() => error));

      service.forceReconnect().subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all subscriptions on destroy', () => {
      const mockUnsubscribe1 = jasmine.createSpy('unsubscribe1');
      const mockUnsubscribe2 = jasmine.createSpy('unsubscribe2');

      (service as any).subscriptions.set('key1', mockUnsubscribe1);
      (service as any).subscriptions.set('key2', mockUnsubscribe2);

      service.ngOnDestroy();

      expect(mockUnsubscribe1).toHaveBeenCalled();
      expect(mockUnsubscribe2).toHaveBeenCalled();
      expect((service as any).subscriptions.size).toBe(0);
    });
  });
});
