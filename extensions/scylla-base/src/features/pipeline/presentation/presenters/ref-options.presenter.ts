import type { SearchSelectOption } from '@scylla/ui';
import { t } from '@scylla/ui/i18n';
import type { GitRef } from '@base/features/integrations';
import { runMessages } from '../messages/run.messages.ts';
import { toValue } from '../mappers/commit-ref.mapper.ts';
import { shortSha } from './pipeline-file.presenter.ts';

export type RefOptionKind = GitRef['kind'] | 'sha';

export interface RefOption extends SearchSelectOption {
  kind: RefOptionKind;
}

/** The value of the row that opens the SHA field. */
export const SHA_OPTION = toValue({ kind: 'sha', sha: '' });

const rank = (ref: GitRef) => (ref.kind === 'branch' ? 0 : 1);

const hintOf = (ref: GitRef): string =>
  [
    ...(ref.sha
      ? [ref.kind === 'branch' ? t(runMessages.head(shortSha(ref.sha))) : shortSha(ref.sha)]
      : []),
    ...(ref.defaultBranch ? [t(runMessages.defaultRef)] : []),
  ].join(' · ');

/** The rows of a picker: the default branch first, then the branches, then the tags. */
export const refOptions = (refs: readonly GitRef[]): RefOption[] =>
  [...refs]
    .sort((a, b) => Number(b.defaultBranch) - Number(a.defaultBranch) || rank(a) - rank(b))
    .map(ref => ({
      value: toValue({ kind: ref.kind, name: ref.name }),
      label: ref.name,
      kind: ref.kind,
      hint: hintOf(ref),
      keywords: [ref.sha],
    }));

/** The rows of the Run dialog: the refs, then the row of a commit SHA. */
export const runTargetOptions = (refs: readonly GitRef[]): RefOption[] => [
  ...refOptions(refs),
  {
    value: SHA_OPTION,
    label: t(runMessages.useSha),
    kind: 'sha',
    hint: t(runMessages.shaPlaceholder),
  },
];
