import { TestBed } from '@angular/core/testing';
import { FirebaseService } from './firebase.service';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';

describe('FirebaseService', () => {
  let service: FirebaseService;

  beforeEach(() => {
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

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have testConnection method', () => {
    expect(service.testConnection).toBeDefined();
  });

  it('should have getAuthState method', () => {
    expect(service.getAuthState).toBeDefined();
  });
});
