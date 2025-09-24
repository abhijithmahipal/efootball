import { test, expect } from '@playwright/test';
import { TestBed } from '@angular/core/testing';
import { FirebaseService } from '../../../src/app/services/firebase.service';
import { Firestore } from '@angular/fire/firestore';
import { BehaviorSubject, of, throwError } from 'rxjs';

// Mock Firestore
class MockFirestore {
  private collections = new Map<string, Map<string, any>>();
  private connectionStatus = new BehaviorSubject({
    isConnected: true,
    retryAttempts: 0,
  });
  private shouldSimulateError = false;
  private errorMessage = 'Simulated network error';

  // Mock collection operations
  collection(path: string) {
    return {
      doc: (id: string) => ({
        set: (data: any) => {
          if (this.shouldSimulateError) {
            return Promise.reject(new Error(this.errorMessage));
          }
          if (!this.collections.has(path)) {
            this.collections.set(path, new Map());
          }
          this.collections.get(path)!.set(id, data);
          return Promise.resolve();
        },
        update: (data: any) => {
          if (this.shouldSimulateError) {
            return Promise.reject(new Error(this.errorMessage));
          }
          const collection = this.collections.get(path);
          if (collection && collection.has(id)) {
            const existing = collection.get(id);
            collection.set(id, { ...existing, ...data });
            return Promise.resolve();
          }
          return Promise.reject(new Error('Document not found'));
        },
        delete: () => {
          if (this.shouldSimulateError) {
            return Promise.reject(new Error(this.errorMessage));
          }
          const collection = this.collections.get(path);
          if (collection) {
            collection.delete(id);
          }
          return Promise.resolve();
        },
        get: () => {
          if (this.shouldSimulateError) {
            return Promise.reject(new Error(this.errorMessage));
          }
          const collection = this.collections.get(path);
          const data = collection?.get(id);
          return Promise.resolve({
            exists: () => !!data,
            data: () => data,
          });
        },
        onSnapshot: (callback: Function) => {
          const collection = this.collections.get(path);
          const data = collection?.get(id);
          callback({
            exists: () => !!data,
            data: () => data,
          });
          return () => {}; // Unsubscribe function
        },
      }),
      onSnapshot: (callback: Function) => {
        const collection = this.collections.get(path) || new Map();
        const docs = Array.from(collection.entries()).map(([id, data]) => ({
          id,
          data: () => data,
        }));
        callback({ docs });
        return () => {}; // Unsubscribe function
      },
    };
  }

