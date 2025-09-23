import { Match, validateMatch, isValidMatch } from './match.model';
import { PlayoffRound } from './enums';

describe('Match Model', () => {
  describe('validateMatch', () => {
    it('should return no errors for valid league match', () => {
      const validMatch: Partial<Match> = {
        id: 'match-1',
        homePlayerId: 'player-1',
        awayPlayerId: 'player-2',
        homePlayerName: 'John',
        awayPlayerName: 'Jane',
        matchday: 1,
        homeGoals: 2,
        awayGoals: 1,
        isPlayed: true,
        isPlayoff: false,
        createdAt: new Date(),
      };

      const errors = validateMatch(validMatch);
      expect(errors).toEqual([]);
    });

    it('should return no errors for valid playoff match', () => {
      const validMatch: Partial<Match> = {
        homePlayerId: 'player-1',
        awayPlayerId: 'player-2',
        homePlayerName: 'John',
        awayPlayerName: 'Jane',
        matchday: 1,
        isPlayed: false,
        isPlayoff: true,
        playoffRound: PlayoffRound.SEMIFINAL,
        createdAt: new Date(),
      };

      const errors = validateMatch(validMatch);
      expect(errors).toEqual([]);
    });

    it('should require home player ID', () => {
      const invalidMatch: Partial<Match> = {
        awayPlayerId: 'player-2',
        homePlayerName: 'John',
        awayPlayerName: 'Jane',
        matchday: 1,
        isPlayed: false,
        isPlayoff: false,
      };

      const errors = validateMatch(invalidMatch);
      expect(errors).toContain(
        'Home player ID is required and must be a string'
      );
    });

    it('should require away player ID', () => {
      const invalidMatch: Partial<Match> = {
        homePlayerId: 'player-1',
        homePlayerName: 'John',
        awayPlayerName: 'Jane',
        matchday: 1,
        isPlayed: false,
        isPlayoff: false,
      };

      const errors = validateMatch(invalidMatch);
      expect(errors).toContain(
        'Away player ID is required and must be a string'
      );
    });

    it('should reject same home and away player', () => {
      const invalidMatch: Partial<Match> = {
        homePlayerId: 'player-1',
        awayPlayerId: 'player-1',
        homePlayerName: 'John',
        awayPlayerName: 'John',
        matchday: 1,
        isPlayed: false,
        isPlayoff: false,
      };

      const errors = validateMatch(invalidMatch);
      expect(errors).toContain('Home and away players must be different');
    });

    it('should require home player name', () => {
      const invalidMatch: Partial<Match> = {
        homePlayerId: 'player-1',
        awayPlayerId: 'player-2',
        awayPlayerName: 'Jane',
        matchday: 1,
        isPlayed: false,
        isPlayoff: false,
      };

      const errors = validateMatch(invalidMatch);
      expect(errors).toContain(
        'Home player name is required and must be a string'
      );
    });

    it('should require away player name', () => {
      const invalidMatch: Partial<Match> = {
        homePlayerId: 'player-1',
        awayPlayerId: 'player-2',
        homePlayerName: 'John',
        matchday: 1,
        isPlayed: false,
        isPlayoff: false,
      };

      const errors = validateMatch(invalidMatch);
      expect(errors).toContain(
        'Away player name is required and must be a string'
      );
    });

    it('should require positive matchday', () => {
      const invalidMatch: Partial<Match> = {
        homePlayerId: 'player-1',
        awayPlayerId: 'player-2',
        homePlayerName: 'John',
        awayPlayerName: 'Jane',
        matchday: 0,
        isPlayed: false,
        isPlayoff: false,
      };

      const errors = validateMatch(invalidMatch);
      expect(errors).toContain('Matchday must be a positive number');
    });

    it('should reject negative home goals', () => {
      const invalidMatch: Partial<Match> = {
        homePlayerId: 'player-1',
        awayPlayerId: 'player-2',
        homePlayerName: 'John',
        awayPlayerName: 'Jane',
        matchday: 1,
        homeGoals: -1,
        isPlayed: false,
        isPlayoff: false,
      };

      const errors = validateMatch(invalidMatch);
      expect(errors).toContain('Home goals must be a non-negative integer');
    });

    it('should reject non-integer home goals', () => {
      const invalidMatch: Partial<Match> = {
        homePlayerId: 'player-1',
        awayPlayerId: 'player-2',
        homePlayerName: 'John',
        awayPlayerName: 'Jane',
        matchday: 1,
        homeGoals: 1.5,
        isPlayed: false,
        isPlayoff: false,
      };

      const errors = validateMatch(invalidMatch);
      expect(errors).toContain('Home goals must be a non-negative integer');
    });

    it('should reject negative away goals', () => {
      const invalidMatch: Partial<Match> = {
        homePlayerId: 'player-1',
        awayPlayerId: 'player-2',
        homePlayerName: 'John',
        awayPlayerName: 'Jane',
        matchday: 1,
        awayGoals: -1,
        isPlayed: false,
        isPlayoff: false,
      };

      const errors = validateMatch(invalidMatch);
      expect(errors).toContain('Away goals must be a non-negative integer');
    });

    it('should reject non-boolean isPlayed', () => {
      const invalidMatch: Partial<Match> = {
        homePlayerId: 'player-1',
        awayPlayerId: 'player-2',
        homePlayerName: 'John',
        awayPlayerName: 'Jane',
        matchday: 1,
        isPlayed: 'true' as any,
        isPlayoff: false,
      };

      const errors = validateMatch(invalidMatch);
      expect(errors).toContain('isPlayed must be a boolean value');
    });

    it('should reject non-boolean isPlayoff', () => {
      const invalidMatch: Partial<Match> = {
        homePlayerId: 'player-1',
        awayPlayerId: 'player-2',
        homePlayerName: 'John',
        awayPlayerName: 'Jane',
        matchday: 1,
        isPlayed: false,
        isPlayoff: 'false' as any,
      };

      const errors = validateMatch(invalidMatch);
      expect(errors).toContain('isPlayoff must be a boolean value');
    });

    it('should reject invalid playoff round', () => {
      const invalidMatch: Partial<Match> = {
        homePlayerId: 'player-1',
        awayPlayerId: 'player-2',
        homePlayerName: 'John',
        awayPlayerName: 'Jane',
        matchday: 1,
        isPlayed: false,
        isPlayoff: true,
        playoffRound: 'invalid' as any,
      };

      const errors = validateMatch(invalidMatch);
      expect(errors).toContain('Invalid playoff round');
    });

    it('should reject playoff round for non-playoff match', () => {
      const invalidMatch: Partial<Match> = {
        homePlayerId: 'player-1',
        awayPlayerId: 'player-2',
        homePlayerName: 'John',
        awayPlayerName: 'Jane',
        matchday: 1,
        isPlayed: false,
        isPlayoff: false,
        playoffRound: PlayoffRound.SEMIFINAL,
      };

      const errors = validateMatch(invalidMatch);
      expect(errors).toContain(
        'Playoff round should not be set for non-playoff matches'
      );
    });

    it('should require playoff round for playoff match', () => {
      const invalidMatch: Partial<Match> = {
        homePlayerId: 'player-1',
        awayPlayerId: 'player-2',
        homePlayerName: 'John',
        awayPlayerName: 'Jane',
        matchday: 1,
        isPlayed: false,
        isPlayoff: true,
      };

      const errors = validateMatch(invalidMatch);
      expect(errors).toContain('Playoff round is required for playoff matches');
    });

    it('should reject invalid createdAt date', () => {
      const invalidMatch: Partial<Match> = {
        homePlayerId: 'player-1',
        awayPlayerId: 'player-2',
        homePlayerName: 'John',
        awayPlayerName: 'Jane',
        matchday: 1,
        isPlayed: false,
        isPlayoff: false,
        createdAt: 'invalid-date' as any,
      };

      const errors = validateMatch(invalidMatch);
      expect(errors).toContain('Created date must be a valid Date object');
    });

    it('should reject empty match ID', () => {
      const invalidMatch: Partial<Match> = {
        id: '   ',
        homePlayerId: 'player-1',
        awayPlayerId: 'player-2',
        homePlayerName: 'John',
        awayPlayerName: 'Jane',
        matchday: 1,
        isPlayed: false,
        isPlayoff: false,
      };

      const errors = validateMatch(invalidMatch);
      expect(errors).toContain('Match ID must be a non-empty string');
    });
  });

  describe('isValidMatch', () => {
    it('should return true for valid match', () => {
      const validMatch: Partial<Match> = {
        homePlayerId: 'player-1',
        awayPlayerId: 'player-2',
        homePlayerName: 'John',
        awayPlayerName: 'Jane',
        matchday: 1,
        isPlayed: false,
        isPlayoff: false,
      };

      expect(isValidMatch(validMatch)).toBe(true);
    });

    it('should return false for invalid match', () => {
      const invalidMatch: Partial<Match> = {};
      expect(isValidMatch(invalidMatch)).toBe(false);
    });
  });
});
