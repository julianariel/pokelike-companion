import { getEffectiveness, POKEMON_TYPES, type PokemonType } from './typeChart';
import type { GameSnapshot } from './types';

type BossPlan = {
  name: string;
  type: PokemonType | 'Mixed';
  level: number;
};

export type BossScout = BossPlan & {
  goodAttackTypes: PokemonType[];
  teamAnswers: string[];
  warning: string;
};

const NORMAL_BOSSES: BossPlan[] = [
  { name: 'Brock', type: 'Rock', level: 14 },
  { name: 'Misty', type: 'Water', level: 20 },
  { name: 'Lt. Surge', type: 'Electric', level: 25 },
  { name: 'Erika', type: 'Grass', level: 32 },
  { name: 'Janine', type: 'Poison', level: 44 },
  { name: 'Sabrina', type: 'Psychic', level: 44 },
  { name: 'Blaine', type: 'Fire', level: 53 },
  { name: 'Blue', type: 'Ground', level: 60 },
  { name: 'Elite Four', type: 'Mixed', level: 65 },
];

const GEN2_BOSSES: BossPlan[] = [
  { name: 'Falkner', type: 'Flying', level: 10 },
  { name: 'Bugsy', type: 'Bug', level: 23 },
  { name: 'Whitney', type: 'Normal', level: 35 },
  { name: 'Morty', type: 'Ghost', level: 45 },
  { name: 'Chuck', type: 'Fighting', level: 59 },
  { name: 'Jasmine', type: 'Steel', level: 69 },
  { name: 'Pryce', type: 'Ice', level: 79 },
  { name: 'Clair', type: 'Dragon', level: 84 },
  { name: 'Elite Four', type: 'Mixed', level: 90 },
];

const TOWER_BOSSES = ['Ash', 'Lance', 'Steven', 'Cynthia', 'N'];

function isPokemonType(type: string): type is PokemonType {
  return (POKEMON_TYPES as readonly string[]).includes(type);
}

function averageLevel(snapshot: GameSnapshot): number {
  if (!snapshot.team.length) return 0;
  return snapshot.team.reduce((sum, pokemon) => sum + pokemon.level, 0) / snapshot.team.length;
}

function towerBoss(snapshot: GameSnapshot): BossPlan {
  const stage = snapshot.endless?.stageNumber ?? 1;
  const region = snapshot.endless?.regionNumber ?? 1;
  const mapIndex = snapshot.endless?.mapIndexInRegion ?? 0;
  return {
    name: TOWER_BOSSES[Math.max(0, Math.min(TOWER_BOSSES.length - 1, stage - 1))] ?? 'Tower Boss',
    type: stage === 3 ? 'Steel' : 'Mixed',
    level: 8 + stage * 5 + (region - 1) * 8 + mapIndex * 3,
  };
}

function currentBoss(snapshot: GameSnapshot): BossPlan {
  if (snapshot.mode === 'battle-tower') return towerBoss(snapshot);
  const index = snapshot.currentMap ?? 0;
  if (snapshot.mode === 'normal') return NORMAL_BOSSES[index] ?? NORMAL_BOSSES[NORMAL_BOSSES.length - 1];
  return GEN2_BOSSES[index] ?? GEN2_BOSSES[GEN2_BOSSES.length - 1];
}

export function getBossScout(snapshot: GameSnapshot): BossScout | null {
  if (snapshot.mode === 'unknown' || !snapshot.team.length) return null;

  const boss = currentBoss(snapshot);
  const goodAttackTypes =
    boss.type === 'Mixed'
      ? []
      : POKEMON_TYPES.filter((attackType) => getEffectiveness(attackType, boss.type as PokemonType) > 1);
  const teamAnswers =
    boss.type === 'Mixed'
      ? snapshot.team
          .filter((pokemon) => pokemon.currentHp > 0)
          .sort((a, b) => b.level - a.level || b.hpRatio - a.hpRatio)
          .slice(0, 3)
          .map((pokemon) => pokemon.name)
      : snapshot.team
          .filter((pokemon) => pokemon.currentHp > 0)
          .map((pokemon) => ({
            pokemon,
            best: pokemon.types.filter(isPokemonType).reduce((max, attackType) => Math.max(max, getEffectiveness(attackType, boss.type as PokemonType)), 1),
          }))
          .filter(({ best }) => best > 1)
          .sort((a, b) => b.best - a.best || b.pokemon.level - a.pokemon.level)
          .slice(0, 3)
          .map(({ pokemon }) => pokemon.name);

  const levelDelta = averageLevel(snapshot) - boss.level;
  const warning =
    levelDelta >= 2
      ? 'Level pace is ahead of this target.'
      : levelDelta >= -4
        ? 'Close enough; preserve HP and lead with the best matchup.'
        : 'Under target; favor safe XP, healing, or item setup before committing.';

  return { ...boss, goodAttackTypes, teamAnswers, warning };
}
