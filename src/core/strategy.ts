import { formatTrait } from './traits';
import { getEffectiveness, POKEMON_TYPES, type PokemonType } from './typeChart';
import type { GameSnapshot, MapNodeSummary, Recommendation } from './types';

const NODE_LABELS: Record<string, string> = {
  battle: 'Wild Battle',
  catch: 'Catch',
  item: 'Item',
  question: 'Mystery',
  boss: 'Boss',
  pokecenter: 'Pokemon Center',
  trainer: 'Trainer',
  legendary: 'Legendary',
  move_tutor: 'Move Tutor',
  trade: 'Trade',
  silver: 'Silver',
};

const NODE_ACTIONS: Record<string, string> = {
  battle: 'take a safe leveling fight',
  catch: 'add a catch option',
  item: 'pick up an item reward',
  question: 'take the mystery reward',
  boss: 'challenge the boss',
  pokecenter: 'heal at the Pokemon Center',
  trainer: 'take the trainer fight',
  legendary: 'challenge the legendary encounter',
  move_tutor: 'visit the Move Tutor',
  trade: 'check the trade',
  silver: 'fight Silver',
};

const NORMAL_BOSS_TYPES = ['Rock', 'Water', 'Electric', 'Grass', 'Poison', 'Psychic', 'Fire', 'Ground', 'Mixed'];
const GEN2_BOSS_TYPES = ['Flying', 'Bug', 'Normal', 'Ghost', 'Fighting', 'Steel', 'Ice', 'Dragon', 'Mixed'];
const NORMAL_BOSS_LEVELS = [14, 20, 25, 32, 44, 44, 53, 60, 65];
const GEN2_BOSS_LEVELS = [10, 23, 35, 45, 59, 69, 79, 84, 90];

function isPokemonType(type: string): type is PokemonType {
  return (POKEMON_TYPES as readonly string[]).includes(type);
}

function teamHpRatio(snapshot: GameSnapshot): number {
  if (!snapshot.team.length) return 0;
  return snapshot.team.reduce((sum, pokemon) => sum + pokemon.hpRatio, 0) / snapshot.team.length;
}

function averageLevel(snapshot: GameSnapshot): number {
  if (!snapshot.team.length) return 0;
  return snapshot.team.reduce((sum, pokemon) => sum + pokemon.level, 0) / snapshot.team.length;
}

function healthyTeamSize(snapshot: GameSnapshot): number {
  return snapshot.team.filter((pokemon) => pokemon.currentHp > 0).length;
}

function targetBossType(snapshot: GameSnapshot): string {
  const map = snapshot.currentMap ?? 0;
  if (snapshot.mode === 'battle-tower') return 'Mixed';
  return snapshot.mode === 'normal'
    ? NORMAL_BOSS_TYPES[map] ?? 'Mixed'
    : GEN2_BOSS_TYPES[map] ?? 'Mixed';
}

function targetBossLevel(snapshot: GameSnapshot): number {
  const map = snapshot.currentMap ?? 0;
  if (snapshot.mode === 'battle-tower') {
    const stage = snapshot.endless?.stageNumber ?? 1;
    const region = snapshot.endless?.regionNumber ?? 1;
    const mapIndex = snapshot.endless?.mapIndexInRegion ?? 0;
    return 8 + stage * 5 + (region - 1) * 8 + mapIndex * 3;
  }
  return snapshot.mode === 'normal'
    ? NORMAL_BOSS_LEVELS[map] ?? 65
    : GEN2_BOSS_LEVELS[map] ?? 90;
}

function coverageBonusAgainst(type: string, snapshot: GameSnapshot): number {
  if (type === 'Mixed' || !isPokemonType(type)) return 0;
  const best = snapshot.team.reduce((max, pokemon) => {
    const pokemonBest = pokemon.types
      .filter(isPokemonType)
      .reduce((innerMax, attackType) => Math.max(innerMax, getEffectiveness(attackType, type)), 1);
    return Math.max(max, pokemonBest);
  }, 1);
  if (best >= 2) return 10;
  if (best === 0) return -8;
  if (best < 1) return -4;
  return 0;
}

