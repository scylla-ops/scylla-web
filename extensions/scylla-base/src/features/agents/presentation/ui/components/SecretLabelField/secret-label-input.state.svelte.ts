import { secretLabelIssue, trimSecretLabel, type SecretLabelIssue } from '@base/features/apps';

/**
 * A secret label field. It shows `suggested` until the user edits it, and checks the CE rules
 * and the labels of `taken`. `refuse` keeps a label that CE refused (`ALREADY_EXISTS`) as taken
 * until the value changes.
 */
export const createSecretLabelInput = (
  suggested: () => string,
  taken: () => readonly string[] = () => [],
) => {
  /** `null` while the field follows `suggested`. */
  let edited = $state<string | null>(null);
  let refused = $state<string | null>(null);
  let refusals = $state(0);

  const value = $derived(edited ?? suggested());
  const problem = $derived<SecretLabelIssue | null>(
    refused !== null && refused === trimSecretLabel(value)
      ? 'taken'
      : secretLabelIssue(value, taken()),
  );

  return {
    get value() {
      return value;
    },
    set value(next: string) {
      edited = next;
    },
    /** CE accepts it. */
    get valid() {
      return problem === null;
    },
    /** Shown once the user edited the field or CE refused it: a suggestion is not an error. */
    get problem(): SecretLabelIssue | null {
      return edited === null && refused === null ? null : problem;
    },
    /** Counts the refusals: the field takes the focus back at each one. */
    get refusals() {
      return refusals;
    },
    refuse: (label: string) => {
      edited = label;
      refused = label;
      refusals += 1;
    },
    reset: () => {
      edited = null;
      refused = null;
    },
  };
};

export type SecretLabelInput = ReturnType<typeof createSecretLabelInput>;
