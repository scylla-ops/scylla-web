import type { MessageDescriptor } from '@lingui/core';
import { t } from '@scylla/ui/i18n';
import type {
  LayoutSize,
  WidgetData,
} from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import { catalogMessages as m } from '@base/features/dashboard/presentation/messages/catalog.messages.ts';
import { editorMessages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';

/** A way to show data, as the palette lists it. */
export type WidgetKind =
  | 'sentence'
  | 'list'
  | 'timeline'
  | 'ratio'
  | 'bars'
  | 'status-band'
  | 'capacity'
  | 'health'
  | 'line'
  | 'ranking'
  | 'heatmap'
  | 'activity'
  | 'quick-actions'
  | 'agent'
  | 'pipeline'
  | 'triggers'
  | 'integrations';

export interface KindEntry {
  kind: WidgetKind;
  group: 'kinds' | 'dedicated';
  title: MessageDescriptor;
  text: MessageDescriptor;
  /** Empty: the kind has no data that a route gives yet. */
  data: readonly WidgetData[];
}

export interface DataEntry {
  data: WidgetData;
  kind: WidgetKind;
  title: MessageDescriptor;
  hint: MessageDescriptor;
  /** The sizes that the widget can show, the default first. */
  sizes: readonly LayoutSize[];
}

const entry = (
  kind: WidgetKind,
  group: KindEntry['group'],
  title: MessageDescriptor,
  text: MessageDescriptor,
  data: readonly WidgetData[] = [],
): KindEntry => ({ kind, group, title, text, data });

/** The kinds in the order of the design. */
export const KINDS: readonly KindEntry[] = [
  entry('sentence', 'kinds', m.sentence, m.sentenceText, ['summary']),
  entry('list', 'kinds', m.list, m.listText, ['needs-you']),
  entry('timeline', 'kinds', m.timeline, m.timelineText, ['last-24-hours']),
  entry('ratio', 'kinds', m.ratio, m.ratioText, ['success-rate']),
  entry('bars', 'kinds', m.bars, m.barsText, ['runs', 'run-minutes']),
  entry('status-band', 'kinds', m.statusBand, m.statusBandText, ['right-now']),
  entry('capacity', 'kinds', m.capacity, m.capacityText, ['agents']),
  entry('health', 'kinds', m.health, m.healthText, ['pipelines']),
  entry('line', 'kinds', m.line, m.lineText, ['run-duration']),
  entry('ranking', 'kinds', m.ranking, m.rankingText),
  entry('heatmap', 'kinds', m.heatmap, m.heatmapText),
  entry('activity', 'kinds', m.activity, m.activityText, ['activity']),
  entry('quick-actions', 'kinds', m.quickActions, m.quickActionsText, ['quick-actions']),
  entry('agent', 'dedicated', m.agent, m.agentText),
  entry('pipeline', 'dedicated', m.pipeline, m.pipelineText),
  entry('triggers', 'dedicated', m.triggers, m.triggersText),
  entry('integrations', 'dedicated', m.integrations, m.integrationsText),
];

export const DATA: Readonly<Record<WidgetData, DataEntry>> = {
  summary: { data: 'summary', kind: 'sentence', title: m.summary, hint: m.summaryHint, sizes: ['l', 'm'] },
  'needs-you': { data: 'needs-you', kind: 'list', title: m.needsYou, hint: m.needsYouHint, sizes: ['l', 'm'] },
  'last-24-hours': { data: 'last-24-hours', kind: 'timeline', title: m.lastDay, hint: m.lastDayHint, sizes: ['m', 'l'] },
  'success-rate': { data: 'success-rate', kind: 'ratio', title: m.successRate, hint: m.successRateHint, sizes: ['s', 'xs', 'm'] },
  runs: { data: 'runs', kind: 'bars', title: m.runs, hint: m.runsHint, sizes: ['m', 'l'] },
  'run-minutes': { data: 'run-minutes', kind: 'bars', title: m.runMinutes, hint: m.runMinutesHint, sizes: ['xs'] },
  'run-duration': { data: 'run-duration', kind: 'line', title: m.runDuration, hint: m.runDurationHint, sizes: ['m', 'xs'] },
  'right-now': { data: 'right-now', kind: 'status-band', title: m.rightNow, hint: m.rightNowHint, sizes: ['m', 'xs'] },
  agents: { data: 'agents', kind: 'capacity', title: m.agents, hint: m.agentsHint, sizes: ['s', 'xs'] },
  pipelines: { data: 'pipelines', kind: 'health', title: m.pipelines, hint: m.pipelinesHint, sizes: ['m', 'l'] },
  activity: { data: 'activity', kind: 'activity', title: m.jobEnds, hint: m.jobEndsHint, sizes: ['m', 'l'] },
  'quick-actions': { data: 'quick-actions', kind: 'quick-actions', title: m.actions, hint: m.actionsHint, sizes: ['m'] },
};

export const kindOf = (kind: WidgetKind): KindEntry =>
  KINDS.find(item => item.kind === kind) ?? KINDS[0];

/** The palette entries whose title or data match the search. */
export const searchKinds = (query: string): KindEntry[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...KINDS];
  return KINDS.filter(
    item =>
      t(item.title).toLowerCase().includes(needle) ||
      item.data.some(data => t(DATA[data].title).toLowerCase().includes(needle)),
  );
};

/** A stored size that the widget cannot show becomes its default size. */
export const shownSize = (data: WidgetData, size: LayoutSize): LayoutSize =>
  DATA[data].sizes.includes(size) ? size : DATA[data].sizes[0];

export const SIZE_ORDER: readonly LayoutSize[] = ['xs', 's', 'm', 'l'];

const SIZE_LABELS = {
  xs: editorMessages.sizeXs,
  s: editorMessages.sizeS,
  m: editorMessages.sizeM,
  l: editorMessages.sizeL,
} as const;

/** The cells of a size on the grid of 8 columns. */
export const SIZE_CELLS: Readonly<Record<LayoutSize, { columns: number; rows: number }>> = {
  xs: { columns: 2, rows: 1 },
  s: { columns: 2, rows: 2 },
  m: { columns: 4, rows: 2 },
  l: { columns: 4, rows: 4 },
};

export const sizeLabel = (size: LayoutSize): string => t(SIZE_LABELS[size]);

/** "2 × 2" */
export const cellsText = (size: LayoutSize): string =>
  `${SIZE_CELLS[size].columns} × ${SIZE_CELLS[size].rows}`;

/** "XS" */
export const sizeShort = (size: LayoutSize): string => size.toUpperCase();
