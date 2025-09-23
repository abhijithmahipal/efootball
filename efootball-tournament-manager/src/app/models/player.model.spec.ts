import { Player, validatePlayer, isValidPlayer } from './player.model';

describe('Player Model', () => {
  describe('validatePlayer', () => {
    it('should return no errors for valid player', () => {
      const validPlayer: Partial<Player> = {
        id: 'player-1',
        name: 'John Doe',
        createdAt: new Date(),
        isActive: true,
      };

      const errors = validatePlayer(validPlayer);
      expect(errors).toEqual([]);
    });

    it('should require player name', () => {
      const invalidPlayer: Partial<Player> = {};
      const errors = validatePlayer(invalidPlayer);
      expect(errors).toContain('Player name is required and must be a string');
    });

    it('should reject empty player name', () => {
      const invalidPlayer: Partial<Player> = { name: '   ' };
      const errors = validatePlayer(invalidPlayer);
      expect(errors).toContain('Player name cannot be empty');
    });

    it('should reject player name longer than 50 characters', () => {
      const invalidPlayer: Partial<Player> = {
        name: 'A'.repeat(51),
      };
      const errors = validatePlayer(invalidPlayer);
      expect(errors).toContain('Player name cannot exceed 50 characters');
    });

    it('should reject non-string player name', () => {
      const invalidPlayer: Partial<Player> = {
        name: 123 as any,
      };
      const errors = validatePlayer(invalidPlayer);
      expect(errors).toContain('Player name is required and must be a string');
    });

    it('should reject empty player ID', () => {
      const invalidPlayer: Partial<Player> = {
        name: 'John',
        id: '   ',
      };
      const errors = validatePlayer(invalidPlayer);
      expect(errors).toContain('Player ID must be a non-empty string');
    });

    it('should reject non-string player ID', () => {
      const invalidPlayer: Partial<Player> = {
        name: 'John',
        id: 123 as any,
      };
      const errors = validatePlayer(invalidPlayer);
      expect(errors).toContain('Player ID must be a non-empty string');
    });

    it('should reject invalid createdAt date', () => {
      const invalidPlayer: Partial<Player> = {
        name: 'John',
        createdAt: 'invalid-date' as any,
      };
      const errors = validatePlayer(invalidPlayer);
      expect(errors).toContain('Created date must be a valid Date object');
    });

    it('should reject non-boolean isActive', () => {
      const invalidPlayer: Partial<Player> = {
        name: 'John',
        isActive: 'true' as any,
      };
      const errors = validatePlayer(invalidPlayer);
      expect(errors).toContain('isActive must be a boolean value');
    });

    it('should allow undefined optional fields', () => {
      const validPlayer: Partial<Player> = {
        name: 'John',
      };
      const errors = validatePlayer(validPlayer);
      expect(errors).toEqual([]);
    });
  });

  describe('isValidPlayer', () => {
    it('should return true for valid player', () => {
      const validPlayer: Partial<Player> = {
        name: 'John Doe',
        createdAt: new Date(),
        isActive: true,
      };

      expect(isValidPlayer(validPlayer)).toBe(true);
    });

    it('should return false for invalid player', () => {
      const invalidPlayer: Partial<Player> = {};
      expect(isValidPlayer(invalidPlayer)).toBe(false);
    });
  });
});
