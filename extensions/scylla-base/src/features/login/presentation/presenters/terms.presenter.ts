import { t } from '@scylla/ui/i18n';
import type { LegalDocument } from '@platform/legal';
import { formatDay } from '@shared/utils/date-utils.ts';
import type { TermsStatus } from '@base/features/login/domain/structs/terms-status.struct.ts';
import type { TermsRefusal } from '../mappers/terms-refusal.mapper.ts';
import { termsMessages as m } from '../messages/terms.messages.ts';

/** The text of a refusal of the server: the terms changed. `inForm`: in the sign-up form. */
export const termsChangedText = ({ currentVersion }: TermsRefusal, inForm: boolean): string => {
  if (inForm) {
    return currentVersion ? t(m.changedInForm(currentVersion)) : t(m.changedInFormNoVersion);
  }
  return currentVersion ? t(m.changed(currentVersion)) : t(m.changedNoVersion);
};

/** What the terms step shows above its box. */
export interface TermsStepView {
  /** The user accepted an earlier version: the step tells what changed. */
  update: boolean;
  title: string;
  description: string;
  /** "Version 2.0", or empty. */
  version: string;
  /** "Takes effect on 1 Jan 2027", or empty. */
  effectiveOn: string;
  /** What changes in the new version, one item for each line. Empty: no list. */
  changes: string[];
}

/** A list mark at the start of a line: `-`, `*`, `+` or `•`, then a space. */
const LIST_MARK = /^[-*+•]\s+/;

/** The items of a text of what changes: one for each line that is not empty, with no list mark. */
export const changeItems = (text: string): string[] =>
  text
    .split('\n')
    .map(line => line.trim().replace(LIST_MARK, ''))
    .filter(line => line !== '');

/** The first acceptance, or the acceptance of a new version of `terms`. */
export const termsStepView = (
  status: TermsStatus,
  terms: LegalDocument | undefined,
): TermsStepView => {
  const update = status.accepted !== null;
  const version = terms?.version ?? '';
  // A day with no time: noon in UTC is the same day in each time zone.
  const effectiveDate = terms?.effectiveDate;
  return {
    update,
    title: t(update ? m.updateTitle : m.firstTitle),
    description: t(update ? m.updateDescription : m.firstDescription),
    version: update && version ? t(m.version(version)) : '',
    effectiveOn:
      update && effectiveDate ? t(m.effectiveOn(formatDay(`${effectiveDate}T12:00:00Z`))) : '',
    changes: update && terms ? changeItems(terms.changes) : [],
  };
};
