import type { MessageDescriptor } from '@lingui/core';
import { t } from '@scylla/ui/i18n';
import type { NodeTemplateEntity } from '@base/features/pipeline/domain/entities/node-template.entity.ts';
import {
  blankCase,
  blankDefinition,
  type NodeDefinition,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { blueprintMessages } from '../messages/blueprint.messages.ts';
import { nodePreview } from './node-summary.presenter.ts';
import { nodeMessages } from '../messages/node.messages.ts';

/** Text written by the app is a descriptor; text from a template is shown as is. */
export type CatalogText = string | MessageDescriptor;

export type CatalogGroup = 'nodes' | 'flow' | 'templates';

/** What the palette and the quick-add menu offer: a blank kind of node, or a template. */
export interface CatalogEntry {
  id: string;
  group: CatalogGroup;
  name: CatalogText;
  detail: CatalogText;
  /** A template's icon hint; a blank node shows the icon of its kind. */
  icon?: string;
  nodeId: string;
  definition: NodeDefinition;
}

const GROUP_ORDER: readonly CatalogGroup[] = ['nodes', 'flow', 'templates'];

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

/** What a node runs: its script, or its command and arguments. Its env and folder do not count. */
const codeOf = (definition: NodeDefinition): string => {
  if (definition.kind === 'script') return `script\u0000${definition.script.trim()}`;
  if (definition.kind === 'exec')
    return `exec\u0000${[definition.command.trim(), ...definition.args].join('\u0000')}`;
  // A switch and a merge run nothing: no template has their code.
  return definition.kind;
};

/** The template whose code a node runs exactly: the node is shown with its icon. */
export const templateFor = (
  entries: readonly CatalogEntry[],
  definition: NodeDefinition,
): CatalogEntry | undefined => {
  const code = codeOf(definition);
  return entries.find(entry => entry.group === 'templates' && codeOf(entry.definition) === code);
};

export const BLANK_NODES: readonly CatalogEntry[] = [
  {
    id: 'kind:bash',
    group: 'nodes',
    name: blueprintMessages.bashScript,
    detail: blueprintMessages.bashScriptDetail,
    nodeId: 'script',
    definition: blankDefinition('script', 'bash'),
  },
  {
    id: 'kind:sh',
    group: 'nodes',
    name: blueprintMessages.shScript,
    detail: blueprintMessages.shScriptDetail,
    nodeId: 'script',
    definition: blankDefinition('script', 'sh'),
  },
  {
    id: 'kind:exec',
    group: 'nodes',
    name: nodeMessages.command,
    detail: blueprintMessages.commandDetail,
    nodeId: 'command',
    definition: blankDefinition('exec'),
  },
  {
    id: 'kind:if',
    group: 'flow',
    name: blueprintMessages.ifNode,
    detail: blueprintMessages.ifDetail,
    nodeId: 'if',
    definition: {
      env: [],
      kind: 'switch',
      cases: [blankCase('true')],
      otherwise: 'false',
      allMatches: false,
    },
  },
  {
    id: 'kind:switch',
    group: 'flow',
    name: blueprintMessages.switchNode,
    detail: blueprintMessages.switchDetail,
    nodeId: 'switch',
    definition: blankDefinition('switch'),
  },
  {
    id: 'kind:merge',
    group: 'flow',
    name: blueprintMessages.mergeNode,
    detail: blueprintMessages.mergeDetail,
    nodeId: 'merge',
    definition: blankDefinition('merge'),
  },
];

export const catalogEntries = (templates: readonly NodeTemplateEntity[]): CatalogEntry[] => [
  ...BLANK_NODES,
  ...templates.map(
    (template): CatalogEntry => ({
      id: `template:${template.id}`,
      group: 'templates',
      name: template.name,
      detail: nodePreview(template.definition),
      icon: template.icon,
      nodeId: template.nodeId,
      definition: template.definition,
    }),
  ),
];

/** Reactive to a locale switch, like `t()`. */
export const catalogText = (text: CatalogText): string =>
  typeof text === 'string' ? text : t(text);

export const CATALOG_GROUP_TITLES = {
  nodes: blueprintMessages.nodes,
  flow: blueprintMessages.flow,
  templates: blueprintMessages.templates,
} as const;
