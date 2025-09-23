export interface Standing {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
}

export function validateStanding(standing: Partial<Standing>): string[] {
  const errors: string[] = [];

  if (!standing.playerId || typeof standing.playerId !== 'string') {
    errors.push('Player ID is required and must be a string');
  }

  if (!standing.playerName || typeof standing.playerName !== 'string') {
    errors.push('Player name is required and must be a string');
  }

  const numericFields = [
    'matchesPlayed',
    'wins',
    'draws',
    'losses',
    'goalsFor',
    'goalsAgainst',
    'points',
    'position',
  ];

  numericFields.forEach((field) => {
    const value = standing[field as keyof Standing];
    if (value !== undefined) {
      if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
        errors.push(`${field} must be a non-negative integer`);
      }
    }
  });

  if (
    standing.goalDifference !== undefined &&
    typeof standing.goalDifference !== 'number'
  ) {
    errors.push('Goal difference must be a number');
  }

  // Validate logical consistency
  if (
    standing.matchesPlayed !== undefined &&
    standing.wins !== undefined &&
    standing.draws !== undefined &&
    standing.losses !== undefined
  ) {
    if (
      standing.wins + standing.draws + standing.losses !==
      standing.matchesPlayed
    ) {
      errors.push('Wins + draws + losses must equal matches played');
    }
  }

  if (
    standing.goalsFor !== undefined &&
    standing.goalsAgainst !== undefined &&
    standing.goalDifference !== undefined
  ) {
    if (standing.goalDifference !== standing.goalsFor - standing.goalsAgainst) {
      errors.push('Goal difference must equal goals for minus goals against');
    }
  }

  if (
    standing.wins !== undefined &&
    standing.draws !== undefined &&
    standing.points !== undefined
  ) {
    const expectedPoints = standing.wins * 3 + standing.draws * 1;
    if (standing.points !== expectedPoints) {
      errors.push(
        'Points calculation is incorrect (3 points per win, 1 per draw)'
      );
    }
  }

  if (standing.position !== undefined && standing.position < 1) {
    errors.push('Position must be a positive integer');
  }

  return errors;
}

export function isValidStanding(standing: Partial<Standing>): boolean {
  return validateStanding(standing).length === 0;
}
