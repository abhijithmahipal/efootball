import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
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
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'efootball-tournament-manager' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('efootball-tournament-manager');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'efootball-tournament-manager'
    );
  });
});
