import { t } from '@scylla/ui/i18n';
import type { StepTemplate } from '@base/features/pipeline/domain/structs/step-template.struct.ts';
import type {
  CatalogEntry,
  CatalogText,
} from '@base/features/pipeline/presentation/utils/node-catalog.ts';
import { stepPreview } from '@base/features/pipeline/presentation/utils/step-summary.ts';
import { blueprintMessages } from './blueprint.messages.ts';

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

export const CATALOG_GROUP_TITLES = {
  steps: blueprintMessages.steps,
  templates: blueprintMessages.templates,
} as const;
