import { createMutation } from '@scylla/core-sdk';
import { appMutations, trimSecretLabel, type AppSecretEntity } from '@base/features/apps';
import { createSecretLabelInput } from './secret-label-input.state.svelte.ts';

/** The rename of one secret. The other secrets of the agent hold their labels. */
export const createRenameSecret = (
  secret: () => AppSecretEntity | null,
  secrets: () => readonly AppSecretEntity[],
) => {
  const rename = createMutation(() => appMutations.setSecretLabel(secret()?.appId ?? ''));
  const label = createSecretLabelInput(
    () => secret()?.label ?? '',
    () =>
      secrets()
        .filter(other => other.id !== secret()?.id)
        .map(other => other.label),
  );
  const unchanged = $derived(trimSecretLabel(label.value) === (secret()?.label ?? ''));

  return {
    get label() {
      return label;
    },
    get isPending() {
      return rename.isPending;
    },
    get canSave() {
      return label.valid && !unchanged && !rename.isPending;
    },
    /** `onDone` runs once CE stored the label. A taken label stays in the field, with its error. */
    save: (onDone: () => void) => {
      const target = secret();
      if (!target || !label.valid || unchanged || rename.isPending) return;
      const sent = trimSecretLabel(label.value);
      rename.mutate(
        { secretId: target.id, label: sent },
        {
          onSuccess: renamed => {
            if (renamed) onDone();
            else label.refuse(sent);
          },
        },
      );
    },
    clear: () => {
      label.reset();
      rename.reset();
    },
  };
};

export type RenameSecret = ReturnType<typeof createRenameSecret>;
