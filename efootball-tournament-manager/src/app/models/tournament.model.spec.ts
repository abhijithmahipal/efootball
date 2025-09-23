import {
  Tournament,
  validateTournament,
  isValidTournament,
} from './tournament.model';
import { TournamentStatus } from './enums';

describe('Tournament Model', () => {
  describe('validateTournament', () => {
    it('should return no errors for valid tournament', () => {
      const validTournament: Partial<Tournament> = {
        id: 'tournament-1',
        name: 'Test Tournament',
        status: TournamentStatus.SETUP,
        playerIds: ['player-1', 'player-2', 'player-3', 'player-4', 'player-5'],
        currentMatchday: 0,
        totalMatchdays: 10,
        createdAt: new Date(),
      };

      const errors = validateTournament(validTournament);
      expect(errors).toEqual([]);
    });

    it('should require tournament name', () => {
      const invalidTournament: Partial<Tournament> = {
        status: TournamentStatus.SETUP,
        playerIds: ['player-1', 'player-2', 'player-3', 'player-4', 'player-5'],
      };

      const errors = validateTournament(invalidTournament);
      expect(errors).toContain(
        'Tournament name is required and must be a string'
      );
    });

    it('should reject empty tournament name', () => {
      const invalidTournament: Partial<Tournament> = {
        name: '   ',
        status: TournamentStatus.SETUP,
        playerIds: ['player-1', 'player-2', 'player-3', 'player-4', 'player-5'],
      };

      const errors = validateTournament(invalidTournament);
      expect(errors).toContain('Tournament name cannot be empty');
    });

    it('should reject tournament name longer than 100 characters', () => {
      const invalidTournament: Partial<Tournament> = {
        name: 'A'.repeat(101),
        status: TournamentStatus.SETUP,
        playerIds: ['player-1', 'player-2', 'player-3', 'player-4', 'player-5'],
      };

      const errors = validateTournament(invalidTournament);
      expect(errors).toContain('Tournament name cannot exceed 100 characters');
    });

    it('should require valid tournament status', () => {
      const invalidTournament: Partial<Tournament> = {
        name: 'Test Tournament',
        status: 'invalid' as any,
        playerIds: ['player-1', 'player-2', 'player-3', 'player-4', 'player-5'],
      };

      const errors = validateTournament(invalidTournament);
      expect(errors).toContain('Valid tournament status is required');
    });

    it('should require playerIds to be an array', () => {
      const invalidTournament: Partial<Tournament> = {
        name: 'Test Tournament',
        status: TournamentStatus.SETUP,
        playerIds: 'not-an-array' as any,
      };

      const errors = validateTournament(invalidTournament);
      expect(errors).toContain('Player IDs must be an array');
    });

    it('should require at least 5 players', () => {
      const invalidTournament: Partial<Tournament> = {
        name: 'Test Tournament',
        status: TournamentStatus.SETUP,
        playerIds: ['player-1', 'player-2', 'player-3', 'player-4'],
      };

      const errors = validateTournament(invalidTournament);
      expect(errors).toContain('Tournament requires at least 5 players');
    });

    it('should require unique player IDs', () => {
      const invalidTournament: Partial<Tournament> = {
        name: 'Test Tournament',
        status: TournamentStatus.SETUP,
        playerIds: ['player-1', 'player-2', 'player-1', 'player-4', 'player-5'],
      };

      const errors = validateTournament(invalidTournament);
      expect(errors).toContain('Player IDs must be unique');
    });

    it('should reject empty player IDs', () => {
      const invalidTournament: Partial<Tournament> = {
        name: 'Test Tournament',
        status: TournamentStatus.SETUP,
        playerIds: ['player-1', '', 'player-3', 'player-4', 'player-5'],
      };

      const errors = validateTournament(invalidTournament);
      expect(errors).toContain(
        'Player ID at index 1 must be a non-empty string'
      );
    });

    it('should reject non-string player IDs', () => {
      const invalidTournament: Partial<Tournament> = {
        name: 'Test Tournament',
        status: TournamentStatus.SETUP,
        playerIds: ['player-1', 123 as any, 'player-3', 'player-4', 'player-5'],
      };

      const errors = validateTournament(invalidTournament);
      expect(errors).toContain(
        'Player ID at index 1 must be a non-empty string'
      );
    });

    it('should reject negative current matchday', () => {
      const invalidTournament: Partial<Tournament> = {
        name: 'Test Tournament',
        status: TournamentStatus.SETUP,
        playerIds: ['player-1', 'player-2', 'player-3', 'player-4', 'player-5'],
        currentMatchday: -1,
      };

      const errors = validateTournament(invalidTournament);
      expect(errors).toContain(
        'Current matchday must be a non-negative number'
      );
    });

    it('should reject non-positive total matchdays', () => {
      const invalidTournament: Partial<Tournament> = {
        name: 'Test Tournament',
        status: TournamentStatus.SETUP,
        playerIds: ['player-1', 'player-2', 'player-3', 'player-4', 'player-5'],
        totalMatchdays: 0,
      };

      const errors = validateTournament(invalidTournament);
      expect(errors).toContain('Total matchdays must be a positive number');
    });

    it('should reject current matchday exceeding total matchdays', () => {
      const invalidTournament: Partial<Tournament> = {
        name: 'Test Tournament',
        status: TournamentStatus.SETUP,
        playerIds: ['player-1', 'player-2', 'player-3', 'player-4', 'player-5'],
        currentMatchday: 11,
        totalMatchdays: 10,
      };

      const errors = validateTournament(invalidTournament);
      expect(errors).toContain(
        'Current matchday cannot exceed total matchdays'
      );
    });

    it('should reject invalid createdAt date', () => {
      const invalidTournament: Partial<Tournament> = {
        name: 'Test Tournament',
        status: TournamentStatus.SETUP,
        playerIds: ['player-1', 'player-2', 'player-3', 'player-4', 'player-5'],
        createdAt: 'invalid-date' as any,
      };

      const errors = validateTournament(invalidTournament);
      expect(errors).toContain('Created date must be a valid Date object');
    });

    it('should reject empty tournament ID', () => {
      const invalidTournament: Partial<Tournament> = {
        id: '   ',
        name: 'Test Tournament',
        status: TournamentStatus.SETUP,
        playerIds: ['player-1', 'player-2', 'player-3', 'player-4', 'player-5'],
      };

      const errors = validateTournament(invalidTournament);
      expect(errors).toContain('Tournament ID must be a non-empty string');
    });

    it('should allow undefined optional fields', () => {
      const validTournament: Partial<Tournament> = {
        name: 'Test Tournament',
        status: TournamentStatus.SETUP,
        playerIds: ['player-1', 'player-2', 'player-3', 'player-4', 'player-5'],
      };

      const errors = validateTournament(validTournament);
      expect(errors).toEqual([]);
    });
  });

  describe('isValidTournament', () => {
    it('should return true for valid tournament', () => {
      const validTournament: Partial<Tournament> = {
        name: 'Test Tournament',
        status: TournamentStatus.SETUP,
        playerIds: ['player-1', 'player-2', 'player-3', 'player-4', 'player-5'],
      };

      expect(isValidTournament(validTournament)).toBe(true);
    });

    it('should return false for invalid tournament', () => {
      const invalidTournament: Partial<Tournament> = {};
      expect(isValidTournament(invalidTournament)).toBe(false);
    });
  });
});
