import type { PokemonSummary, TraitTier } from './types';

const THRESHOLDS = [2, 4, 6];

export function computeTraitTiers(team: PokemonSummary[]): TraitTier[] {
  const counts = new Map<string, number>();

  for (const pokemon of team) {
    const multiplier = pokemon.isShiny ? 2 : 1;
    for (const type of pokemon.types) {
      counts.set(type, (counts.get(type) ?? 0) + multiplier);
    }
  }

  return [...counts.entries()]
    .map(([type, count]) => {
      const tier = count >= 6 ? 3 : count >= 4 ? 2 : count >= 2 ? 1 : 0;
      const nextThreshold = THRESHOLDS.find((threshold) => threshold > count) ?? null;
      return { type, count, tier, nextThreshold };
    })
    .sort((a, b) => b.tier - a.tier || b.count - a.count || a.type.localeCompare(b.type));
}

export function formatTrait(t: TraitTier): string {
  const next = t.nextThreshold ? `, ${t.nextThreshold - t.count} to next tier` : ', max tier';
  return `${t.type} T${t.tier} (${t.count}${next})`;
}
