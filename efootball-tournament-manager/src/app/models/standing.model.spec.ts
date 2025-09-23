import { Standing, validateStanding, isValidStanding } from './standing.model';

describe('Standing Model', () => {
  describe('validateStanding', () => {
    it('should return no errors for valid standing', () => {
      const validStanding: Partial<Standing> = {
        playerId: 'player-1',
        playerName: 'John Doe',
        matchesPlayed: 6,
        wins: 4,
        draws: 1,
        losses: 1,
        goalsFor: 12,
        goalsAgainst: 5,
        goalDifference: 7,
        points: 13,
        position: 1,
      };

      const errors = validateStanding(validStanding);
      expect(errors).toEqual([]);
    });

    it('should require player ID', () => {
      const invalidStanding: Partial<Standing> = {
        playerName: 'John Doe',
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        position: 1,
      };

      const errors = validateStanding(invalidStanding);
      expect(errors).toContain('Player ID is required and must be a string');
    });

    it('should require player name', () => {
      const invalidStanding: Partial<Standing> = {
        playerId: 'player-1',
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        position: 1,
      };

      const errors = validateStanding(invalidStanding);
      expect(errors).toContain('Player name is required and must be a string');
    });

    it('should reject negative matches played', () => {
      const invalidStanding: Partial<Standing> = {
        playerId: 'player-1',
        playerName: 'John Doe',
        matchesPlayed: -1,
      };

      const errors = validateStanding(invalidStanding);
      expect(errors).toContain('matchesPlayed must be a non-negative integer');
    });

    it('should reject non-integer matches played', () => {
      const invalidStanding: Partial<Standing> = {
        playerId: 'player-1',
        playerName: 'John Doe',
        matchesPlayed: 1.5,
      };

      const errors = validateStanding(invalidStanding);
      expect(errors).toContain('matchesPlayed must be a non-negative integer');
    });

    it('should reject negative wins', () => {
      const invalidStanding: Partial<Standing> = {
        playerId: 'player-1',
        playerName: 'John Doe',
        wins: -1,
      };

      const errors = validateStanding(invalidStanding);
      expect(errors).toContain('wins must be a non-negative integer');
    });

    it('should reject negative draws', () => {
      const invalidStanding: Partial<Standing> = {
        playerId: 'player-1',
        playerName: 'John Doe',
        draws: -1,
      };

      const errors = validateStanding(invalidStanding);
      expect(errors).toContain('draws must be a non-negative integer');
    });

    it('should reject negative losses', () => {
      const invalidStanding: Partial<Standing> = {
        playerId: 'player-1',
        playerName: 'John Doe',
        losses: -1,
      };

      const errors = validateStanding(invalidStanding);
      expect(errors).toContain('losses must be a non-negative integer');
    });

    it('should reject negative goals for', () => {
      const invalidStanding: Partial<Standing> = {
        playerId: 'player-1',
        playerName: 'John Doe',
        goalsFor: -1,
      };

      const errors = validateStanding(invalidStanding);
      expect(errors).toContain('goalsFor must be a non-negative integer');
    });

    it('should reject negative goals against', () => {
      const invalidStanding: Partial<Standing> = {
        playerId: 'player-1',
        playerName: 'John Doe',
        goalsAgainst: -1,
      };

      const errors = validateStanding(invalidStanding);
      expect(errors).toContain('goalsAgainst must be a non-negative integer');
    });

    it('should reject negative points', () => {
      const invalidStanding: Partial<Standing> = {
        playerId: 'player-1',
        playerName: 'John Doe',
        points: -1,
      };

      const errors = validateStanding(invalidStanding);
      expect(errors).toContain('points must be a non-negative integer');
    });

    it('should reject non-positive position', () => {
      const invalidStanding: Partial<Standing> = {
        playerId: 'player-1',
        playerName: 'John Doe',
        position: 0,
      };

      const errors = validateStanding(invalidStanding);
      expect(errors).toContain('Position must be a positive integer');
    });

    it('should reject non-number goal difference', () => {
      const invalidStanding: Partial<Standing> = {
        playerId: 'player-1',
        playerName: 'John Doe',
        goalDifference: 'invalid' as any,
      };

      const errors = validateStanding(invalidStanding);
      expect(errors).toContain('Goal difference must be a number');
    });

    it('should validate wins + draws + losses = matches played', () => {
      const invalidStanding: Partial<Standing> = {
        playerId: 'player-1',
        playerName: 'John Doe',
        matchesPlayed: 10,
        wins: 4,
        draws: 2,
        losses: 3, // Should be 4 to equal 10
      };

      const errors = validateStanding(invalidStanding);
      expect(errors).toContain(
        'Wins + draws + losses must equal matches played'
      );
    });

    it('should validate goal difference calculation', () => {
      const invalidStanding: Partial<Standing> = {
        playerId: 'player-1',
        playerName: 'John Doe',
        goalsFor: 10,
        goalsAgainst: 5,
        goalDifference: 4, // Should be 5
      };

      const errors = validateStanding(invalidStanding);
      expect(errors).toContain(
        'Goal difference must equal goals for minus goals against'
      );
    });

    it('should validate points calculation', () => {
      const invalidStanding: Partial<Standing> = {
        playerId: 'player-1',
        playerName: 'John Doe',
        wins: 4,
        draws: 2,
        points: 10, // Should be 14 (4*3 + 2*1)
      };

      const errors = validateStanding(invalidStanding);
      expect(errors).toContain(
        'Points calculation is incorrect (3 points per win, 1 per draw)'
      );
    });

    it('should allow negative goal difference', () => {
      const validStanding: Partial<Standing> = {
        playerId: 'player-1',
        playerName: 'John Doe',
        goalsFor: 3,
        goalsAgainst: 8,
        goalDifference: -5,
      };

      const errors = validateStanding(validStanding);
      expect(errors).toEqual([]);
    });

    it('should allow undefined optional fields', () => {
      const validStanding: Partial<Standing> = {
        playerId: 'player-1',
        playerName: 'John Doe',
      };

      const errors = validateStanding(validStanding);
      expect(errors).toEqual([]);
    });
  });

  describe('isValidStanding', () => {
    it('should return true for valid standing', () => {
      const validStanding: Partial<Standing> = {
        playerId: 'player-1',
        playerName: 'John Doe',
        matchesPlayed: 6,
        wins: 4,
        draws: 1,
        losses: 1,
        goalsFor: 12,
        goalsAgainst: 5,
        goalDifference: 7,
        points: 13,
        position: 1,
      };

      expect(isValidStanding(validStanding)).toBe(true);
    });

    it('should return false for invalid standing', () => {
      const invalidStanding: Partial<Standing> = {};
      expect(isValidStanding(invalidStanding)).toBe(false);
    });
  });
});