function estimateReadiness(snapshot: GameSnapshot): { chance: number; label: string; reasons: string[] } {
  if (!snapshot.team.length) {
    return { chance: 0, label: 'No team', reasons: ['No active team was detected.'] };
  }

  const bossLevel = targetBossLevel(snapshot);
  const avgLevel = averageLevel(snapshot);
  const hp = teamHpRatio(snapshot);
  const teamSize = healthyTeamSize(snapshot);
  const bossType = targetBossType(snapshot);

  let chance = 48;
  chance += Math.max(-24, Math.min(24, (avgLevel - bossLevel + 2) * 4));
  chance += Math.round((hp - 0.65) * 38);
  chance += Math.min(12, Math.max(-14, (teamSize - 2) * 4));
  chance += coverageBonusAgainst(bossType, snapshot);
  if (snapshot.mode === 'nuzlocke') chance -= 8;
  if (snapshot.mode === 'battle-tower' && snapshot.traits.some((trait) => trait.tier > 0)) chance += 6;

  const clamped = Math.max(5, Math.min(95, Math.round(chance)));
  return {
    chance: clamped,
    label: bossType === 'Mixed' ? `next boss around Lv${bossLevel}` : `${bossType} boss around Lv${bossLevel}`,
    reasons: [
      `Average level ${avgLevel.toFixed(1)} vs ${bossLevel} target.`,
      `Average HP ${Math.round(hp * 100)}% across ${teamSize} healthy Pokemon.`,
      bossType === 'Mixed' ? 'Mixed boss: broad coverage matters.' : `Coverage checked against ${bossType}.`,
    ],
  };
}

function hasFainted(snapshot: GameSnapshot): boolean {
  return snapshot.team.some((pokemon) => pokemon.currentHp <= 0);
}

function hasUnmasteredMoves(snapshot: GameSnapshot): boolean {
  return snapshot.team.some((pokemon) => pokemon.currentHp > 0 && pokemon.moveTier < 2);
}

function layerPeers(snapshot: GameSnapshot, node: MapNodeSummary): MapNodeSummary[] {
  if (node.layer === undefined) return [];
  return snapshot.mapNodes
    .filter((candidate) => candidate.layer === node.layer)
    .sort((a, b) => (a.col ?? 0) - (b.col ?? 0) || a.id.localeCompare(b.id));
}

function nodePosition(snapshot: GameSnapshot, node: MapNodeSummary): string {
  const peers = layerPeers(snapshot, node);
  if (peers.length <= 1) return '';
  const index = peers.findIndex((candidate) => candidate.id === node.id);
  if (index < 0) return '';

  const labelsBySize: Record<number, string[]> = {
    2: ['left lane', 'right lane'],
    3: ['left lane', 'middle lane', 'right lane'],
    4: ['far-left lane', 'left-center lane', 'right-center lane', 'far-right lane'],
  };
  const labels = labelsBySize[peers.length];
  return labels?.[index] ?? `choice ${index + 1}`;
}

function nodeReward(node: MapNodeSummary): string {
  return NODE_LABELS[node.type] ?? node.type.replace(/_/g, ' ');
}

function describeNode(snapshot: GameSnapshot, node: MapNodeSummary, includeLayer = false): string {
  const position = nodePosition(snapshot, node);
  const reward = nodeReward(node);
  const layer = includeLayer && node.layer !== undefined ? `, map row ${node.layer + 1}` : '';
  return `${position ? `${position} ` : ''}${reward}${layer}`;
}

function describeNodeAction(snapshot: GameSnapshot, node: MapNodeSummary): string {
  const position = nodePosition(snapshot, node);
  const action = NODE_ACTIONS[node.type] ?? `take the ${nodeReward(node)} node`;
  const reward = describeNode(snapshot, node);
  return position ? `${action} from the ${reward}` : action;
}

