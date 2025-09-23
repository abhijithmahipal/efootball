export enum TournamentStatus {
  SETUP = 'setup',
  LEAGUE = 'league',
  PLAYOFFS = 'playoffs',
  COMPLETED = 'completed',
}

export enum PlayoffRound {
  SEMIFINAL = 'semifinal',
  FINAL = 'final',
  THIRD_PLACE = 'third-place',
}

export function isValidTournamentStatus(
  status: string
): status is TournamentStatus {
  return Object.values(TournamentStatus).includes(status as TournamentStatus);
}

export function isValidPlayoffRound(round: string): round is PlayoffRound {
  return Object.values(PlayoffRound).includes(round as PlayoffRound);
}
