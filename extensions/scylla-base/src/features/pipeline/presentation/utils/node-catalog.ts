import type { MessageDescriptor } from '@lingui/core';
import type { StepDefinition } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import type { StepTemplate } from '@base/features/pipeline/domain/structs/step-template.struct.ts';
import { t } from '@scylla/ui/i18n';
import { blueprintMessages } from '../ui/editor/blueprint/blueprint.messages.ts';
import { stepPreview } from './step-summary.ts';

/** The `DataTransfer` type of an entry dragged from the palette: its value is the entry id. */
export const CATALOG_DRAG_TYPE = 'application/x-scylla-step';

/** Text written by the app is a descriptor; text from a template is shown as is. */
export type CatalogText = string | MessageDescriptor;

/** What the palette and the quick-add menu offer: a blank kind of step, or a template. */
export interface CatalogEntry {
  id: string;
  group: 'steps' | 'templates';
  name: CatalogText;
  detail: CatalogText;
  /** A template's icon hint; a blank step shows the icon of its kind. */
  icon?: string;
  nodeId: string;
  definition: StepDefinition;
}

export const BLANK_STEPS: readonly CatalogEntry[] = [
  {
    id: 'kind:bash',
    group: 'steps',
    name: blueprintMessages.bashScript,
    detail: blueprintMessages.bashScriptDetail,
    nodeId: 'script',
    definition: { kind: 'script', shell: 'bash', script: '', env: [] },
  },
  {
    id: 'kind:sh',
    group: 'steps',
    name: blueprintMessages.shScript,
    detail: blueprintMessages.shScriptDetail,
    nodeId: 'script',
    definition: { kind: 'script', shell: 'sh', script: '', env: [] },
  },
  {
    id: 'kind:exec',
    group: 'steps',
    name: blueprintMessages.command,
    detail: blueprintMessages.commandDetail,
    nodeId: 'command',
    definition: { kind: 'exec', command: '', args: [], env: [] },
  },
];

export const catalogEntries = (templates: readonly StepTemplate[]): CatalogEntry[] => [
  ...BLANK_STEPS,
  ...templates.map(
    (template): CatalogEntry => ({
      id: `template:${template.id}`,
      group: 'templates',
      name: template.name,
      detail: stepPreview(template.definition),
      icon: template.icon,
      nodeId: template.nodeId,
      definition: template.definition,
    }),
  ),
];

/** Reactive to a locale switch, like `t()`. */
export const catalogText = (text: CatalogText): string =>
  typeof text === 'string' ? text : t(text);

/** `resolve` translates a descriptor: the search matches what the viewer reads. */
export const searchCatalog = (
  entries: readonly CatalogEntry[],
  query: string,
  resolve: (text: CatalogText) => string,
): CatalogEntry[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...entries];

  return entries.filter(entry =>
    `${resolve(entry.name)} ${resolve(entry.detail)}`.toLowerCase().includes(needle),
  );
};
