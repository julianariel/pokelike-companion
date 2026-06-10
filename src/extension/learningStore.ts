import type { GameSnapshot, Recommendation } from '../core/types';

const EVENTS_KEY = 'pokelikeCompanion.learningEvents';
const LAST_SIGNATURE_KEY = 'pokelikeCompanion.lastLearningSignature';
const MAX_EVENTS = 300;

type LearningEventType = 'recommendation' | 'outcome';
type RunOutcome = 'win' | 'loss';

export type LearningEvent = {
  id: string;
  type: LearningEventType;
  capturedAt: string;
  mode: GameSnapshot['mode'];
  map?: number;
  screen?: string;
  teamSize: number;
  averageHp: number;
  nextMove?: string;
  route?: string[];
  outcome?: RunOutcome;
};

export type LearningStats = {
  samples: number;
  outcomes: number;
  wins: number;
  losses: number;
  winRate: number | null;
  lastEventAt?: string;
  lastOutcome?: RunOutcome;
  topNextMoves: Array<{ label: string; count: number }>;
};

function hasChromeStorage(): boolean {
  return typeof globalThis.chrome !== 'undefined' && typeof globalThis.chrome.storage?.local !== 'undefined';
}

async function readValue<T>(key: string, fallback: T): Promise<T> {
  if (hasChromeStorage()) {
    const result = await chrome.storage.local.get(key);
    return (result[key] as T | undefined) ?? fallback;
  }

  const raw = globalThis.localStorage?.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeValue<T>(key: string, value: T): Promise<void> {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [key]: value });
    return;
  }

  globalThis.localStorage?.setItem(key, JSON.stringify(value));
}

function averageHp(snapshot: GameSnapshot): number {
  if (!snapshot.team.length) return 0;
  return Math.round((snapshot.team.reduce((sum, pokemon) => sum + pokemon.hpRatio, 0) / snapshot.team.length) * 100);
}

function outcomeFromSnapshot(snapshot: GameSnapshot): RunOutcome | null {
  const screen = snapshot.actionScreen;
  const id = screen?.id.toLowerCase() ?? '';
  const title = screen?.title?.toLowerCase() ?? '';
  const prompt = screen?.prompt?.toLowerCase() ?? '';
  const text = `${id} ${title} ${prompt}`;

  if (text.includes('gameover') || text.includes('game over') || text.includes('defeat') || text.includes('wiped')) return 'loss';
  if (text.includes('win') || text.includes('victory') || text.includes('champion') || text.includes('clear')) return 'win';
  return null;
}

function eventSignature(snapshot: GameSnapshot, recommendations: Recommendation[], outcome: RunOutcome | null): string {
  const path = recommendations.find((recommendation) => recommendation.kind === 'path');
  const map = recommendations.find((recommendation) => recommendation.kind === 'map');
  const team = snapshot.team
    .map((pokemon) => `${pokemon.name}:${pokemon.level}:${pokemon.currentHp}/${pokemon.maxHp}`)
    .join('|');
  return [
    outcome ?? 'recommendation',
    snapshot.mode,
    snapshot.currentMap ?? 'no-map',
    snapshot.actionScreen?.id ?? 'no-screen',
    path?.id ?? 'no-path',
    map?.id ?? 'no-map-plan',
    team,
  ].join('::');
}

function buildEvent(snapshot: GameSnapshot, recommendations: Recommendation[], outcome: RunOutcome | null): LearningEvent | null {
  const path = recommendations.find((recommendation) => recommendation.kind === 'path');
  const map = recommendations.find((recommendation) => recommendation.kind === 'map');

  if (!outcome && !path && !map) return null;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: outcome ? 'outcome' : 'recommendation',
    capturedAt: snapshot.capturedAt ?? new Date().toISOString(),
    mode: snapshot.mode,
    map: snapshot.currentMap,
    screen: snapshot.actionScreen?.id,
    teamSize: snapshot.team.length,
    averageHp: averageHp(snapshot),
    nextMove: path?.title,
    route: map?.meta?.routeLabels,
    outcome: outcome ?? undefined,
  };
}

export function summarizeLearningEvents(events: LearningEvent[]): LearningStats {
  const outcomes = events.filter((event) => event.type === 'outcome');
  const wins = outcomes.filter((event) => event.outcome === 'win').length;
  const losses = outcomes.filter((event) => event.outcome === 'loss').length;
  const nextMoveCounts = new Map<string, number>();
  const lastEvent = events.length ? events[events.length - 1] : undefined;
  const lastOutcome = outcomes.length ? outcomes[outcomes.length - 1] : undefined;

  for (const event of events) {
    if (!event.nextMove) continue;
    nextMoveCounts.set(event.nextMove, (nextMoveCounts.get(event.nextMove) ?? 0) + 1);
  }

  return {
    samples: events.filter((event) => event.type === 'recommendation').length,
    outcomes: outcomes.length,
    wins,
    losses,
    winRate: outcomes.length ? Math.round((wins / outcomes.length) * 100) : null,
    lastEventAt: lastEvent?.capturedAt,
    lastOutcome: lastOutcome?.outcome,
    topNextMoves: [...nextMoveCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 3),
  };
}

export async function getLearningStats(): Promise<LearningStats> {
  const events = await readValue<LearningEvent[]>(EVENTS_KEY, []);
  return summarizeLearningEvents(events);
}

export async function recordLearningSnapshot(snapshot: GameSnapshot, recommendations: Recommendation[]): Promise<LearningStats> {
  if (snapshot.source === 'empty') return getLearningStats();

  const outcome = outcomeFromSnapshot(snapshot);
  const signature = eventSignature(snapshot, recommendations, outcome);
  const lastSignature = await readValue<string | null>(LAST_SIGNATURE_KEY, null);
  const events = await readValue<LearningEvent[]>(EVENTS_KEY, []);

  if (signature === lastSignature) return summarizeLearningEvents(events);

  const event = buildEvent(snapshot, recommendations, outcome);
  if (!event) return summarizeLearningEvents(events);

  const nextEvents = [...events, event].slice(-MAX_EVENTS);
  await writeValue(EVENTS_KEY, nextEvents);
  await writeValue(LAST_SIGNATURE_KEY, signature);
  return summarizeLearningEvents(nextEvents);
}