function scoreNode(node: MapNodeSummary, snapshot: GameSnapshot): { score: number; reasons: string[] } {
  const hp = teamHpRatio(snapshot);
  const teamOpenSlots = Math.max(0, 6 - snapshot.team.length);
  const earlyMap = (snapshot.currentMap ?? 0) <= 1;
  const smallTeam = snapshot.team.length <= 2;
  const readiness = estimateReadiness(snapshot);
  const reasons: string[] = [];
  let score = 20;

  switch (node.type) {
    case 'catch':
      if (snapshot.mode === 'nuzlocke') {
        score = 4;
        reasons.push('Nuzlocke restricts catch tempo; do not route for extra catches unless forced.');
      } else if (snapshot.mode === 'battle-tower') {
        score = 38 + teamOpenSlots * 5;
        reasons.push('Battle Tower catches are mainly trait and roster decisions.');
      } else {
        score = smallTeam ? 45 : earlyMap ? 24 : 30;
        if (teamOpenSlots === 0) score -= 8;
        reasons.push(smallTeam ? 'Early catches help form a minimum core.' : 'After a small core, leveling existing Pokemon is usually better tempo than another catch.');
      }
      break;
    case 'pokecenter':
      score = hp < 0.55 || hasFainted(snapshot) ? 80 : 25;
      reasons.push(hp < 0.55 || hasFainted(snapshot) ? 'Team health is low enough that healing is premium.' : 'Healing is less urgent while the team is healthy.');
      break;
    case 'item':
      score = snapshot.items.length <= 2 ? 55 : 42;
      reasons.push(snapshot.items.length <= 2 ? 'Low item count increases item-node value.' : 'Items remain useful but are not urgent.');
      break;
    case 'move_tutor':
      score = hasUnmasteredMoves(snapshot) ? (snapshot.mode === 'battle-tower' ? 52 : 64) : 18;
      reasons.push(hasUnmasteredMoves(snapshot) ? 'At least one active Pokemon can still improve its move tier.' : 'No obvious move-tier upgrade target right now.');
      break;
    case 'trainer':
      score = hp > 0.7 ? (snapshot.mode === 'normal' ? 62 : 54) : snapshot.mode === 'nuzlocke' ? 16 : 34;
      reasons.push(hp > 0.7 ? 'Trainer fights give stronger level tempo than wild battles.' : 'Trainer fights are risky while HP is low.');
      break;
    case 'battle':
      score = hp > 0.5 ? (snapshot.mode === 'normal' ? 48 : 38) : snapshot.mode === 'nuzlocke' ? 12 : 24;
      reasons.push(hp > 0.5 ? 'Wild battles give +1 level and improve boss readiness.' : 'Low HP makes generic battles less attractive.');
      break;
    case 'legendary':
      score = hp > 0.65 ? 70 : 35;
      reasons.push('Legendary encounters have high upside but should be approached with health in mind.');
      break;
    case 'trade':
      score = snapshot.mode === 'nuzlocke' ? 0 : 35;
      reasons.push(snapshot.mode === 'nuzlocke' ? 'Trades are not normally part of Nuzlocke routing.' : 'Trade value depends on current weakest team slot.');
      break;
    case 'silver':
      score = hp > 0.7 ? 58 : 22;
      reasons.push('Silver gives bonus XP but should be routed around if the team is fragile.');
      break;
    case 'boss':
      score = hp > 0.75 ? 40 : 10;
      reasons.push('Boss node is mandatory progression; prepare before entering if alternatives exist.');
      break;
    case 'question':
      score = 34;
      reasons.push('Mystery nodes are flexible but less predictable than known rewards.');
      break;
    default:
      reasons.push('Unknown node type; conservative score applied.');
  }

  if (snapshot.mode === 'battle-tower' && node.type === 'catch') {
    score += 10;
    reasons.push('Battle Tower catches can unlock or upgrade type traits.');
  }

  if (readiness.chance < 45 && ['battle', 'trainer', 'move_tutor', 'pokecenter', 'item'].includes(node.type)) {
    score += node.type === 'pokecenter' && hp > 0.8 ? 0 : 8;
    reasons.push(`Boss readiness is only about ${readiness.chance}%, so growth and setup matter.`);
  }

  if (snapshot.mode === 'nuzlocke' && hp < 0.6 && ['battle', 'trainer', 'silver', 'boss'].includes(node.type)) {
    score -= 15;
    reasons.push('Nuzlocke mode punishes fainting, so low-health fights are discounted.');
  }

  return { score, reasons };
}

type RouteScore = {
  score: number;
  route: MapNodeSummary[];
};

