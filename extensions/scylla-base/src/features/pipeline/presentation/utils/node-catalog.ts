import type { MessageDescriptor } from '@lingui/core';
import type { StepDefinition } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';

/** Text written by the app is a descriptor; text from a template is shown as is. */
export type CatalogText = string | MessageDescriptor;

export type CatalogGroup = 'steps' | 'templates';

/** What the palette and the quick-add menu offer: a blank kind of step, or a template. */
export interface CatalogEntry {
  id: string;
  group: CatalogGroup;
  name: CatalogText;
  detail: CatalogText;
  /** A template's icon hint; a blank step shows the icon of its kind. */
  icon?: string;
  nodeId: string;
  definition: StepDefinition;
}

const GROUP_ORDER: readonly CatalogGroup[] = ['steps', 'templates'];

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

/** The entries by group, in the palette's order. An empty group is left out. */
export const groupCatalog = (entries: readonly CatalogEntry[]) =>
  GROUP_ORDER.map(group => ({
    group,
    items: entries.filter(entry => entry.group === group),
  })).filter(({ items }) => items.length > 0);
