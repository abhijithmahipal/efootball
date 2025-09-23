import { Injectable } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  authState,
  User,
} from '@angular/fire/auth';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.currentUser$.pipe(map((user) => !!user));

  constructor(private auth: Auth) {
    // Subscribe to auth state changes
    authState(this.auth).subscribe((user) => {
      this.currentUserSubject.next(user);
    });
  }

  /**
   * Sign in with email and password
   * @param email - Admin email
   * @param password - Admin password
   * @returns Promise that resolves with user credentials
   */
  async login(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Register a new user with email and password
   * @param email User's email address
   * @param password User's password
   * @returns Promise that resolves to the created user
   */
  async register(email: string, password: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      console.log('Registration successful:', userCredential.user.email);
      return userCredential.user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Sign out the current user
   * @returns Promise that resolves when sign out is complete
   */
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Get the current user
   * @returns Current user or null if not authenticated
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is currently authenticated
   * @returns Boolean indicating authentication status
   */
  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  /**
   * Get authentication state as observable
   * @returns Observable of authentication state
   */
  getAuthState(): Observable<User | null> {
    return authState(this.auth);
  }
}
