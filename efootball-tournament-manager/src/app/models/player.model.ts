export interface Player {
  id: string;
  name: string;
  createdAt: Date;
  isActive: boolean;
}

export function validatePlayer(player: Partial<Player>): string[] {
  const errors: string[] = [];

  if (!player.name || typeof player.name !== 'string') {
    errors.push('Player name is required and must be a string');
  } else if (player.name.trim().length === 0) {
    errors.push('Player name cannot be empty');
  } else if (player.name.trim().length > 50) {
    errors.push('Player name cannot exceed 50 characters');
  }

  if (
    player.id !== undefined &&
    (typeof player.id !== 'string' || player.id.trim().length === 0)
  ) {
    errors.push('Player ID must be a non-empty string');
  }

  if (player.createdAt !== undefined && !(player.createdAt instanceof Date)) {
    errors.push('Created date must be a valid Date object');
  }

  if (player.isActive !== undefined && typeof player.isActive !== 'boolean') {
    errors.push('isActive must be a boolean value');
  }

  return errors;
}

export function isValidPlayer(player: Partial<Player>): boolean {
  return validatePlayer(player).length === 0;
}
