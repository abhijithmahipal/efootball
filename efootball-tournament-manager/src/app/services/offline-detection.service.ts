import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class OfflineDetectionService {
  private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);

  constructor() {
    this.setupNetworkListeners();
  }

  /**
   * Get online status as observable
   */
  getOnlineStatus(): Observable<boolean> {
    return this.isOnlineSubject.asObservable();
  }

  /**
   * Get offline status as observable
   */
  getOfflineStatus(): Observable<boolean> {
    return this.isOnlineSubject.pipe(map((isOnline) => !isOnline));
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.isOnlineSubject.value;
  }

  /**
   * Check if currently offline
   */
  isOffline(): boolean {
    return !this.isOnlineSubject.value;
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkListeners(): void {
    const online$ = fromEvent(window, 'online').pipe(map(() => true));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => false));

    merge(online$, offline$)
      .pipe(startWith(navigator.onLine))
      .subscribe((isOnline) => {
        this.isOnlineSubject.next(isOnline);
        console.log(
          `Network status changed: ${isOnline ? 'online' : 'offline'}`
        );
      });
  }
}
