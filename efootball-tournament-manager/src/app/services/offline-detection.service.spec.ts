import { TestBed } from '@angular/core/testing';
import { OfflineDetectionService } from './offline-detection.service';

describe('OfflineDetectionService', () => {
  let service: OfflineDetectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OfflineDetectionService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with current navigator.onLine status', (done) => {
      service.getOnlineStatus().subscribe((isOnline) => {
        expect(isOnline).toBe(navigator.onLine);
        done();
      });
    });

    it('should provide offline status as inverse of online status', (done) => {
      service.getOfflineStatus().subscribe((isOffline) => {
        expect(isOffline).toBe(!navigator.onLine);
        done();
      });
    });
  });

  describe('Status Checking Methods', () => {
    it('should return current online status synchronously', () => {
      const isOnline = service.isOnline();
      expect(typeof isOnline).toBe('boolean');
      expect(isOnline).toBe(navigator.onLine);
    });

    it('should return current offline status synchronously', () => {
      const isOffline = service.isOffline();
      expect(typeof isOffline).toBe('boolean');
      expect(isOffline).toBe(!navigator.onLine);
    });
  });

  describe('Network Event Handling', () => {
    it('should update status when online event is fired', (done) => {
      let callCount = 0;
      service.getOnlineStatus().subscribe((isOnline) => {
        callCount++;
        if (callCount === 2) {
          // Skip initial value
          expect(isOnline).toBeTrue();
          done();
        }
      });

      // Simulate online event
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);
    });

    it('should update status when offline event is fired', (done) => {
      let callCount = 0;
      service.getOnlineStatus().subscribe((isOnline) => {
        callCount++;
        if (callCount === 2) {
          // Skip initial value
          expect(isOnline).toBeFalse();
          done();
        }
      });

      // Simulate offline event
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);
    });
  });
});
