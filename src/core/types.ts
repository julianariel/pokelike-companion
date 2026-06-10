export type NodeType =
  | 'start'
  | 'battle'
  | 'catch'
  | 'item'
  | 'question'
  | 'boss'
  | 'pokecenter'
  | 'trainer'
  | 'legendary'
  | 'move_tutor'
  | 'trade'
  | 'silver'
  | string;

export type PokemonSummary = {
  speciesId?: number;
  name: string;
  level: number;
  types: string[];
  baseStats?: {
    hp?: number;
    atk?: number;
    def?: number;
    speed?: number;
    special?: number;
    spdef?: number;
  };
  currentHp: number;
  maxHp: number;
  hpRatio: number;
  isShiny: boolean;
  moveTier: number;
  heldItemName?: string;
};

export type MapNodeSummary = {
  id: string;
  type: NodeType;
  layer?: number;
  col?: number;
  accessible: boolean;
  visited: boolean;
};

export type MapEdgeSummary = {
  from: string;
  to: string;
};

export type GameMode = 'normal' | 'nuzlocke' | 'battle-tower' | 'unknown';

export type TraitTier = {
  type: string;
  count: number;
  tier: number;
  nextThreshold: number | null;
  description?: string;
  nextDescription?: string;
  role?: string;
};

export type ScreenChoice = {
  index: number;
  label: string;
  detail?: string;
  kind?: string;
};

export type ActionScreen = {
  id: string;
  title?: string;
  prompt?: string;
  choices: ScreenChoice[];
};

export type GameSnapshot = {
  source: 'live-extension' | 'manual' | 'empty';
  capturedAt?: string;
  url?: string;
  mode: GameMode;
  currentMap?: number;
  badges?: number;
  team: PokemonSummary[];
  items: string[];
  mapNodes: MapNodeSummary[];
  mapEdges: MapEdgeSummary[];
  accessibleNodes: MapNodeSummary[];
  traits: TraitTier[];
  actionScreen?: ActionScreen;
  endless?: {
    stageNumber?: number;
    regionNumber?: number;
    mapIndexInRegion?: number;
  };
  parserWarnings: string[];
};

export type RawPokelikeState = {
  currentRun?: string | null;
  endlessState?: string | null;
  actionScreen?: ActionScreen | null;
  capturedAt?: string;
  url?: string;
};

export type RecommendationKind = 'path' | 'map' | 'team' | 'trait' | 'risk' | 'setup' | 'state' | 'action';

export type Recommendation = {
  id: string;
  kind: RecommendationKind;
  title: string;
  detail: string;
  score: number;
  severity: 'info' | 'good' | 'warning' | 'danger';
  reasons: string[];
  meta?: {
    nodeId?: string;
    routeNodeIds?: string[];
    routeLabels?: string[];
  };
};
