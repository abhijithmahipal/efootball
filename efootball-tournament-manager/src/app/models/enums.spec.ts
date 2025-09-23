import {
  TournamentStatus,
  PlayoffRound,
  isValidTournamentStatus,
  isValidPlayoffRound,
} from './enums';

describe('Enums', () => {
  describe('TournamentStatus', () => {
    it('should have correct values', () => {
      expect(TournamentStatus.SETUP).toBe('setup');
      expect(TournamentStatus.LEAGUE).toBe('league');
      expect(TournamentStatus.PLAYOFFS).toBe('playoffs');
      expect(TournamentStatus.COMPLETED).toBe('completed');
    });
  });

  describe('PlayoffRound', () => {
    it('should have correct values', () => {
      expect(PlayoffRound.SEMIFINAL).toBe('semifinal');
      expect(PlayoffRound.FINAL).toBe('final');
      expect(PlayoffRound.THIRD_PLACE).toBe('third-place');
    });
  });

  describe('isValidTournamentStatus', () => {
    it('should return true for valid tournament statuses', () => {
      expect(isValidTournamentStatus('setup')).toBe(true);
      expect(isValidTournamentStatus('league')).toBe(true);
      expect(isValidTournamentStatus('playoffs')).toBe(true);
      expect(isValidTournamentStatus('completed')).toBe(true);
    });

    it('should return false for invalid tournament statuses', () => {
      expect(isValidTournamentStatus('invalid')).toBe(false);
      expect(isValidTournamentStatus('')).toBe(false);
      expect(isValidTournamentStatus('SETUP')).toBe(false);
    });
  });

  describe('isValidPlayoffRound', () => {
    it('should return true for valid playoff rounds', () => {
      expect(isValidPlayoffRound('semifinal')).toBe(true);
      expect(isValidPlayoffRound('final')).toBe(true);
      expect(isValidPlayoffRound('third-place')).toBe(true);
    });

    it('should return false for invalid playoff rounds', () => {
      expect(isValidPlayoffRound('invalid')).toBe(false);
      expect(isValidPlayoffRound('')).toBe(false);
      expect(isValidPlayoffRound('SEMIFINAL')).toBe(false);
    });
  });
});