function bestRouteFrom(node: MapNodeSummary, snapshot: GameSnapshot, memo = new Map<string, RouteScore>()): RouteScore {
  const cached = memo.get(node.id);
  if (cached) return cached;

  const nodeById = new Map(snapshot.mapNodes.map((candidate) => [candidate.id, candidate]));
  const children = snapshot.mapEdges
    .filter((edge) => edge.from === node.id)
    .map((edge) => nodeById.get(edge.to))
    .filter((candidate): candidate is MapNodeSummary => Boolean(candidate && !candidate.visited));
  const current = scoreNode(node, snapshot).score;

  if (!children.length) {
    const result = { score: current, route: [node] };
    memo.set(node.id, result);
    return result;
  }

  const bestChild = children
    .map((child) => bestRouteFrom(child, snapshot, memo))
    .sort((a, b) => b.score - a.score)[0];
  const result = {
    score: current + bestChild.score * 0.72,
    route: [node, ...bestChild.route],
  };
  memo.set(node.id, result);
  return result;
}

function bestVisibleRoute(snapshot: GameSnapshot): RouteScore | null {
  if (!snapshot.accessibleNodes.length) return null;
  const memo = new Map<string, RouteScore>();
  return snapshot.accessibleNodes
    .map((node) => bestRouteFrom(node, snapshot, memo))
    .sort((a, b) => b.score - a.score)[0] ?? null;
}

function visibleRouteOptions(snapshot: GameSnapshot): RouteScore[] {
  if (!snapshot.accessibleNodes.length) return [];
  const memo = new Map<string, RouteScore>();
  return snapshot.accessibleNodes
    .map((node) => bestRouteFrom(node, snapshot, memo))
    .sort((a, b) => b.score - a.score);
}

