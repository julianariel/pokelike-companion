import { computeTraitTiers } from './traits';
import type { ActionScreen, GameMode, GameSnapshot, MapEdgeSummary, MapNodeSummary, PokemonSummary, RawPokelikeState, ScreenChoice } from './types';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function parseJson(value: string | null | undefined, label: string, warnings: string[]): UnknownRecord | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (isRecord(parsed)) return parsed;
    warnings.push(`${label} was present but not an object.`);
    return null;
  } catch {
    warnings.push(`${label} could not be parsed as JSON.`);
    return null;
  }
}

function normalizePokemon(value: unknown, index: number): PokemonSummary | null {
  if (!isRecord(value)) return null;

  const maxHp = Math.max(1, asNumber(value.maxHp, asNumber(value.currentHp, 1)));
  const currentHp = Math.max(0, Math.min(maxHp, asNumber(value.currentHp, maxHp)));
  const rawTypes = Array.isArray(value.types) ? value.types : [];
  const heldItem = isRecord(value.heldItem) ? value.heldItem : null;
  const baseStats = isRecord(value.baseStats)
    ? {
        hp: typeof value.baseStats.hp === 'number' ? value.baseStats.hp : undefined,
        atk: typeof value.baseStats.atk === 'number' ? value.baseStats.atk : undefined,
        def: typeof value.baseStats.def === 'number' ? value.baseStats.def : undefined,
        speed: typeof value.baseStats.speed === 'number' ? value.baseStats.speed : undefined,
        special: typeof value.baseStats.special === 'number' ? value.baseStats.special : undefined,
        spdef: typeof value.baseStats.spdef === 'number' ? value.baseStats.spdef : undefined,
      }
    : undefined;

  return {
    speciesId: typeof value.speciesId === 'number' ? value.speciesId : undefined,
    name: asString(value.nickname, asString(value.name, `Pokemon ${index + 1}`)),
    level: asNumber(value.level, 1),
    types: rawTypes.map((type) => String(type)).filter(Boolean),
    baseStats,
    currentHp,
    maxHp,
    hpRatio: currentHp / maxHp,
    isShiny: Boolean(value.isShiny),
    moveTier: asNumber(value.moveTier, 1),
    heldItemName: heldItem ? asString(heldItem.name, asString(heldItem.id)) : undefined,
  };
}

function normalizeNodes(run: UnknownRecord | null): MapNodeSummary[] {
  const map = isRecord(run?.map) ? run.map : null;
  const nodes = isRecord(map?.nodes) ? map.nodes : null;
  if (!nodes) return [];

  const normalized: MapNodeSummary[] = [];
  for (const [id, node] of Object.entries(nodes)) {
    if (isRecord(node)) {
      normalized.push({
        id,
        type: asString(node.type, 'unknown'),
        layer: typeof node.layer === 'number' ? node.layer : undefined,
        col: typeof node.col === 'number' ? node.col : undefined,
        accessible: Boolean(node.accessible),
        visited: Boolean(node.visited),
      });
    }
  }
  return normalized;
}

function normalizeEdges(run: UnknownRecord | null): MapEdgeSummary[] {
  const map = isRecord(run?.map) ? run.map : null;
  const edges = Array.isArray(map?.edges) ? map.edges : [];
  return edges
    .map((edge) => {
      if (!isRecord(edge)) return null;
      const from = asString(edge.from);
      const to = asString(edge.to);
      if (!from || !to) return null;
      return { from, to };
    })
    .filter((edge): edge is MapEdgeSummary => Boolean(edge));
}

function normalizeItems(run: UnknownRecord | null): string[] {
  const items = Array.isArray(run?.items) ? run.items : [];
  return items
    .map((item) => {
      if (typeof item === 'string') return item;
      if (isRecord(item)) return asString(item.name, asString(item.id));
      return '';
    })
    .filter(Boolean);
}

