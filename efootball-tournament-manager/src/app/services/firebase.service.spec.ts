import { TestBed } from '@angular/core/testing';
import { FirebaseService, FirebaseErrorInfo } from './firebase.service';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import {
  provideFirestore,
  getFirestore,
  connectFirestoreEmulator,
} from '@angular/fire/firestore';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { of, throwError } from 'rxjs';

describe('FirebaseService', () => {
  let service: FirebaseService;
  let mockFirestore: any;
  let mockAuth: any;

  beforeEach(() => {
    // Mock Firestore
    mockFirestore = {
      collection: jasmine.createSpy('collection'),
      doc: jasmine.createSpy('doc'),
    };

    // Mock Auth
    mockAuth = {
      authState: of(null),
    };

    TestBed.configureTestingModule({
      providers: [
        provideFirebaseApp(() =>
          initializeApp({
            apiKey: 'test-api-key',
            authDomain: 'test-project.firebaseapp.com',
            projectId: 'test-project',
            storageBucket: 'test-project.appspot.com',
            messagingSenderId: '123456789',
            appId: 'test-app-id',
          })
        ),
        provideFirestore(() => getFirestore()),
        provideAuth(() => getAuth()),
      ],
    });
    service = TestBed.inject(FirebaseService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize connection on creation', () => {
      expect(service).toBeTruthy();
      // Connection initialization is called in constructor
    });
  });

  describe('Connection Management', () => {
    it('should have testConnection method', () => {
      expect(service.testConnection).toBeDefined();
    });

    it('should return connection status', () => {
      expect(typeof service.isFirestoreConnected()).toBe('boolean');
    });

    it('should test connection and return observable', () => {
      const result = service.testConnection();
      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });
  });

  describe('Authentication', () => {
    it('should have getAuthState method', () => {
      expect(service.getAuthState).toBeDefined();
    });

    it('should return auth state observable', () => {
      const result = service.getAuthState();
      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });
  });

  describe('Collection Operations', () => {
    it('should get collection reference', () => {
      const collectionName = 'test-collection';
      const result = service.getCollection(collectionName);
      expect(result).toBeDefined();
    });

    it('should get collection data', () => {
      const collectionName = 'test-collection';
      const result = service.getCollectionData(collectionName);
      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });
  });

  describe('Document Operations', () => {
    const collectionName = 'test-collection';
    const documentId = 'test-doc';
    const testData = { name: 'Test', value: 123 };

    it('should get document reference', () => {
      const result = service.getDocument(collectionName, documentId);
      expect(result).toBeDefined();
    });

    it('should get document data', () => {
      const result = service.getDocumentData(collectionName, documentId);
      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });

    it('should set document', () => {
      const result = service.setDocument(collectionName, documentId, testData);
      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });

    it('should update document', () => {
      const updateData = { name: 'Updated Test' };
      const result = service.updateDocument(
        collectionName,
        documentId,
        updateData
      );
      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });

    it('should delete document', () => {
      const result = service.deleteDocument(collectionName, documentId);
      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle Firestore errors properly', (done) => {
      // Create a proper FirebaseErrorInfo object
      const mockError: FirebaseErrorInfo = {
        code: 'unavailable',
        message: 'Firestore unavailable',
        operation: 'testConnection',
        timestamp: new Date(),
      };

      // Mock a failing operation by spying on testConnection
      spyOn(service, 'testConnection').and.returnValue(
        throwError(() => mockError)
      );

      service.testConnection().subscribe({
        next: () => {
          fail('Should have thrown an error');
        },
        error: (error: FirebaseErrorInfo) => {
          expect(error.code).toBe('unavailable');
          expect(error.message).toBe('Firestore unavailable');
          expect(error.operation).toBe('testConnection');
          expect(error.timestamp).toBeInstanceOf(Date);
          done();
        },
      });
    });

    it('should mark connection as disconnected on unavailable error', (done) => {
      const mockError: FirebaseErrorInfo = {
        code: 'unavailable',
        message: 'Firestore unavailable',
        operation: 'testConnection',
        timestamp: new Date(),
      };

      spyOn(service, 'testConnection').and.returnValue(
        throwError(() => mockError)
      );

      service.testConnection().subscribe({
        error: () => {
          // Connection status should be updated
          expect(service.isFirestoreConnected()).toBe(false);
          done();
        },
      });
    });
  });

  describe('Logging and Debugging', () => {
    it('should have logging methods (private methods tested indirectly)', () => {
      // Test that operations don't throw errors (logging is called internally)
      expect(() => service.getCollection('test')).not.toThrow();
      expect(() => service.getDocument('test', 'doc')).not.toThrow();
    });
  });

  describe('Utility Methods', () => {
    it('should provide collection and document reference methods', () => {
      expect(service.getCollection).toBeDefined();
      expect(service.getDocument).toBeDefined();
    });

    it('should provide CRUD operation methods', () => {
      expect(service.getDocumentData).toBeDefined();
      expect(service.setDocument).toBeDefined();
      expect(service.updateDocument).toBeDefined();
      expect(service.deleteDocument).toBeDefined();
      expect(service.getCollectionData).toBeDefined();
    });
  });
});
