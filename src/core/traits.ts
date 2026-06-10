import type { PokemonSummary, TraitTier } from './types';

const THRESHOLDS = [2, 4, 6];

type TraitEffect = {
  role: string;
  tiers: [string, string, string];
};

const TRAIT_EFFECTS: Record<string, TraitEffect> = {
  Bug: {
    role: 'XP scaling',
    tiers: ['20% chance for +1 level after fights.', '40% chance for +1 level after fights.', '80% chance for +1 level after fights.'],
  },
  Dark: {
    role: 'Disruption',
    tiers: ['Confused enemies have 5% self-hit chance.', 'Confused enemies have 10% self-hit chance.', 'Confused enemies have 15% self-hit chance.'],
  },
  Dragon: {
    role: 'KO snowball',
    tiers: ['+1 Speed/Atk/SpAtk on KO, up to +10.', '+2 Speed/Atk/SpAtk on KO, up to +10.', '+3 Speed/Atk/SpAtk on KO, up to +10.'],
  },
  Electric: {
    role: 'Extra attacks',
    tiers: ['15% chance to attack again.', '30% chance to attack again.', '45% chance to attack again.'],
  },
  Fairy: {
    role: 'Enemy debuff',
    tiers: ['Enemies start with -1 Atk and SpAtk.', 'Enemies start with -2 Atk and SpAtk.', 'Enemies start with -3 Atk and SpAtk.'],
  },
  Fighting: {
    role: 'Comeback',
    tiers: ['Team rallies when an ally faints.', 'Stronger rally when an ally faints.', 'Largest rally when an ally faints.'],
  },
  Fire: {
    role: 'Opening damage',
    tiers: ['+1 Atk and SpAtk at fight start.', '+2 Atk and SpAtk at fight start.', '+3 Atk and SpAtk at fight start.'],
  },
  Flying: {
    role: 'Avoidance',
    tiers: ['10% dodge chance.', '15% dodge chance.', '20% dodge chance.'],
  },
  Ghost: {
    role: 'Execute',
    tiers: ['Execute enemies under 15% HP.', 'Execute enemies under 30% HP.', 'Execute enemies under 50% HP.'],
  },
  Grass: {
    role: 'Drain',
    tiers: ['Heal 5% of damage dealt.', 'Heal 10% of damage dealt.', 'Heal 15% of damage dealt.'],
  },
  Ground: {
    role: 'Bulk',
    tiers: ['+2 Defense at fight start.', '+4 Defense at fight start.', '+6 Defense at fight start.'],
  },
  Ice: {
    role: 'Freeze control',
    tiers: ['15% chance to freeze.', '30% chance to freeze.', '45% chance to freeze.'],
  },
  Normal: {
    role: 'HP scaling',
    tiers: ['+25% max HP at fight start.', '+50% max HP at fight start.', '+100% max HP at fight start.'],
  },
  Poison: {
    role: 'Status damage',
    tiers: ['33% chance to poison.', '66% chance to poison.', '100% chance to poison.'],
  },
  Psychic: {
    role: 'Splash damage',
    tiers: ['Splash damage for 10%.', 'Splash damage for 20%.', 'Splash damage for 30%.'],
  },
  Rock: {
    role: 'Scaling bulk',
    tiers: ['Gain Def/SpDef after attacking.', 'Gain more Def/SpDef after attacking.', 'Gain the most Def/SpDef after attacking.'],
  },
  Steel: {
    role: 'Damage reduction',
    tiers: ['Reduce incoming damage by 15%.', 'Reduce incoming damage by 30%.', 'Reduce incoming damage by 45%.'],
  },
  Water: {
    role: 'Enemy weakening',
    tiers: ['33% chance to debuff enemies.', '66% chance to debuff enemies.', '100% chance to debuff enemies.'],
  },
};

export function getTraitEffect(type: string): TraitEffect | undefined {
  return TRAIT_EFFECTS[type];
}

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
      const effect = TRAIT_EFFECTS[type];
      return {
        type,
        count,
        tier,
        nextThreshold,
        role: effect?.role,
        description: tier > 0 ? effect?.tiers[tier - 1] : undefined,
        nextDescription: nextThreshold ? effect?.tiers[THRESHOLDS.indexOf(nextThreshold)] : undefined,
      };
    })
    .sort((a, b) => b.tier - a.tier || b.count - a.count || a.type.localeCompare(b.type));
}

export function formatTrait(t: TraitTier): string {
  const next = t.nextThreshold ? `, ${t.nextThreshold - t.count} to next tier` : ', max tier';
  return `${t.type} T${t.tier} (${t.count}${next})`;
}
