import { PlayoffRound, isValidPlayoffRound } from './enums';

export interface Match {
  id: string;
  homePlayerId: string;
  awayPlayerId: string;
  homePlayerName: string;
  awayPlayerName: string;
  matchday: number;
  homeGoals?: number;
  awayGoals?: number;
  isPlayed: boolean;
  isPlayoff: boolean;
  playoffRound?: PlayoffRound;
  createdAt: Date;
}

export function validateMatch(match: Partial<Match>): string[] {
  const errors: string[] = [];

  if (!match.homePlayerId || typeof match.homePlayerId !== 'string') {
    errors.push('Home player ID is required and must be a string');
  }

  if (!match.awayPlayerId || typeof match.awayPlayerId !== 'string') {
    errors.push('Away player ID is required and must be a string');
  }

  if (match.homePlayerId === match.awayPlayerId) {
    errors.push('Home and away players must be different');
  }

  if (!match.homePlayerName || typeof match.homePlayerName !== 'string') {
    errors.push('Home player name is required and must be a string');
  }

  if (!match.awayPlayerName || typeof match.awayPlayerName !== 'string') {
    errors.push('Away player name is required and must be a string');
  }

  if (
    match.matchday === undefined ||
    typeof match.matchday !== 'number' ||
    match.matchday < 1
  ) {
    errors.push('Matchday must be a positive number');
  }

  if (match.homeGoals !== undefined) {
    if (
      typeof match.homeGoals !== 'number' ||
      match.homeGoals < 0 ||
      !Number.isInteger(match.homeGoals)
    ) {
      errors.push('Home goals must be a non-negative integer');
    }
  }

  if (match.awayGoals !== undefined) {
    if (
      typeof match.awayGoals !== 'number' ||
      match.awayGoals < 0 ||
      !Number.isInteger(match.awayGoals)
    ) {
      errors.push('Away goals must be a non-negative integer');
    }
  }

  if (match.isPlayed !== undefined && typeof match.isPlayed !== 'boolean') {
    errors.push('isPlayed must be a boolean value');
  }

  if (match.isPlayoff !== undefined && typeof match.isPlayoff !== 'boolean') {
    errors.push('isPlayoff must be a boolean value');
  }

  if (
    match.playoffRound !== undefined &&
    !isValidPlayoffRound(match.playoffRound)
  ) {
    errors.push('Invalid playoff round');
  }

  if (match.isPlayoff === false && match.playoffRound !== undefined) {
    errors.push('Playoff round should not be set for non-playoff matches');
  }

  if (match.isPlayoff === true && match.playoffRound === undefined) {
    errors.push('Playoff round is required for playoff matches');
  }

  if (match.createdAt !== undefined && !(match.createdAt instanceof Date)) {
    errors.push('Created date must be a valid Date object');
  }

  if (
    match.id !== undefined &&
    (typeof match.id !== 'string' || match.id.trim().length === 0)
  ) {
    errors.push('Match ID must be a non-empty string');
  }

  return errors;
}

export function isValidMatch(match: Partial<Match>): boolean {
  return validateMatch(match).length === 0;
}
