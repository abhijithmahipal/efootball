import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Auth, authState, User } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  constructor(private firestore: Firestore, private auth: Auth) {}

  // Test method to verify Firestore connection
  testConnection(): Observable<any[]> {
    const testCollection = collection(this.firestore, 'test');
    return collectionData(testCollection);
  }

  // Get authentication state
  getAuthState(): Observable<User | null> {
    return authState(this.auth);
  }
}
