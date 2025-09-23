import { TournamentStatus, isValidTournamentStatus } from './enums';

export interface Tournament {
  id: string;
  name: string;
  status: TournamentStatus;
  playerIds: string[];
  currentMatchday: number;
  totalMatchdays: number;
  createdAt: Date;
}

export function validateTournament(tournament: Partial<Tournament>): string[] {
  const errors: string[] = [];

  if (!tournament.name || typeof tournament.name !== 'string') {
    errors.push('Tournament name is required and must be a string');
  } else if (tournament.name.trim().length === 0) {
    errors.push('Tournament name cannot be empty');
  } else if (tournament.name.trim().length > 100) {
    errors.push('Tournament name cannot exceed 100 characters');
  }

  if (!tournament.status || !isValidTournamentStatus(tournament.status)) {
    errors.push('Valid tournament status is required');
  }

  if (!Array.isArray(tournament.playerIds)) {
    errors.push('Player IDs must be an array');
  } else {
    if (tournament.playerIds.length < 5) {
      errors.push('Tournament requires at least 5 players');
    }

    const uniquePlayerIds = new Set(tournament.playerIds);
    if (uniquePlayerIds.size !== tournament.playerIds.length) {
      errors.push('Player IDs must be unique');
    }

    tournament.playerIds.forEach((playerId, index) => {
      if (typeof playerId !== 'string' || playerId.trim().length === 0) {
        errors.push(`Player ID at index ${index} must be a non-empty string`);
      }
    });
  }

  if (tournament.currentMatchday !== undefined) {
    if (
      typeof tournament.currentMatchday !== 'number' ||
      tournament.currentMatchday < 0
    ) {
      errors.push('Current matchday must be a non-negative number');
    }
  }

  if (tournament.totalMatchdays !== undefined) {
    if (
      typeof tournament.totalMatchdays !== 'number' ||
      tournament.totalMatchdays < 1
    ) {
      errors.push('Total matchdays must be a positive number');
    }
  }

  if (
    tournament.currentMatchday !== undefined &&
    tournament.totalMatchdays !== undefined
  ) {
    if (tournament.currentMatchday > tournament.totalMatchdays) {
      errors.push('Current matchday cannot exceed total matchdays');
    }
  }

  if (
    tournament.createdAt !== undefined &&
    !(tournament.createdAt instanceof Date)
  ) {
    errors.push('Created date must be a valid Date object');
  }

  if (
    tournament.id !== undefined &&
    (typeof tournament.id !== 'string' || tournament.id.trim().length === 0)
  ) {
    errors.push('Tournament ID must be a non-empty string');
  }

  return errors;
}

export function isValidTournament(tournament: Partial<Tournament>): boolean {
  return validateTournament(tournament).length === 0;
}