function normalizeActionScreen(value: unknown): ActionScreen | undefined {
  if (!isRecord(value)) return undefined;
  const id = asString(value.id);
  if (!id) return undefined;
  const choices = Array.isArray(value.choices)
    ? value.choices
        .map((choice, index): ScreenChoice | null => {
          if (!isRecord(choice)) return null;
          const label = asString(choice.label);
          if (!label) return null;
          return {
            index: typeof choice.index === 'number' ? choice.index : index,
            label,
            detail: asString(choice.detail),
            kind: asString(choice.kind),
          };
        })
        .filter((choice): choice is ScreenChoice => Boolean(choice))
    : [];
  return {
    id,
    title: asString(value.title),
    prompt: asString(value.prompt),
    choices,
  };
}

function getSavedCatchChoices(run: UnknownRecord | null): ScreenChoice[] {
  const savedCatch = isRecord(run?.savedCatch) ? run.savedCatch : null;
  const instances = Array.isArray(savedCatch?.instances) ? savedCatch.instances : [];
  const choices: ScreenChoice[] = [];
  for (let index = 0; index < instances.length; index++) {
    const normalized = normalizePokemon(instances[index], index);
    if (normalized) {
      choices.push({
        index,
        kind: 'catch-pokemon',
        label: normalized.name,
        detail: `Lv${normalized.level} · ${normalized.types.join('/')} · HP ${normalized.currentHp}/${normalized.maxHp}`,
      });
    }
  }
  return choices;
}

function buildActionScreen(raw: RawPokelikeState, run: UnknownRecord | null): ActionScreen | undefined {
  const base = normalizeActionScreen(raw.actionScreen);
  if (!base) return undefined;

  if (base.id === 'catch-screen') {
    const savedCatchChoices = getSavedCatchChoices(run);
    if (savedCatchChoices.length) return { ...base, choices: savedCatchChoices };
  }

  return base;
}

function detectMode(run: UnknownRecord | null, endless: UnknownRecord | null): GameMode {
  if (!run) return 'unknown';
  if (Boolean(run.isEndlessMode) || Boolean(endless?.active)) return 'battle-tower';
  if (Boolean(run.nuzlockeMode)) return 'nuzlocke';
  return 'normal';
}

export function parsePokelikeState(raw: RawPokelikeState): GameSnapshot {
  const parserWarnings: string[] = [];
  const run = parseJson(raw.currentRun, 'poke_current_run', parserWarnings);
  const endless = parseJson(raw.endlessState, 'poke_endless_state', parserWarnings);

  if (!run) {
    return {
      source: raw.currentRun || raw.endlessState ? 'manual' : 'empty',
      capturedAt: raw.capturedAt,
      url: raw.url,
      mode: 'unknown',
      team: [],
      items: [],
      mapNodes: [],
      mapEdges: [],
      accessibleNodes: [],
      traits: [],
      actionScreen: normalizeActionScreen(raw.actionScreen),
      parserWarnings,
    };
  }

  const team = (Array.isArray(run.team) ? run.team : [])
    .map((pokemon, index) => normalizePokemon(pokemon, index))
    .filter((pokemon): pokemon is PokemonSummary => Boolean(pokemon));

  const mapNodes = normalizeNodes(run);
  const mapEdges = normalizeEdges(run);
  const accessibleNodes = mapNodes.filter((node) => node.accessible && !node.visited);
  const mode = detectMode(run, endless);

  return {
    source: 'live-extension',
    capturedAt: raw.capturedAt,
    url: raw.url,
    mode,
    currentMap: typeof run.currentMap === 'number' ? run.currentMap : undefined,
    badges: typeof run.badges === 'number' ? run.badges : undefined,
    team,
    items: normalizeItems(run),
    mapNodes,
    mapEdges,
    accessibleNodes,
    traits: mode === 'battle-tower' ? computeTraitTiers(team) : [],
    actionScreen: buildActionScreen(raw, run),
    endless: endless
      ? {
          stageNumber: typeof endless.stageNumber === 'number' ? endless.stageNumber : undefined,
          regionNumber: typeof endless.regionNumber === 'number' ? endless.regionNumber : undefined,
          mapIndexInRegion: typeof endless.mapIndexInRegion === 'number' ? endless.mapIndexInRegion : undefined,
        }
      : undefined,
    parserWarnings,
  };
}