function pathRecommendations(snapshot: GameSnapshot): Recommendation[] {
  if (!snapshot.accessibleNodes.length) return [];

  const ranked = snapshot.accessibleNodes
    .map((node) => ({ node, ...scoreNode(node, snapshot) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const label = describeNode(snapshot, best.node);

  return [
    {
      id: `path-${best.node.id}`,
      kind: 'path',
      title: `Next move: ${label}`,
      detail: `Click this next because it has the best immediate value from the visible choices.`,
      score: best.score,
      severity: best.score >= 55 ? 'good' : best.score <= 20 ? 'warning' : 'info',
      reasons: best.reasons,
      meta: {
        nodeId: best.node.id,
        routeNodeIds: [best.node.id],
        routeLabels: [describeNode(snapshot, best.node, true)],
      },
    },
  ];
}

function mapPlanRecommendations(snapshot: GameSnapshot): Recommendation[] {
  const options = visibleRouteOptions(snapshot);
  const route = options[0];
  if (!route) return [];

  const visibleSteps = route.route.slice(0, 6);
  const routeLabels = visibleSteps.map((node) => describeNode(snapshot, node, true));
  const hiddenCount = Math.max(0, route.route.length - visibleSteps.length);
  const routeLabel = `${routeLabels.join(' -> ')}${hiddenCount ? ` -> ${hiddenCount} more visible step${hiddenCount === 1 ? '' : 's'}` : ''}`;
  const alternateStarts = options
    .slice(1, 4)
    .map((option) => `${describeNode(snapshot, option.route[0])}: ${Math.round(option.score)}`);

  return [
    {
      id: `map-plan-${route.route.map((node) => node.id).join('-')}`,
      kind: 'map',
      title: 'Best visible route',
      detail: `Plan across the visible map: ${routeLabel}.`,
      score: route.score,
      severity: 'info',
      reasons: [
        'This looks beyond the next click and follows the strongest visible downstream rewards.',
        alternateStarts.length ? `Other next starts scored lower: ${alternateStarts.join(' | ')}.` : 'Only one visible start is currently available.',
        'Future catch choices, mystery results, and battle damage can change the plan.',
      ],
      meta: {
        nodeId: route.route[0]?.id,
        routeNodeIds: route.route.map((node) => node.id),
        routeLabels,
      },
    },
  ];
}

function readinessRecommendation(snapshot: GameSnapshot): Recommendation[] {
  if (!snapshot.team.length || snapshot.mode === 'unknown') return [];
  const readiness = estimateReadiness(snapshot);
  return [
    {
      id: 'readiness-estimate',
      kind: 'risk',
      title: `Estimated boss readiness: ${readiness.chance}%`,
      detail: `Planning against ${readiness.label}.`,
      score: readiness.chance < 45 ? 72 : 38,
      severity: readiness.chance < 35 ? 'danger' : readiness.chance < 55 ? 'warning' : 'info',
      reasons: readiness.reasons,
    },
  ];
}

function teamRecommendations(snapshot: GameSnapshot): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const hp = teamHpRatio(snapshot);

  if (!snapshot.team.length) {
    recommendations.push({
      id: 'state-no-team',
      kind: 'state',
      title: 'No active run detected',
      detail: 'Open Pokelike and start or continue a run, then reopen the companion.',
      score: 100,
      severity: 'warning',
      reasons: ['The extension did not find a parsed team in poke_current_run.'],
    });
    return recommendations;
  }

  if (snapshot.team.length < 3 && snapshot.mode === 'normal') {
    recommendations.push({
      id: 'team-open-slots',
      kind: 'team',
      title: 'Build a small core first',
      detail: `${3 - snapshot.team.length} more Pokemon gives enough coverage without over-skipping XP.`,
      score: 48,
      severity: 'info',
      reasons: ['After 3 reliable Pokemon, battles/trainers usually improve the run more than more catches.'],
    });
  } else if (snapshot.team.length < 6 && snapshot.mode === 'battle-tower') {
    recommendations.push({
      id: 'team-open-slots',
      kind: 'team',
      title: 'Fill with trait intent',
      detail: `${6 - snapshot.team.length} team slot${6 - snapshot.team.length === 1 ? '' : 's'} still open.`,
      score: 48,
      severity: 'info',
      reasons: ['In Battle Tower, extra members matter most when they create or upgrade type traits.'],
    });
  }

  if (hp < 0.5 || hasFainted(snapshot)) {
    recommendations.push({
      id: 'risk-low-hp',
      kind: 'risk',
      title: snapshot.mode === 'nuzlocke' ? 'High Nuzlocke danger' : 'Team health is low',
      detail: `Average team HP is ${Math.round(hp * 100)}%.`,
      score: 75,
      severity: snapshot.mode === 'nuzlocke' ? 'danger' : 'warning',
      reasons: ['Prefer healing, items, or lower-risk rewards before hard fights.'],
    });
  }

  if (hasUnmasteredMoves(snapshot)) {
    recommendations.push({
      id: 'setup-move-tier',
      kind: 'setup',
      title: 'Move upgrades are still available',
      detail: 'A Move Tutor node can improve at least one active Pokemon.',
      score: 42,
      severity: 'info',
      reasons: ['Move tier increases usually improve damage more reliably than random rewards.'],
    });
  }

  return recommendations;
}

function teamTypes(snapshot: GameSnapshot): Set<string> {
  return new Set(snapshot.team.flatMap((pokemon) => pokemon.types));
}

function scoreCatchChoice(choice: { label: string; detail?: string }, snapshot: GameSnapshot): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const types = (choice.detail?.match(/[A-Z][a-z]+/g) || []).filter((part) => (POKEMON_TYPES as readonly string[]).includes(part));
  const currentTypes = teamTypes(snapshot);
  const level = Number(choice.detail?.match(/Lv(\d+)/)?.[1] ?? 0);
  let score = 30 + Math.min(18, level / 2);

  const newTypes = types.filter((type) => !currentTypes.has(type));
  if (newTypes.length) {
    score += 16;
    reasons.push(`Adds new coverage: ${newTypes.join('/')}.`);
  }

  if (snapshot.mode === 'battle-tower') {
    for (const type of types) {
      const current = snapshot.traits.find((trait) => trait.type === type);
      if (!current || current.count % 2 === 1 || current.count < 2) {
        score += 14;
        reasons.push(`${type} may create or upgrade a Battle Tower trait.`);
      }
    }
  } else if (snapshot.team.length >= 3 && (snapshot.currentMap ?? 0) <= 1) {
    score -= 18;
    reasons.push('Early-game tempo favors leveling your core once you have 3 Pokemon.');
  }

  if (snapshot.mode === 'nuzlocke') {
    reasons.push('Nuzlocke catch choices are limited; prefer unique evo lines and immediate coverage.');
  }

  if (!reasons.length) reasons.push('Best visible mix of level and coverage among catch options.');
  return { score, reasons };
}

function scoreItemChoice(label: string, snapshot: GameSnapshot): { score: number; reasons: string[] } {
  const name = label.toLowerCase();
  const reasons: string[] = [];
  let score = 30;
  if (name.includes('tm') || name.includes('technical')) {
    score = 70;
    reasons.push('Move tier upgrades are premium because they convert directly into damage.');
  } else if (name.includes('rare candy')) {
    score = 66;
    reasons.push('Immediate levels improve boss readiness without taking damage.');
  } else if (name.includes('full restore') || name.includes('max revive')) {
    score = teamHpRatio(snapshot) < 0.7 || hasFainted(snapshot) ? 68 : 44;
    reasons.push('Healing items are strongest when the team is already damaged.');
  } else if (name.includes('leftovers') || name.includes('shell bell')) {
    score = 62;
    reasons.push('Sustain items protect long fights and Nuzlocke runs.');
  } else if (name.includes('life orb') || name.includes('choice') || name.includes('expert belt')) {
    score = 60;
    reasons.push('Damage items help secure faster KOs and reduce incoming turns.');
  } else if (name.includes('eviolite')) {
    score = 58;
    reasons.push('Eviolite is strong if you are carrying unevolved Pokemon.');
  } else if (name.includes('escape rope')) {
    score = snapshot.mode === 'nuzlocke' ? 5 : 50;
    reasons.push(snapshot.mode === 'nuzlocke' ? 'Escape Rope is not offered in Nuzlocke by the game.' : 'Escape Rope can save a non-boss loss.');
  } else {
    reasons.push('Useful reward, but compare it against XP or healing needs.');
  }
  return { score, reasons };
}

function bestMoveTutorTarget(snapshot: GameSnapshot) {
  return snapshot.team
    .filter((pokemon) => pokemon.currentHp > 0 && pokemon.moveTier < 2)
    .sort((a, b) => b.level - a.level || b.hpRatio - a.hpRatio)[0];
}

function actionScreenRecommendations(snapshot: GameSnapshot): Recommendation[] {
  const screen = snapshot.actionScreen;
  if (!screen || ['map-screen', 'title-screen'].includes(screen.id)) return [];

  if (screen.id === 'catch-screen') {
    if (!screen.choices.length) return [];
    const ranked = screen.choices
      .map((choice) => ({ choice, ...scoreCatchChoice(choice, snapshot) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    return [
      {
        id: `action-catch-${best.choice.index}`,
        kind: 'action',
        title: `Catch choice: ${best.choice.label}`,
        detail: best.choice.detail || 'Best visible catch option.',
        score: best.score,
        severity: best.score >= 55 ? 'good' : 'info',
        reasons: best.reasons,
      },
    ];
  }

  if (screen.id === 'item-screen') {
    if (!screen.choices.length) return [];
    const ranked = screen.choices
      .map((choice) => ({ choice, ...scoreItemChoice(choice.label, snapshot) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    return [
      {
        id: `action-item-${best.choice.index}`,
        kind: 'action',
        title: `Item pick: ${best.choice.label}`,
        detail: best.choice.detail || 'Best visible item option.',
        score: best.score,
        severity: best.score >= 60 ? 'good' : 'info',
        reasons: best.reasons,
      },
    ];
  }

  if (screen.id === 'item-equip-modal' || screen.id === 'usable-item-modal') {
    const item = screen.title || 'this item';
    return [
      {
        id: 'action-item-target',
        kind: 'action',
        title: `Use ${item} intentionally`,
        detail: screen.prompt || 'Choose the target that turns the item into immediate fight value.',
        score: 56,
        severity: 'info',
        reasons: [
          item.toLowerCase().includes('tm') ? 'TM-style upgrades should go to your strongest active attacker.' : 'Equip damage items to the Pokemon whose move type matches the item.',
          'Keep defensive/sustain items on Pokemon that are likely to take multiple hits.',
        ],
      },
    ];
  }

  if (screen.id === 'trade-screen') {
    const weakest = [...snapshot.team].sort((a, b) => a.level - b.level || a.hpRatio - b.hpRatio)[0];
    return [
      {
        id: 'action-trade',
        kind: 'action',
        title: weakest ? `Trade only if replacing ${weakest.name}` : 'Trade carefully',
        detail: 'Trades give a random Pokemon 3 levels higher, so they are best for replacing your weakest slot, not your core.',
        score: 46,
        severity: 'info',
        reasons: ['Decline if every team member has a clear role or held item investment.'],
      },
    ];
  }

  if (screen.id === 'swap-screen') {
    const weakest = [...snapshot.team].sort((a, b) => a.level - b.level || a.hpRatio - b.hpRatio)[0];
    return [
      {
        id: 'action-swap',
        kind: 'action',
        title: weakest ? `Compare against weakest slot: ${weakest.name}` : 'Evaluate the incoming Pokemon',
        detail: 'Swap only if the incoming Pokemon adds coverage, levels, or a Battle Tower trait upgrade.',
        score: 54,
        severity: 'info',
        reasons: [
          snapshot.mode === 'battle-tower' ? 'In Battle Tower, trait deltas can outweigh raw level.' : 'In normal mode, do not break a leveled core for a redundant catch.',
        ],
      },
    ];
  }

  if (screen.id === 'stat-buff-screen') {
    const carry = [...snapshot.team].sort((a, b) => b.level - a.level || b.hpRatio - a.hpRatio)[0];
    return [
      {
        id: 'action-stat-buff',
        kind: 'action',
        title: carry ? `Buff your carry: ${carry.name}` : 'Choose a carry to buff',
        detail: 'Permanent Battle Tower buffs are strongest on Pokemon you expect to keep through future stages.',
        score: 62,
        severity: 'good',
        reasons: ['Prioritize HP or the Pokemon’s main attacking stat before spreading points thinly.'],
      },
    ];
  }

  if (screen.id === 'battle-screen') {
    return [
      {
        id: 'action-battle',
        kind: 'action',
        title: 'Battle in progress',
        detail: 'Review HP after the battle resolves; the advisor will update automatically.',
        score: 30,
        severity: 'info',
        reasons: ['Skip/continue is safe from a strategy perspective once the battle has started.'],
      },
    ];
  }

  if (screen.id === 'elite-prep-screen') {
    return [
      {
        id: 'action-elite-prep',
        kind: 'action',
        title: 'Prep before the next Elite fight',
        detail: 'Reorder so your best matchup leads, then use healing or held items before continuing.',
        score: 72,
        severity: 'good',
        reasons: ['Elite prep is one of the few screens where order and item use can prevent a wipe.'],
      },
    ];
  }

  return [
    {
      id: `action-${screen.id}`,
      kind: 'action',
      title: screen.title || 'Current action screen',
      detail: screen.prompt || 'The companion detected an action screen.',
      score: 28,
      severity: 'info',
      reasons: screen.choices.length ? [`${screen.choices.length} visible choice(s) detected.`] : ['No structured choice advice for this screen yet.'],
    },
  ];
}

function traitRecommendations(snapshot: GameSnapshot): Recommendation[] {
  if (snapshot.mode !== 'battle-tower') return [];

  const active = snapshot.traits.filter((trait) => trait.tier > 0);
  if (!active.length) {
    return [
      {
        id: 'trait-none',
        kind: 'trait',
        title: 'No active Battle Tower traits yet',
        detail: 'Look for catches that create a two-count type pair.',
        score: 44,
        severity: 'info',
        reasons: ['Traits activate at 2 matching type counts; shiny Pokemon count double.'],
      },
    ];
  }

  return [
    {
      id: 'trait-active',
      kind: 'trait',
      title: 'Active Battle Tower traits',
      detail: active.map(formatTrait).join(' | '),
      score: 58,
      severity: 'good',
      reasons: ['Future catches should be evaluated by whether they preserve or upgrade these tiers.'],
    },
  ];
}

export function recommend(snapshot: GameSnapshot): Recommendation[] {
  const recommendations = [
    ...actionScreenRecommendations(snapshot),
    ...readinessRecommendation(snapshot),
    ...teamRecommendations(snapshot),
    ...traitRecommendations(snapshot),
    ...pathRecommendations(snapshot),
    ...mapPlanRecommendations(snapshot),
  ];

  for (const warning of snapshot.parserWarnings) {
    recommendations.push({
      id: `parser-${warning}`,
      kind: 'state',
      title: 'State parser warning',
      detail: warning,
      score: 10,
      severity: 'warning',
      reasons: ['The companion can continue, but this may reduce recommendation quality.'],
    });
  }

  return recommendations.sort((a, b) => b.score - a.score);
}
