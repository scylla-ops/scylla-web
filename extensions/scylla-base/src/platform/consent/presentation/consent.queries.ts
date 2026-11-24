import { getQueryClient, mutationOptions, queryOptions } from '@scylla/core-sdk';
import { i18n } from '@lingui/core';
import { toast } from '@scylla/ui/utils';
import { consentRepository } from '../consent-repository.ts';
import {
  grantedPurposes,
  type ConsentChoice,
  type ConsentState,
  type RecordConsentInput,
} from '../domain/structs/consent-choice.struct.ts';
import { applyGrants } from './consent.loaders.ts';
import { consentMessages as messages } from './messages/consent.messages.ts';
import { consentFrame } from './presenters/consent.presenter.ts';

export const CONSENT_STATE_QUERY_KEY = () => ['consent-state'] as const;

/** Applies a new choice: the trackers of a refused purpose go, and the accepted ones load. */
const apply = async (choice: ConsentChoice, input: RecordConsentInput): Promise<void> => {
  const client = getQueryClient();
  const before = client.getQueryData<ConsentState>(CONSENT_STATE_QUERY_KEY());
  const state = { choice, globalPrivacyControl: before?.globalPrivacyControl ?? false };
  client.setQueryData(CONSENT_STATE_QUERY_KEY(), state);

  const refused = new Set(
    Object.entries(input.grants)
      .filter(([, granted]) => !granted)
      .map(([purpose]) => purpose),
  );
  const trackers = consentFrame().trackers.filter(tracker => refused.has(tracker.consent));
  await consentRepository().forget(trackers);
  // A script that ran stays in the page: a new load of the page stops it.
  if (applyGrants(grantedPurposes(state, input.version, new Date())).length > 0) {
    window.location.reload();
  }
};

export const consentQueries = {
  /** The choice of this browser and its Global Privacy Control: the browser holds them. */
  state: () =>
    queryOptions({
      queryKey: CONSENT_STATE_QUERY_KEY(),
      queryFn: () => consentRepository().state(),
      staleTime: Infinity,
    }),
};

export const consentMutations = {
  /** Public: the server records the choice, with the user of the session when there is one. */
  save: () =>
    mutationOptions({
      mutationFn: (input: RecordConsentInput) => consentRepository().record(input),
      onSuccess: async (choice, input) => {
        await apply(choice, input);
        toast.success(i18n._(messages.saved));
      },
    }),
};