  // Helper methods for testing
  clearCollection(path: string) {
    this.collections.set(path, new Map());
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

  getConnectionStatus() {
    return this.connectionStatus.asObservable();
  }

  addToCollection(path: string, id: string, data: any) {
    if (!this.collections.has(path)) {
      this.collections.set(path, new Map());
    }
    this.collections.get(path)!.set(id, data);
  }
}

test.describe('FirebaseService Integration and Error Scenarios', () => {
  let firebaseService: FirebaseService;
  let mockFirestore: MockFirestore;

  test.beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        FirebaseService,
        { provide: Firestore, useClass: MockFirestore },
      ],
    }).compileComponents();

    firebaseService = TestBed.inject(FirebaseService);
    mockFirestore = TestBed.inject(Firestore) as any;

    // Reset state before each test
    mockFirestore.clearCollection('test-collection');
    mockFirestore.simulateError(false);
    mockFirestore.setConnectionStatus(true, 0);
  });

  test('should perform basic CRUD operations successfully', async () => {
    const testData = { name: 'Test Item', value: 42 };
    const docId = 'test-doc-1';

    // Create document
    await firebaseService
      .setDocument('test-collection', docId, testData)
      .toPromise();

    // Read document
    const retrievedData = await firebaseService
      .getDocumentData('test-collection', docId)
      .toPromise();
    expect(retrievedData).toEqual(testData);

    // Update document
    const updateData = { value: 84 };
    await firebaseService
      .updateDocument('test-collection', docId, updateData)
      .toPromise();

    // Verify update
    const updatedData = await firebaseService
      .getDocumentData('test-collection', docId)
      .toPromise();
    expect(updatedData).toEqual({ ...testData, ...updateData });

    // Delete document
    await firebaseService.deleteDocument('test-collection', docId).toPromise();

    // Verify deletion
    const deletedData = await firebaseService
      .getDocumentData('test-collection', docId)
      .toPromise();
    expect(deletedData).toBe(null);
  });

  test('should handle collection operations correctly', async () => {
    const testItems = [
      { id: 'item1', name: 'Item 1', value: 10 },
      { id: 'item2', name: 'Item 2', value: 20 },
      { id: 'item3', name: 'Item 3', value: 30 },
    ];

    // Add items to collection
    for (const item of testItems) {
      await firebaseService
        .setDocument('test-collection', item.id, item)
        .toPromise();
    }

    // Retrieve collection
    const collectionData = await firebaseService
      .getCollectionData('test-collection', 'test-sub')
      .toPromise();

    expect(collectionData!.length).toBe(3);

    // Verify all items are present
    testItems.forEach((item) => {
      const found = collectionData!.find((doc: any) => doc.id === item.id);
      expect(found).toEqual(item);
    });
  });

  test('should handle network errors gracefully', async () => {
    const testData = { name: 'Test Item', value: 42 };
    const docId = 'test-doc-error';

    // Simulate network error
    mockFirestore.simulateError(true, 'Network connection failed');

    // Create operation should fail
    try {
      await firebaseService
        .setDocument('test-collection', docId, testData)
        .toPromise();
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Network connection failed');
    }

    // Read operation should fail
    try {
      await firebaseService
        .getDocumentData('test-collection', docId)
        .toPromise();
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Network connection failed');
    }

    // Update operation should fail
    try {
      await firebaseService
        .updateDocument('test-collection', docId, { value: 84 })
        .toPromise();
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Network connection failed');
    }

    // Delete operation should fail
    try {
      await firebaseService
        .deleteDocument('test-collection', docId)
        .toPromise();
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Network connection failed');
    }
  });

  test('should handle connection status changes', async () => {
    let connectionStatuses: any[] = [];

    // Subscribe to connection status
    const subscription = firebaseService
      .getConnectionStatus()
      .subscribe((status) => {
        connectionStatuses.push(status);
      });

    // Initial status should be connected
    expect(connectionStatuses[0]).toEqual({
      isConnected: true,
      retryAttempts: 0,
    });

    // Simulate connection loss
    mockFirestore.setConnectionStatus(false, 1);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(connectionStatuses[connectionStatuses.length - 1]).toEqual({
      isConnected: false,
      retryAttempts: 1,
    });

    // Simulate connection restoration
    mockFirestore.setConnectionStatus(true, 0);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(connectionStatuses[connectionStatuses.length - 1]).toEqual({
      isConnected: true,
      retryAttempts: 0,
    });

    subscription.unsubscribe();
  });

  test('should handle real-time updates correctly', async () => {
    const collectionUpdates: any[] = [];

    // Subscribe to collection changes
    const subscription = firebaseService
      .getCollectionData('test-collection', 'realtime-test')
      .subscribe((data) => {
        collectionUpdates.push(data);
      });

    // Initial state should be empty
    expect(collectionUpdates[0]).toEqual([]);

    // Add document
    const testDoc = { id: 'rt-doc-1', name: 'Realtime Test', value: 100 };
    mockFirestore.addToCollection('test-collection', testDoc.id, testDoc);

    // Wait for update
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should receive update
    expect(collectionUpdates.length).toBeGreaterThan(1);
    expect(collectionUpdates[collectionUpdates.length - 1]).toContainEqual(
      testDoc
    );

    subscription.unsubscribe();
  });

  test('should handle document not found scenarios', async () => {
    // Try to read non-existent document
    const nonExistentData = await firebaseService
      .getDocumentData('test-collection', 'non-existent')
      .toPromise();
    expect(nonExistentData).toBe(null);

    // Try to update non-existent document
    try {
      await firebaseService
        .updateDocument('test-collection', 'non-existent', { value: 42 })
        .toPromise();
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Document not found');
    }
  });

  test('should handle concurrent operations correctly', async () => {
    const concurrentOps = [];
    const docCount = 10;

    // Create multiple documents concurrently
    for (let i = 0; i < docCount; i++) {
      const operation = firebaseService
        .setDocument('test-collection', `concurrent-doc-${i}`, {
          id: i,
          name: `Document ${i}`,
          timestamp: Date.now(),
        })
        .toPromise();
      concurrentOps.push(operation);
    }

    // Wait for all operations to complete
    await Promise.all(concurrentOps);

    // Verify all documents were created
    const collectionData = await firebaseService
      .getCollectionData('test-collection', 'concurrent-test')
      .toPromise();
    expect(collectionData!.length).toBe(docCount);

    // Verify each document
    for (let i = 0; i < docCount; i++) {
      const doc = collectionData!.find((d: any) => d.id === i);
      expect(doc).toBeDefined();
      expect(doc.name).toBe(`Document ${i}`);
    }
  });

  test('should handle batch operations efficiently', async () => {
    const batchSize = 50;
    const startTime = Date.now();

    // Perform batch operations
    const batchOps = [];
    for (let i = 0; i < batchSize; i++) {
      const operation = firebaseService
        .setDocument('test-collection', `batch-doc-${i}`, {
          id: i,
          name: `Batch Document ${i}`,
          category: i % 5, // Group into 5 categories
          timestamp: Date.now(),
        })
        .toPromise();
      batchOps.push(operation);
    }

    await Promise.all(batchOps);
    const endTime = Date.now();

    // Verify all documents were created
    const collectionData = await firebaseService
      .getCollectionData('test-collection', 'batch-test')
      .toPromise();
    expect(collectionData!.length).toBe(batchSize);

    // Performance check - should complete within reasonable time
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

    console.log(
      `Batch operation completed in ${duration}ms for ${batchSize} documents`
    );
  });

  test('should handle data validation and sanitization', async () => {
    const testCases = [
      { input: { name: 'Normal Data', value: 42 }, shouldSucceed: true },
      { input: { name: '', value: 0 }, shouldSucceed: true }, // Empty strings and zero are valid
      { input: { name: null, value: undefined }, shouldSucceed: true }, // Null/undefined should be handled
      {
        input: {
          specialChars: '!@#$%^&*()_+{}[]|\\:";\'<>?,./',
          unicode: '🚀🎉',
        },
        shouldSucceed: true,
      },
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const docId = `validation-test-${i}`;

      try {
        await firebaseService
          .setDocument('test-collection', docId, testCase.input)
          .toPromise();

        if (testCase.shouldSucceed) {
          // Verify data was stored correctly
          const retrievedData = await firebaseService
            .getDocumentData('test-collection', docId)
            .toPromise();
          expect(retrievedData).toEqual(testCase.input);
        } else {
          expect(true).toBe(false); // Should not reach here if expected to fail
        }
      } catch (error) {
        if (testCase.shouldSucceed) {
          throw error; // Re-throw if we expected success
        }
        // Expected failure, continue
      }
    }
  });

  test('should handle subscription cleanup correctly', async () => {
    let subscriptionCallCount = 0;

    // Create subscription
    const subscription = firebaseService
      .getCollectionData('test-collection', 'cleanup-test')
      .subscribe(() => {
        subscriptionCallCount++;
      });

    // Add some data to trigger subscription
    await firebaseService
      .setDocument('test-collection', 'cleanup-doc', { test: true })
      .toPromise();

    // Wait for subscription to fire
    await new Promise((resolve) => setTimeout(resolve, 10));

    const callCountBeforeUnsubscribe = subscriptionCallCount;
    expect(callCountBeforeUnsubscribe).toBeGreaterThan(0);

    // Unsubscribe
    subscription.unsubscribe();

    // Add more data - should not trigger subscription
    await firebaseService
      .setDocument('test-collection', 'cleanup-doc-2', { test: true })
      .toPromise();

    // Wait and verify no additional calls
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(subscriptionCallCount).toBe(callCountBeforeUnsubscribe);
  });
});
