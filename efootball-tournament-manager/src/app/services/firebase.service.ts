import { Injectable, OnDestroy } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot,
  DocumentReference,
  CollectionReference,
  DocumentData,
  enableNetwork,
  disableNetwork,
} from '@angular/fire/firestore';
import { Auth, authState, User } from '@angular/fire/auth';
import {
  Observable,
  throwError,
  from,
  BehaviorSubject,
  timer,
  EMPTY,
} from 'rxjs';
import {
  catchError,
  map,
  tap,
  retry,
  retryWhen,
  delay,
  take,
  switchMap,
} from 'rxjs/operators';

export interface FirebaseErrorInfo {
  code: string;
  message: string;
  operation: string;
  timestamp: Date;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isOnline: boolean;
  lastConnected?: Date;
  retryAttempts: number;
}

@Injectable({
  providedIn: 'root',
})
export class FirebaseService implements OnDestroy {
  private connectionStatus = new BehaviorSubject<ConnectionStatus>({
    isConnected: false,
    isOnline: navigator.onLine,
    retryAttempts: 0,
  });

  private subscriptions = new Map<string, () => void>();
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor(private firestore: Firestore, private auth: Auth) {
    this.initializeConnection();
    this.setupNetworkListeners();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Initialize Firestore connection and verify connectivity
   */
  private initializeConnection(): void {
    this.log('Initializing Firebase connection...');
    this.testConnection().subscribe({
      next: () => {
        this.updateConnectionStatus({
          isConnected: true,
          isOnline: navigator.onLine,
          lastConnected: new Date(),
          retryAttempts: 0,
        });
        this.log('Firebase connection established successfully');
      },
      error: (error) => {
        this.updateConnectionStatus({
          isConnected: false,
          isOnline: navigator.onLine,
          retryAttempts: this.connectionStatus.value.retryAttempts + 1,
        });
        this.logError(
          'Failed to establish Firebase connection',
          error,
          'initialize'
        );
        this.scheduleReconnection();
      },
    });
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.log('Network came online');
      this.updateConnectionStatus({
        ...this.connectionStatus.value,
        isOnline: true,
      });
      this.handleNetworkReconnection();
    });

