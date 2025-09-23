import { Injectable } from '@angular/core';
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
} from '@angular/fire/firestore';
import { Auth, authState, User } from '@angular/fire/auth';
import { Observable, throwError, from } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export interface FirebaseErrorInfo {
  code: string;
  message: string;
  operation: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private isConnected = false;
  private connectionAttempts = 0;
  private maxRetries = 3;

  constructor(private firestore: Firestore, private auth: Auth) {
    this.initializeConnection();
  }

  /**
   * Initialize Firestore connection and verify connectivity
   */
  private initializeConnection(): void {
    this.log('Initializing Firebase connection...');
    this.testConnection().subscribe({
      next: () => {
        this.isConnected = true;
        this.connectionAttempts = 0;
        this.log('Firebase connection established successfully');
      },
      error: (error) => {
        this.isConnected = false;
        this.logError(
          'Failed to establish Firebase connection',
          error,
          'initialize'
        );
      },
    });
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
    return this.isConnected;
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
   * Get collection data with real-time updates
   */
  getCollectionData<T>(collectionName: string): Observable<T[]> {
    this.log(`Getting collection data: ${collectionName}`);
    const collectionRef = this.getCollection(collectionName);

    // Use native Firestore onSnapshot for better compatibility
    return new Observable<T[]>((observer) => {
      const unsubscribe = onSnapshot(
        collectionRef,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as T[];
          this.log(
            `Collection data received: ${collectionName} (${data.length} items)`
          );
          observer.next(data);
        },
        (error) => {
          this.logError(
            `getCollectionData-${collectionName}`,
            error,
            `getCollectionData-${collectionName}`
          );
          observer.error(
            this.createFirebaseError(
              error,
              `getCollectionData-${collectionName}`
            )
          );
        }
      );

      // Return cleanup function
      return () => unsubscribe();
    }).pipe(
      catchError((error) =>
        this.handleFirestoreError(error, `getCollectionData-${collectionName}`)
      )
    );
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
   * Retry failed operations
   */
  private retryOperation<T>(
    operation: () => Observable<T>,
    operationName: string
  ): Observable<T> {
    return operation().pipe(
      catchError((error) => {
        if (this.connectionAttempts < this.maxRetries) {
          this.connectionAttempts++;
          this.log(
            `Retrying operation ${operationName} (attempt ${this.connectionAttempts}/${this.maxRetries})`
          );
          return this.retryOperation(operation, operationName);
        } else {
          this.connectionAttempts = 0;
          return throwError(() => error);
        }
      })
    );
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

    // Handle specific error types
    if (error.code === 'unavailable') {
      this.isConnected = false;
      this.log('Firestore is unavailable, marking as disconnected');
    }

    return throwError(() => errorInfo);
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
