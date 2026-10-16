import { createMutation, createQuery } from '@scylla/core-sdk';
import {
  appMutations,
  appQueries,
  suggestSecretLabel,
  trimSecretLabel,
  type ResetAppSecret,
} from '@base/features/apps';
import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
import { createSecretLabelInput } from '../SecretLabelField/secret-label-input.state.svelte.ts';

/** What became of the secrets that existed before the reset. */
export type ResetOutcome =
  | { kind: 'revoked'; labels: string[] }
  | { kind: 'kept'; labels: string[] }
  | { kind: 'failed' }
  | { kind: 'none' };

export const resetOutcomeOf = (result: ResetAppSecret): ResetOutcome => {
  if (result.failed.length > 0) return { kind: 'failed' };
  if (result.revoked.length > 0) {
    return { kind: 'revoked', labels: result.revoked.map(secret => secret.label) };
  }
  if (result.kept.length > 0)
    return { kind: 'kept', labels: result.kept.map(secret => secret.label) };
  return { kind: 'none' };
};

/**
 * The two steps of a reset: name the new secret and confirm, then show it once. The secret lives
 * only in `result`, and `clear` drops it with the mutation that returned it. The suggested name
 * is the last hostname of the agent, else its name.
 */
export const createResetSecret = (agent: () => AgentEntity | null) => {
  const agentId = $derived(agent()?.id ?? '');

  const secretsQuery = createQuery(() => appQueries.secretsOf(agentId));
  const reset = createMutation(() => appMutations.resetSecret(agentId));

  let revokeOthers = $state(true);
  let result = $state<ResetAppSecret | null>(null);

  const secrets = $derived(secretsQuery.data ?? []);
  const takenLabels = $derived(secrets.map(secret => secret.label));
  const label = createSecretLabelInput(
    () =>
      suggestSecretLabel({
        preferred: agent()?.host?.hostname ?? '',
        fallback: agent()?.name ?? '',
        taken: takenLabels,
      }),
    () => takenLabels,
  );

  return {
    get secrets() {
      return secrets;
    },
    /** The label of the new secret. */
    get label() {
      return label;
    },
    get revokeOthers() {
      return revokeOthers;
    },
    set revokeOthers(value: boolean) {
      revokeOthers = value;
    },
    get result() {
      return result;
    },
    get outcome(): ResetOutcome | null {
      return result ? resetOutcomeOf(result) : null;
    },
    get isPending() {
      return reset.isPending;
    },
    get canConfirm() {
      return label.valid && !reset.isPending;
    },
    confirm: () => {
      if (!label.valid || reset.isPending) return;
      const sent = trimSecretLabel(label.value);
      reset.mutate(
        { label: sent, revokeOthers },
        {
          onSuccess: data => {
            if (data) result = data;
            else label.refuse(sent);
          },
        },
      );
    },
    clear: () => {
      result = null;
      revokeOthers = true;
      label.reset();
      reset.reset();
    },
  };
};

export type ResetSecret = ReturnType<typeof createResetSecret>;
