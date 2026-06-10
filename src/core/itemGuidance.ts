import type { GameSnapshot, PokemonSummary } from './types';

export type ItemHint = {
  item: string;
  role: string;
  target: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
};

const TYPE_ITEM_NAMES = new Set([
  'black belt',
  'black glasses',
  'charcoal',
  'dragon fang',
  'hard stone',
  'magnet',
  'metal coat',
  'miracle seed',
  'mystic water',
  'never-melt ice',
  'poison barb',
  'sharp beak',
  'silk scarf',
  'silver powder',
  'soft sand',
  'spell tag',
  'twisted spoon',
]);

function bestCarry(snapshot: GameSnapshot): PokemonSummary | null {
  return (
    [...snapshot.team]
      .filter((pokemon) => pokemon.currentHp > 0)
      .sort((a, b) => b.level - a.level || b.hpRatio - a.hpRatio || b.moveTier - a.moveTier)[0] ?? null
  );
}

function healthiestFrontliner(snapshot: GameSnapshot): PokemonSummary | null {
  return (
    [...snapshot.team]
      .filter((pokemon) => pokemon.currentHp > 0)
      .sort((a, b) => b.hpRatio - a.hpRatio || b.level - a.level)[0] ?? null
  );
}

function targetName(pokemon: PokemonSummary | null): string {
  return pokemon?.name ?? 'your best active Pokemon';
}

function heldItems(snapshot: GameSnapshot): string[] {
  return snapshot.team.map((pokemon) => pokemon.heldItemName).filter((item): item is string => Boolean(item));
}

export function getItemHints(snapshot: GameSnapshot): ItemHint[] {
  const names = [...new Set([...snapshot.items, ...heldItems(snapshot)])];
  if (!names.length) return [];

  const carry = bestCarry(snapshot);
  const tank = healthiestFrontliner(snapshot);
  const teamTypes = new Set(snapshot.team.flatMap((pokemon) => pokemon.types.map((type) => type.toLowerCase())));

  return names
    .map((item): ItemHint => {
      const lower = item.toLowerCase();
      if (lower.includes('lucky egg')) {
        return {
          item,
          role: 'XP scaler',
          target: targetName(carry),
          detail: 'Best on the Pokemon you expect to keep fighting, especially before extra trainer or wild battle nodes.',
          priority: 'high',
        };
      }
      if (lower.includes('rare candy')) {
        return {
          item,
          role: 'Immediate levels',
          target: targetName(carry),
          detail: 'Use when a boss or Elite fight is close and the carry is slightly under target.',
          priority: 'high',
        };
      }
      if (lower.includes('tm') || lower.includes('technical')) {
        return {
          item,
          role: 'Move tier',
          target: targetName(carry),
          detail: 'Move upgrades usually convert directly into damage; avoid spending them on bench candidates.',
          priority: 'high',
        };
      }
      if (lower.includes('leftovers') || lower.includes('shell bell') || lower.includes('rocky helmet')) {
        return {
          item,
          role: 'Long-fight sustain',
          target: targetName(tank),
          detail: 'Put sustain on the Pokemon most likely to take repeated hits, not a low-HP swap candidate.',
          priority: 'high',
        };
      }
      if (lower.includes('life orb') || lower.includes('expert belt') || lower.includes('choice band') || lower.includes('choice specs') || lower.includes('wide lens')) {
        return {
          item,
          role: 'Damage carry',
          target: targetName(carry),
          detail: 'Use on the highest-level attacker with reliable coverage; faster KOs reduce incoming turns.',
          priority: 'high',
        };
      }
      if (lower.includes('assault vest') || lower.includes('focus sash') || lower.includes('eviolite') || lower.includes('red card')) {
        return {
          item,
          role: 'Survival tech',
          target: targetName(tank),
          detail: lower.includes('eviolite') ? 'Eviolite is premium only if the holder can still evolve.' : 'Defensive tech belongs on the Pokemon expected to absorb the scariest matchup.',
          priority: 'medium',
        };
      }
      if (TYPE_ITEM_NAMES.has(lower) || [...teamTypes].some((type) => lower.includes(type))) {
        return {
          item,
          role: 'Type boost',
          target: targetName(carry),
          detail: 'Type boosts are strongest when they match the holder’s main attacking type or Battle Tower trait plan.',
          priority: 'medium',
        };
      }
      return {
        item,
        role: 'Flexible',
        target: targetName(carry),
        detail: 'Keep it aligned with the Pokemon you plan to keep; avoid investing into a slot you expect to replace.',
        priority: 'low',
      };
    })
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.priority] - rank[b.priority] || a.item.localeCompare(b.item);
    })
    .slice(0, 6);
}