    window.addEventListener('offline', () => {
      this.log('Network went offline');
      this.updateConnectionStatus({
        ...this.connectionStatus.value,
        isOnline: false,
        isConnected: false,
      });
    });
  }

  /**
   * Handle network reconnection
   */
  private handleNetworkReconnection(): void {
    if (!this.connectionStatus.value.isConnected) {
      this.log('Attempting to reconnect to Firebase...');
      this.initializeConnection();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnection(): void {
    const currentStatus = this.connectionStatus.value;
    if (
      currentStatus.retryAttempts < this.maxRetries &&
      currentStatus.isOnline
    ) {
      const delay = this.retryDelay * Math.pow(2, currentStatus.retryAttempts); // Exponential backoff
      this.log(
        `Scheduling reconnection in ${delay}ms (attempt ${
          currentStatus.retryAttempts + 1
        }/${this.maxRetries})`
      );

      timer(delay).subscribe(() => {
        this.initializeConnection();
      });
    }
  }

  /**
   * Update connection status
   */
  private updateConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus.next(status);
  }

  /**
   * Cleanup subscriptions and listeners
   */
  private cleanup(): void {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.clear();
  }

  /**
   * Test Firestore connection by attempting to read from a test collection
   */
  testConnection(): Observable<any[]> {
    this.log('Testing Firestore connection...');
    const testCollection = collection(this.firestore, 'connection-test');
    return collectionData(testCollection).pipe(
      tap(() => this.log('Connection test successful')),
      catchError((error) => this.handleFirestoreError(error, 'testConnection'))
    );
  }

  /**
   * Get authentication state
   */
  getAuthState(): Observable<User | null> {
    return authState(this.auth).pipe(
      tap((user) =>
        this.log(
          `Auth state changed: ${user ? 'authenticated' : 'not authenticated'}`
        )
      ),
      catchError((error) => this.handleFirestoreError(error, 'getAuthState'))
    );
  }

  /**
   * Get connection status
   */
  isFirestoreConnected(): boolean {
    return this.connectionStatus.value.isConnected;
  }

  /**
   * Get connection status as observable
   */
  getConnectionStatus(): Observable<ConnectionStatus> {
    return this.connectionStatus.asObservable();
  }

  /**
   * Force reconnection attempt
   */
  forceReconnect(): Observable<void> {
    this.log('Force reconnection requested');
    return from(enableNetwork(this.firestore)).pipe(
      switchMap(() => this.testConnection()),
      map(() => {
        this.updateConnectionStatus({
          isConnected: true,
          isOnline: navigator.onLine,
          lastConnected: new Date(),
          retryAttempts: 0,
        });
      }),
      catchError((error) => {
        this.logError('Force reconnection failed', error, 'forceReconnect');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get a Firestore collection reference
   */
  getCollection(collectionName: string): CollectionReference<DocumentData> {
    this.log(`Getting collection reference: ${collectionName}`);
    return collection(this.firestore, collectionName);
  }

  /**
   * Get a Firestore document reference
   */
  getDocument(collectionName: string, documentId: string): DocumentReference {
    this.log(`Getting document reference: ${collectionName}/${documentId}`);
    return doc(this.firestore, collectionName, documentId);
  }

  /**
   * Generic method to get a document
   */
  getDocumentData<T>(
    collectionName: string,
    documentId: string
  ): Observable<T | null> {
    this.log(`Fetching document: ${collectionName}/${documentId}`);
    const docRef = this.getDocument(collectionName, documentId);

    return from(getDoc(docRef)).pipe(
      map((docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as T;
          this.log(
            `Document fetched successfully: ${collectionName}/${documentId}`
          );
          return data;
        } else {
          this.log(`Document not found: ${collectionName}/${documentId}`);
          return null;
        }
      }),
      catchError((error) =>
        this.handleFirestoreError(error, `getDocument-${collectionName}`)
      )
    );
  }

  /**
   * Generic method to set a document
   */
  setDocument<T extends Record<string, any>>(
    collectionName: string,
    documentId: string,
    data: T
  ): Observable<void> {
    this.log(`Setting document: ${collectionName}/${documentId}`);
    const docRef = this.getDocument(collectionName, documentId);

    return from(setDoc(docRef, data)).pipe(
      tap(() =>
        this.log(`Document set successfully: ${collectionName}/${documentId}`)
      ),
      catchError((error) =>
        this.handleFirestoreError(error, `setDocument-${collectionName}`)
      )
    );
  }

  /**
   * Generic method to update a document
   */
  updateDocument<T extends Record<string, any>>(
    collectionName: string,
    documentId: string,
    data: Partial<T>
  ): Observable<void> {
    this.log(`Updating document: ${collectionName}/${documentId}`);
    const docRef = this.getDocument(collectionName, documentId);

    return from(updateDoc(docRef, data as any)).pipe(
      tap(() =>
        this.log(
          `Document updated successfully: ${collectionName}/${documentId}`
        )
      ),
      catchError((error) =>
        this.handleFirestoreError(error, `updateDocument-${collectionName}`)
      )
    );
  }

  /**
   * Generic method to delete a document
   */
  deleteDocument(collectionName: string, documentId: string): Observable<void> {
    this.log(`Deleting document: ${collectionName}/${documentId}`);
    const docRef = this.getDocument(collectionName, documentId);

    return from(deleteDoc(docRef)).pipe(
      tap(() =>
        this.log(
          `Document deleted successfully: ${collectionName}/${documentId}`
        )
      ),
      catchError((error) =>
        this.handleFirestoreError(error, `deleteDocument-${collectionName}`)
      )
    );
  }

  /**
   * Get collection data with real-time updates and enhanced error handling
   */
  getCollectionData<T>(
    collectionName: string,
    subscriptionKey?: string
  ): Observable<T[]> {
    this.log(`Getting collection data: ${collectionName}`);
    const collectionRef = this.getCollection(collectionName);
    const key = subscriptionKey || `collection_${collectionName}`;

    // Clean up existing subscription if it exists
    if (this.subscriptions.has(key)) {
      this.subscriptions.get(key)!();
      this.subscriptions.delete(key);
    }

    return new Observable<T[]>((observer) => {
      let retryCount = 0;
      let isSubscribed = true;

      const setupListener = () => {
        const unsubscribe = onSnapshot(
          collectionRef,
          (snapshot) => {
            if (!isSubscribed) return;

            const data = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as T[];

            this.log(
              `Collection data received: ${collectionName} (${data.length} items)`
            );

            // Update connection status on successful data receive
            if (!this.connectionStatus.value.isConnected) {
              this.updateConnectionStatus({
                isConnected: true,
                isOnline: navigator.onLine,
                lastConnected: new Date(),
                retryAttempts: 0,
              });
            }

            observer.next(data);
            retryCount = 0; // Reset retry count on success
          },
          (error) => {
            if (!isSubscribed) return;

            this.logError(
              `Collection listener error: ${collectionName}`,
              error,
              `getCollectionData-${collectionName}`
            );

            // Update connection status
            this.updateConnectionStatus({
              isConnected: false,
              isOnline: navigator.onLine,
              retryAttempts: retryCount + 1,
            });

            // Handle different error types
            if (this.shouldRetryError(error) && retryCount < this.maxRetries) {
              retryCount++;
              const delay = this.retryDelay * Math.pow(2, retryCount - 1);
              this.log(
                `Retrying collection listener in ${delay}ms (attempt ${retryCount}/${this.maxRetries})`
              );

              timer(delay).subscribe(() => {
                if (isSubscribed) {
                  setupListener();
                }
              });
            } else {
              observer.error(
                this.createFirebaseError(
                  error,
                  `getCollectionData-${collectionName}`
                )
              );
            }
          }
        );

        // Store the unsubscribe function
        this.subscriptions.set(key, unsubscribe);
        return unsubscribe;
      };

      const unsubscribe = setupListener();

      // Return cleanup function
      return () => {
        isSubscribed = false;
        unsubscribe();
        this.subscriptions.delete(key);
      };
    }).pipe(
      catchError((error) =>
        this.handleFirestoreError(error, `getCollectionData-${collectionName}`)
      )
    );
  }

  /**
   * Get document data with real-time updates
   */
  getDocumentDataRealtime<T>(
    collectionName: string,
    documentId: string,
    subscriptionKey?: string
  ): Observable<T | null> {
    this.log(
      `Getting document data (realtime): ${collectionName}/${documentId}`
    );
    const docRef = this.getDocument(collectionName, documentId);
    const key = subscriptionKey || `document_${collectionName}_${documentId}`;

    // Clean up existing subscription if it exists
    if (this.subscriptions.has(key)) {
      this.subscriptions.get(key)!();
      this.subscriptions.delete(key);
    }

    return new Observable<T | null>((observer) => {
      let retryCount = 0;
      let isSubscribed = true;

      const setupListener = () => {
        const unsubscribe = onSnapshot(
          docRef,
          (docSnap) => {
            if (!isSubscribed) return;

            if (docSnap.exists()) {
              const data = { id: docSnap.id, ...docSnap.data() } as T;
              this.log(
                `Document data received: ${collectionName}/${documentId}`
              );
              observer.next(data);
            } else {
              this.log(`Document not found: ${collectionName}/${documentId}`);
              observer.next(null);
            }
            retryCount = 0; // Reset retry count on success
          },
          (error) => {
            if (!isSubscribed) return;

            this.logError(
              `Document listener error: ${collectionName}/${documentId}`,
              error,
              `getDocumentDataRealtime-${collectionName}`
            );

            if (this.shouldRetryError(error) && retryCount < this.maxRetries) {
              retryCount++;
              const delay = this.retryDelay * Math.pow(2, retryCount - 1);
              this.log(
                `Retrying document listener in ${delay}ms (attempt ${retryCount}/${this.maxRetries})`
              );

              timer(delay).subscribe(() => {
                if (isSubscribed) {
                  setupListener();
                }
              });
            } else {
              observer.error(
                this.createFirebaseError(
                  error,
                  `getDocumentDataRealtime-${collectionName}`
                )
              );
            }
          }
        );

        this.subscriptions.set(key, unsubscribe);
        return unsubscribe;
      };

      const unsubscribe = setupListener();

      return () => {
        isSubscribed = false;
        unsubscribe();
        this.subscriptions.delete(key);
      };
    }).pipe(
      catchError((error) =>
        this.handleFirestoreError(
          error,
          `getDocumentDataRealtime-${collectionName}`
        )
      )
    );
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetryError(error: any): boolean {
    const retryableCodes = [
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted',
      'internal',
      'unknown',
    ];
    return retryableCodes.includes(error.code);
  }

  /**
   * Create a standardized Firebase error
   */
  private createFirebaseError(
    error: any,
    operation: string
  ): FirebaseErrorInfo {
    return {
      code: error.code || 'unknown',
      message: error.message || 'An unknown error occurred',
      operation,
      timestamp: new Date(),
    };
  }

  /**
   * Handle Firestore errors with proper logging and error transformation
   */
  private handleFirestoreError(
    error: any,
    operation: string
  ): Observable<never> {
    const errorInfo: FirebaseErrorInfo = {
      code: error.code || 'unknown',
      message: error.message || 'Unknown error occurred',
      operation,
      timestamp: new Date(),
    };

    this.logError(`Firestore error in ${operation}`, error, operation);

    // Handle specific error types and update connection status
    if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
      this.updateConnectionStatus({
        isConnected: false,
        isOnline: navigator.onLine,
        retryAttempts: this.connectionStatus.value.retryAttempts + 1,
      });
      this.log('Firestore is unavailable, marking as disconnected');
    }

    return throwError(() => errorInfo);
  }

  /**
   * Enhanced retry operation with exponential backoff
   */
  private retryOperation<T>(
    operation: () => Observable<T>,
    operationName: string
  ): Observable<T> {
    return operation().pipe(
      retryWhen((errors) =>
        errors.pipe(
          tap((error) =>
            this.logError(
              `Operation ${operationName} failed, retrying...`,
              error,
              operationName
            )
          ),
          delay(this.retryDelay),
          take(this.maxRetries)
        )
      ),
      catchError((error) => {
        this.logError(
          `Operation ${operationName} failed after ${this.maxRetries} retries`,
          error,
          operationName
        );
        return throwError(() => error);
      })
    );
  }

  /**
   * Logging utility for development and debugging
   */
  private log(message: string): void {
    if (this.isDevelopment()) {
      console.log(`[FirebaseService] ${new Date().toISOString()}: ${message}`);
    }
  }

  /**
   * Error logging utility
   */
  private logError(message: string, error: any, operation: string): void {
    if (this.isDevelopment()) {
      console.error(
        `[FirebaseService] ${new Date().toISOString()}: ${message}`,
        {
          operation,
          error: error.message || error,
          code: error.code,
          stack: error.stack,
        }
      );
    }
  }

  /**
   * Check if running in development mode
   */
  private isDevelopment(): boolean {
    return !environment.production;
  }
}

// Import environment for production check
import { environment } from '../../environments/environment';
