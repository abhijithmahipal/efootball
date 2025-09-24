import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  Router,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-layout" data-testid="admin-dashboard">
      <header class="admin-header">
        <div class="admin-header-content">
          <h1 data-testid="admin-welcome">
            eFootball Tournament Manager - Admin
          </h1>
          <nav class="admin-nav">
            <a routerLink="/home" class="nav-link">← Back to Site</a>
            <a
              routerLink="/admin/players"
              class="nav-link"
              routerLinkActive="active"
              data-testid="manage-players-link"
              >Players</a
            >
            <a
              routerLink="/admin/schedule-generator"
              class="nav-link"
              routerLinkActive="active"
              data-testid="generate-schedule-link"
              >Schedule</a
            >
            <a
              routerLink="/admin/match-results"
              class="nav-link"
              routerLinkActive="active"
              data-testid="enter-results-link"
              >Match Results</a
            >
            <button
              (click)="logout()"
              class="logout-btn"
              data-testid="logout-button"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main class="admin-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      .admin-layout {
        min-height: 100vh;
        background: #f5f5f5;
      }

      .admin-header {
        background: #2c3e50;
        color: white;
        padding: 1rem 0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .admin-header-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .admin-header h1 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
      }

      .admin-nav {
        display: flex;
        gap: 1rem;
        align-items: center;
      }

      .nav-link {
        color: white;
        text-decoration: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        transition: background-color 0.2s;
      }

      .nav-link:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .nav-link.active {
        background: rgba(255, 255, 255, 0.2);
        font-weight: 600;
      }

      .logout-btn {
        background: #e74c3c;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .logout-btn:hover {
        background: #c0392b;
      }

      .admin-main {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
      }

      @media (max-width: 768px) {
        .admin-header-content {
          flex-direction: column;
          gap: 1rem;
          padding: 0 1rem;
        }

        .admin-nav {
          flex-wrap: wrap;
          justify-content: center;
        }

        .admin-main {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class AdminComponent {
  constructor(private authService: AuthService, private router: Router) {}

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Logout error:', error);
      // Navigate to home even if logout fails
      this.router.navigate(['/home']);
    }
  }
}
