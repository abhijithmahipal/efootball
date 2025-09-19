import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FirebaseService } from './services/firebase.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'efootball-tournament-manager';

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit() {
    // Test Firebase connection
    console.log('Firebase service initialized');

    // Test auth state
    this.firebaseService.getAuthState().subscribe((user: any) => {
      console.log('Auth state:', user ? 'Logged in' : 'Not logged in');
    });
  }
}
