import { t } from '@scylla/ui/i18n';
import {
  runsStep,
  type Operand,
  type PipelineNodeEntity,
  type SwitchRule,
} from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { formatDuration } from '@shared/utils/date-utils.ts';
import { nodeMessages } from '../messages/node.messages.ts';
import { testLabel } from './switch-form.presenter.ts';

/** A field of the node and its value, as a read-only view shows it. */
export interface DetailRow {
  label: string;
  value: string;
  /** A value of the file, such as a folder or an image: shown as code. */
  code?: true;
}

/** What the node runs, as one text to read and to copy. */
export interface CodeDetail {
  title: string;
  text: string;
}

export interface EnvDetail {
  key: string;
  /** The value, or the name of the secret. */
  value: string;
  secret: boolean;
}

export interface CaseDetail {
  port: string;
  /** All the rules, or one of them. */
  match: string;
  rules: string[];
}

/** Each field of a node, read only: the code, the settings, the environment and the cases. */
export interface NodeDetails {
  code?: CodeDetail;
  rows: DetailRow[];
  env: EnvDetail[];
  cases: CaseDetail[];
  /** A switch that opens the port of each case that matches, not only the first one. */
  allMatches?: string;
}

const PLAIN_WORD = /^[\w@%+=:,./-]+$/;

/** An argument with a space or a quote is quoted, so the line reads as a shell takes it. */
const shellWord = (word: string): string =>
  PLAIN_WORD.test(word) ? word : `'${word.replaceAll("'", `'"'"'`)}'`;

const operandText = (operand: Operand): string => {
  if (operand.kind === 'var') return '$' + operand.name;
  if (operand.kind === 'output') return `${operand.node}.${operand.key}`;
  return JSON.stringify(operand.value);
};

const ruleText = ({ left, test, right }: SwitchRule): string =>
  [operandText(left), testLabel(test), ...(right ? [operandText(right)] : [])].join(' ');

const codeOf = (node: PipelineNodeEntity): CodeDetail | undefined => {
  if (node.kind === 'script')
    return { title: `${t(nodeMessages.script)} · ${node.shell}`, text: node.script };
  if (node.kind === 'exec')
    return {
      title: t(nodeMessages.command),
      text: [node.command, ...node.args.map(shellWord)].join(' '),
    };
  return undefined;
};

const rowsOf = (node: PipelineNodeEntity): DetailRow[] => {
  if (node.kind === 'switch')
    return node.otherwise === undefined
      ? []
      : [{ label: t(nodeMessages.otherwisePort), value: node.otherwise, code: true }];
  if (!runsStep(node)) return [];
  return [
    ...(node.workingDir
      ? [{ label: t(nodeMessages.workingDirectory), value: node.workingDir, code: true as const }]
      : []),
    node.image
      ? { label: t(nodeMessages.containerImage), value: node.image, code: true }
      : { label: t(nodeMessages.containerImage), value: t(nodeMessages.noContainer) },
    {
      label: t(nodeMessages.timeout),
      value: node.timeoutSeconds ? formatDuration(node.timeoutSeconds) : t(nodeMessages.noTimeout),
    },
    { label: t(nodeMessages.retries), value: String(node.retries ?? 0) },
  ];
};

const envOf = (node: PipelineNodeEntity): EnvDetail[] =>
  node.kind === 'merge'
    ? []
    : node.env.map(entry =>
        entry.kind === 'secret'
          ? { key: entry.key, value: entry.secretRef, secret: true }
          : { key: entry.key, value: entry.value, secret: false },
      );

/** Reads `t()`: called in a `$derived`, it follows a locale switch. */
export const nodeDetails = (node: PipelineNodeEntity): NodeDetails => ({
  code: codeOf(node),
  rows: rowsOf(node),
  env: envOf(node),
  cases:
    node.kind === 'switch'
      ? node.cases.map(({ port, combinator, rules }) => ({
          port,
          match: t(combinator === 'all' ? nodeMessages.combinatorAll : nodeMessages.combinatorAny),
          rules: rules.map(ruleText),
        }))
      : [],
  ...(node.kind === 'switch' && node.allMatches && { allMatches: t(nodeMessages.allMatches) }),
});
