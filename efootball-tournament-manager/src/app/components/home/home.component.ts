import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { PlayerService } from '../../services/player.service';
import { MatchService } from '../../services/match.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  hasActiveTournament$!: Observable<boolean>;
  tournamentStatus$!: Observable<string>;

  constructor(
    private playerService: PlayerService,
    private matchService: MatchService
  ) {}

  ngOnInit(): void {
    this.initializeTournamentStatus();
  }

  private initializeTournamentStatus(): void {
    // Check if there are active players and matches
    this.hasActiveTournament$ = combineLatest([
      this.playerService.getActivePlayers(),
      this.matchService.getMatches(),
    ]).pipe(
      map(([players, matches]) => {
        return players.length >= 5 && matches.length > 0;
      })
    );

    // Determine tournament status
    this.tournamentStatus$ = combineLatest([
      this.matchService.getMatches(),
      this.matchService.getPlayoffMatches(),
    ]).pipe(
      map(([allMatches, playoffMatches]) => {
        if (allMatches.length === 0) {
          return 'No tournament active';
        }

        const leagueMatches = allMatches.filter((m) => !m.isPlayoff);
        const playedLeagueMatches = leagueMatches.filter((m) => m.isPlayed);
        const playedPlayoffMatches = playoffMatches.filter((m) => m.isPlayed);

        if (playoffMatches.length > 0) {
          if (playedPlayoffMatches.length === playoffMatches.length) {
            return 'Tournament completed';
          } else {
            return 'Playoff stage';
          }
        } else if (
          playedLeagueMatches.length === leagueMatches.length &&
          leagueMatches.length > 0
        ) {
          return 'League completed - Playoffs pending';
        } else if (playedLeagueMatches.length > 0) {
          return `League stage - ${playedLeagueMatches.length}/${leagueMatches.length} matches played`;
        } else {
          return 'Tournament started - No matches played yet';
        }
      })
    );
  }
}
