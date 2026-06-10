import {
  Activity,
  AlertTriangle,
  Brain,
  CircleHelp,
  Compass,
  Crosshair,
  Download,
  HeartPulse,
  Map as MapIcon,
  RefreshCw,
  Route,
  Shield,
  Sparkles,
  Swords,
  Table2,
  Trash2,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { parsePokelikeState } from '../core/parseState';
import { recommend } from '../core/strategy';
import { POKEMON_TYPES, summarizeAttackType, type PokemonType } from '../core/typeChart';
import type { GameSnapshot, RawPokelikeState, Recommendation } from '../core/types';
import { readPokelikeStateFromActiveTab } from './chromeState';
import { clearLearningEvents, getLearningEvents, getLearningStats, recordLearningSnapshot, type LearningStats } from './learningStore';
import './popup.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; raw: RawPokelikeState }
  | { status: 'error'; message: string };

type TabKey = 'advisor' | 'team' | 'types' | 'guide';

const TABS: Array<{ key: TabKey; label: string; icon: typeof Crosshair }> = [
  { key: 'advisor', label: 'Advisor', icon: Crosshair },
  { key: 'team', label: 'Team', icon: Users },
  { key: 'types', label: 'Types', icon: Table2 },
  { key: 'guide', label: 'Guide', icon: Compass },
];

const GUIDE_SECTIONS = [
  {
    title: 'Route Priorities',
    points: [
      'Low HP raises Pokemon Center value and lowers fight value.',
      'Open team slots make Catch nodes stronger than most neutral rewards.',
      'Move Tutor is best when a healthy Pokemon still has an unmastered move.',
      'Mystery nodes are flexible, but known rewards are easier to plan around.',
    ],
  },
  {
    title: 'Nuzlocke Notes',
    points: [
      'Fainting risk matters more than raw reward value.',
      'Prefer healing and item safety before optional trainers.',
      'Avoid Silver or generic fights when average HP is low.',
    ],
  },
  {
    title: 'Battle Tower Notes',
    points: [
      'Traits activate at 2 matching type counts.',
      'Tiers upgrade at 4 and 6 matching type counts.',
      'Shiny Pokemon count double for each of their types.',
      'Do not judge catches only by species power; trait deltas can matter more.',
    ],
  },
];

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

function modeLabel(snapshot: GameSnapshot): string {
  if (snapshot.mode === 'battle-tower') {
    const stage = snapshot.endless?.stageNumber ? ` Stage ${snapshot.endless.stageNumber}` : '';
    const region = snapshot.endless?.regionNumber ? ` R${snapshot.endless.regionNumber}` : '';
    return `Battle Tower${stage}${region}`;
  }
  if (snapshot.mode === 'nuzlocke') return 'Nuzlocke';
  if (snapshot.mode === 'normal') return 'Normal';
  return 'No run';
}

function severityClass(recommendation: Recommendation): string {
  return `recommendation pixel-panel recommendation--${recommendation.severity}`;
}

function RecommendationIcon({ recommendation }: { recommendation: Recommendation }) {
  if (recommendation.kind === 'path') return <MapIcon size={16} />;
  if (recommendation.kind === 'map') return <Route size={16} />;
  if (recommendation.kind === 'trait') return <Sparkles size={16} />;
  if (recommendation.kind === 'risk') return <AlertTriangle size={16} />;
  if (recommendation.kind === 'setup') return <Activity size={16} />;
  return <Shield size={16} />;
}

function SectionHeader({ title, help }: { title: string; help: string }) {
  return (
    <header className="section-header">
      <div className="section-header-main">
        <div className="panel-title">{title}</div>
        <span className="info-icon" title={help} aria-label={help}>
          <CircleHelp size={13} />
        </span>
      </div>
      <p className="section-help">{help}</p>
    </header>
  );
}

function StatTile({ label, value, title }: { label: string; value: string | number; title?: string }) {
  return (
    <div className="stat-tile" title={title}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TypePill({ type }: { type: string }) {
  return <span className={`type-pill type-${type.toLowerCase()}`}>{type}</span>;
}

function TeamList({ snapshot }: { snapshot: GameSnapshot }) {
  if (!snapshot.team.length) {
    return <div className="empty pixel-panel">No team found.</div>;
  }

  return (
    <div className="team-list">
      {snapshot.team.map((pokemon, index) => (
        <div className="pokemon-row pixel-panel" key={`${pokemon.speciesId ?? pokemon.name}-${index}`}>
          <div className="pokemon-main">
            <div className="pokemon-name">
              {pokemon.isShiny ? '★ ' : ''}
              {pokemon.name}
            </div>
            <div className="pokemon-meta">
              Lv{pokemon.level} · Move T{pokemon.moveTier + 1}
              {pokemon.heldItemName ? ` · ${pokemon.heldItemName}` : ''}
            </div>
            <div className="type-row">
              {pokemon.types.map((type) => (
                <TypePill type={type} key={type} />
              ))}
            </div>
          </div>
          <div className={pokemon.hpRatio < 0.35 ? 'hp hp--low' : 'hp'}>
            <HeartPulse size={13} />
            {pokemon.currentHp}/{pokemon.maxHp}
          </div>
        </div>
      ))}
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  return (
    <section className={severityClass(recommendation)}>
      <div className="recommendation-head">
        <RecommendationIcon recommendation={recommendation} />
        <h3>{recommendation.title}</h3>
      </div>
      <p>{recommendation.detail}</p>
      {recommendation.meta?.routeLabels?.length ? (
        <ol className="route-steps" aria-label="Recommended route steps">
          {recommendation.meta.routeLabels.map((label, index) => (
            <li key={`${recommendation.id}-${label}`}>
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      ) : null}
      <ul>
        {recommendation.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </section>
  );
}

function nodeRewardLabel(type: string): string {
  return NODE_LABELS[type] ?? type.replace(/_/g, ' ');
}

function nodeLane(snapshot: GameSnapshot, nodeId: string): string {
  const node = snapshot.mapNodes.find((candidate) => candidate.id === nodeId);
  if (!node || node.layer === undefined) return '';
  const peers = snapshot.mapNodes
    .filter((candidate) => candidate.layer === node.layer)
    .sort((a, b) => (a.col ?? 0) - (b.col ?? 0) || a.id.localeCompare(b.id));
  if (peers.length <= 1) return '';

  const index = peers.findIndex((candidate) => candidate.id === nodeId);
  const labelsBySize: Record<number, string[]> = {
    2: ['left', 'right'],
    3: ['left', 'middle', 'right'],
    4: ['far left', 'left center', 'right center', 'far right'],
  };
  return labelsBySize[peers.length]?.[index] ?? `choice ${index + 1}`;
}

function MapOverview({ snapshot, routeNodeIds = [] }: { snapshot: GameSnapshot; routeNodeIds?: string[] }) {
  if (!snapshot.mapNodes.length) {
    return <div className="empty pixel-panel">No visible map nodes found yet.</div>;
  }

  const routeIds = new Set(routeNodeIds);
  const accessibleIds = new Set(snapshot.accessibleNodes.map((node) => node.id));
  const grouped = new Map<number, typeof snapshot.mapNodes>();
  for (const node of snapshot.mapNodes) {
    const row = node.layer ?? 0;
    grouped.set(row, [...(grouped.get(row) ?? []), node]);
  }

  const rows = [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .map(([row, nodes]) => ({
      row,
      nodes: [...nodes].sort((a, b) => (a.col ?? 0) - (b.col ?? 0) || a.id.localeCompare(b.id)),
    }));

  return (
    <div className="map-overview pixel-panel">
      {rows.map(({ row, nodes }) => (
        <div className="map-row" key={row}>
          <div className="map-row-label">Row {row + 1}</div>
          <div className="map-node-list">
            {nodes.map((node) => {
              const lane = nodeLane(snapshot, node.id);
              const state = node.visited ? 'visited' : accessibleIds.has(node.id) ? 'next' : routeIds.has(node.id) ? 'planned' : 'future';
              const className = `map-node map-node--${state}`;
              return (
                <span className={className} title={`${nodeRewardLabel(node.type)} ${state}`} key={node.id}>
                  {lane ? `${lane} ` : ''}
                  {nodeRewardLabel(node.type)}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Recommendations({
  recommendations,
  emptyText = 'No recommendations yet.',
}: {
  recommendations: Recommendation[];
  emptyText?: string;
}) {
  if (!recommendations.length) {
    return <div className="empty pixel-panel">{emptyText}</div>;
  }

  return (
    <div className="recommendation-list">
      {recommendations.map((recommendation) => (
        <RecommendationCard recommendation={recommendation} key={recommendation.id} />
      ))}
    </div>
  );
}

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function LearningPanel({
  stats,
  onExport,
  onClear,
}: {
  stats: LearningStats | null;
  onExport: () => void;
  onClear: () => void;
}) {
  if (!stats) {
    return <div className="empty pixel-panel">Learning log is warming up.</div>;
  }

  return (
    <div className="learning-panel pixel-panel">
      <div className="learning-actions">
        <button className="mini-tool-button" type="button" onClick={onExport} title="Export local learning history as JSON">
          <Download size={13} />
          Export
        </button>
        <button className="mini-tool-button mini-tool-button--danger" type="button" onClick={onClear} title="Clear local learning history">
          <Trash2 size={13} />
          Clear
        </button>
      </div>
      <div className="learning-grid">
        <StatTile label="Samples" value={stats.samples} title="Deduplicated recommendation states saved locally." />
        <StatTile label="Outcomes" value={stats.outcomes} title="Detected win/loss screens saved locally." />
        <StatTile label="Win Rate" value={stats.winRate === null ? '-' : `${stats.winRate}%`} title="Calculated only from detected win/loss screens." />
        <StatTile label="Last" value={stats.lastOutcome ?? 'none'} title="Most recent detected outcome." />
      </div>
      <div className="learning-note">
        <Brain size={14} />
        <span>Local only. This history stays in Chrome extension storage and is used to tune future advice.</span>
      </div>
      {stats.topNextMoves.length ? (
        <ul className="learning-moves">
          {stats.topNextMoves.map((move) => (
            <li key={move.label}>
              {move.label} <span>{move.count}x</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function TraitPanel({ snapshot }: { snapshot: GameSnapshot }) {
  if (snapshot.mode !== 'battle-tower') {
    return (
      <div className="empty pixel-panel">
        Battle Tower traits appear here when the active run is in Battle Tower mode.
      </div>
    );
  }

  if (!snapshot.traits.length) {
    return <div className="empty pixel-panel">No matching type pairs yet.</div>;
  }

  return (
    <div className="trait-grid">
      {snapshot.traits.map((trait) => (
        <div className={trait.tier > 0 ? 'trait-chip pixel-panel trait-chip--active' : 'trait-chip pixel-panel'} key={trait.type}>
          <strong>{trait.type}</strong>
          <span>
            {trait.tier > 0 ? `Tier ${trait.tier}` : 'inactive'} · {trait.count}
            {trait.nextThreshold ? `/${trait.nextThreshold}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

function AdvisorTab({
  snapshot,
  actionRecommendations,
  nextMoveRecommendations,
  mapPlanRecommendations,
  alertRecommendations,
  learningStats,
  onExportLearning,
  onClearLearning,
}: {
  snapshot: GameSnapshot;
  actionRecommendations: Recommendation[];
  nextMoveRecommendations: Recommendation[];
  mapPlanRecommendations: Recommendation[];
  alertRecommendations: Recommendation[];
  learningStats: LearningStats | null;
  onExportLearning: () => void;
  onClearLearning: () => void;
}) {
  return (
    <>
      {snapshot.source === 'empty' && (
        <section className="notice pixel-panel">
          <Swords size={16} />
          <div>Open a live Pokelike run, then refresh this panel.</div>
        </section>
      )}

      <section className="panel">
        <SectionHeader
          title="Current Decision"
          help="Advice for non-map decisions like catch choices, item picks, swaps, trades, move tutor, battle prep, and stat buffs."
        />
        <Recommendations recommendations={actionRecommendations} emptyText="No special action-screen advice right now." />
      </section>

      <section className="panel">
        <SectionHeader
          title="Best Next Click"
          help="The one map node to click now, scored from current health, mode, team size, items, and reward type."
        />
        <Recommendations recommendations={nextMoveRecommendations} emptyText="No clickable map choice found." />
      </section>

      <section className="panel">
        <SectionHeader
          title="Visible Map Plan"
          help="The broader route through currently visible nodes. It is a plan, not a lock, because battles, catches, and mystery nodes can change the next best choice."
        />
        <Recommendations recommendations={mapPlanRecommendations} emptyText="Map route planning will appear once a run map is visible." />
        <MapOverview snapshot={snapshot} routeNodeIds={mapPlanRecommendations[0]?.meta?.routeNodeIds} />
      </section>

      <section className="panel">
        <SectionHeader
          title="Run Notes"
          help="General team, setup, parser, and risk warnings that may affect the next choice."
        />
        <Recommendations recommendations={alertRecommendations} emptyText="No urgent run notes." />
      </section>

      <section className="panel">
        <SectionHeader
          title="Learning Log"
          help="Local history of recommendation states and detected run outcomes. This is the base for future win-rate tuning."
        />
        <LearningPanel stats={learningStats} onExport={onExportLearning} onClear={onClearLearning} />
      </section>
    </>
  );
}

function TeamTab({ snapshot, traitRecommendations }: { snapshot: GameSnapshot; traitRecommendations: Recommendation[] }) {
  return (
    <>
      <section className="panel">
        <SectionHeader
          title="Team Status"
          help="Current team as read from Pokelike localStorage, including HP, level, types, held item, and move tier."
        />
        <TeamList snapshot={snapshot} />
      </section>

      <section className="panel">
        <SectionHeader title="Battle Tower Traits" help="Type traits activate at 2 matching counts and upgrade at 4 and 6." />
        <TraitPanel snapshot={snapshot} />
        <Recommendations recommendations={traitRecommendations} emptyText="No trait advice yet." />
      </section>
    </>
  );
}

function TypeChartTab() {
  const [attackType, setAttackType] = useState<PokemonType>('Water');
  const summary = summarizeAttackType(attackType);

  return (
    <>
      <section className="panel">
        <SectionHeader
          title="Attack Type"
          help="Pick the type your Pokemon attacks with. The chart shows which defending types take more, less, or no damage."
        />
        <div className="type-selector pixel-panel">
          {POKEMON_TYPES.map((type) => (
            <button
              className={type === attackType ? `type-button type-${type.toLowerCase()} type-button--active` : `type-button type-${type.toLowerCase()}`}
              type="button"
              onClick={() => setAttackType(type)}
              key={type}
            >
              {type}
            </button>
          ))}
        </div>
      </section>

      <section className="type-matchups">
        <div className="matchup-card pixel-panel matchup-card--good">
          <h3>Hits hard</h3>
          <div className="type-row">
            {summary.superEffective.map((type) => (
              <TypePill type={type} key={type} />
            ))}
          </div>
        </div>
        <div className="matchup-card pixel-panel matchup-card--warn">
          <h3>Resisted by</h3>
          <div className="type-row">
            {summary.resisted.map((type) => (
              <TypePill type={type} key={type} />
            ))}
          </div>
        </div>
        <div className="matchup-card pixel-panel matchup-card--danger">
          <h3>No effect</h3>
          <div className="type-row">
            {summary.immune.length ? summary.immune.map((type) => <TypePill type={type} key={type} />) : <span className="muted">None</span>}
          </div>
        </div>
      </section>
    </>
  );
}

function GuideTab() {
  return (
    <div className="guide-list">
      {GUIDE_SECTIONS.map((section) => (
        <section className="guide-card pixel-panel" key={section.title}>
          <h3>{section.title}</h3>
          <ul>
            {section.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function Popup() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [refreshCount, setRefreshCount] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>('advisor');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
      try {
        const raw = await readPokelikeStateFromActiveTab();
        if (!cancelled) setLoadState({ status: 'ready', raw });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to read Pokelike state.';
        if (!cancelled) setLoadState({ status: 'error', message });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshCount]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(() => {
      setRefreshCount((count) => count + 1);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [autoRefresh]);

  const snapshot = useMemo(() => {
    if (loadState.status !== 'ready') return null;
    return parsePokelikeState(loadState.raw);
  }, [loadState]);

  const recommendations = useMemo(() => (snapshot ? recommend(snapshot) : []), [snapshot]);
  const actionRecommendations = recommendations.filter((recommendation) => recommendation.kind === 'action');
  const nextMoveRecommendations = recommendations.filter((recommendation) => recommendation.kind === 'path');
  const mapPlanRecommendations = recommendations.filter((recommendation) => recommendation.kind === 'map');
  const traitRecommendations = recommendations.filter((recommendation) => recommendation.kind === 'trait');
  const alertRecommendations = recommendations.filter((recommendation) => ['risk', 'setup', 'team', 'state'].includes(recommendation.kind));

  useEffect(() => {
    let cancelled = false;

    async function updateLearning() {
      const stats = snapshot ? await recordLearningSnapshot(snapshot, recommendations) : await getLearningStats();
      if (!cancelled) setLearningStats(stats);
    }

    void updateLearning();
    return () => {
      cancelled = true;
    };
  }, [snapshot, recommendations]);

  async function handleExportLearning() {
    const events = await getLearningEvents();
    downloadJson(`pokelike-companion-learning-${new Date().toISOString().slice(0, 10)}.json`, {
      exportedAt: new Date().toISOString(),
      eventCount: events.length,
      events,
    });
  }

  async function handleClearLearning() {
    setLearningStats(await clearLearningEvents());
  }

  return (
    <main className="shell">
      <header className="topbar pixel-panel topbar--framed">
        <div>
          <div className="eyebrow">Pokelike</div>
          <h1>Companion</h1>
        </div>
        <button
          className="icon-button"
          type="button"
          title="Refresh state"
          onClick={() => setRefreshCount((count) => count + 1)}
        >
          <RefreshCw size={16} />
        </button>
      </header>

      <div className="live-row pixel-panel">
        <button
          className={autoRefresh ? 'live-toggle live-toggle--on' : 'live-toggle'}
          type="button"
          onClick={() => setAutoRefresh((enabled) => !enabled)}
          title="Automatically reread the active Pokelike tab."
        >
          {autoRefresh ? 'LIVE ON' : 'LIVE OFF'}
        </button>
        <span>{snapshot?.actionScreen?.title || snapshot?.actionScreen?.id?.replace(/-/g, ' ') || 'Watching active tab'}</span>
      </div>

      {snapshot && (
        <section className="summary">
          <StatTile label="Mode" value={modeLabel(snapshot)} title="Detected from the current Pokelike run." />
          <StatTile label="Map" value={snapshot.currentMap !== undefined ? snapshot.currentMap + 1 : '—'} />
          <StatTile label="Team" value={`${snapshot.team.length}/6`} />
          <StatTile label="Screen" value={snapshot.actionScreen?.id ? snapshot.actionScreen.id.replace('-screen', '').replace(/-/g, ' ') : `${snapshot.items.length} items`} />
        </section>
      )}

      <nav className="tabbar pixel-panel" aria-label="Companion sections">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button className={activeTab === tab.key ? 'tab tab--active' : 'tab'} type="button" onClick={() => setActiveTab(tab.key)} key={tab.key}>
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {loadState.status === 'loading' && <div className="loading pixel-panel">Reading active tab...</div>}

      {loadState.status === 'error' && (
        <section className="notice notice--warning pixel-panel">
          <AlertTriangle size={16} />
          <div>{loadState.message}</div>
        </section>
      )}

      {snapshot && activeTab === 'advisor' && (
        <AdvisorTab
          snapshot={snapshot}
          nextMoveRecommendations={nextMoveRecommendations}
          mapPlanRecommendations={mapPlanRecommendations}
          actionRecommendations={actionRecommendations}
          alertRecommendations={alertRecommendations}
          learningStats={learningStats}
          onExportLearning={handleExportLearning}
          onClearLearning={handleClearLearning}
        />
      )}
      {snapshot && activeTab === 'team' && <TeamTab snapshot={snapshot} traitRecommendations={traitRecommendations} />}
      {activeTab === 'types' && <TypeChartTab />}
      {activeTab === 'guide' && <GuideTab />}
    </main>
  );
}
