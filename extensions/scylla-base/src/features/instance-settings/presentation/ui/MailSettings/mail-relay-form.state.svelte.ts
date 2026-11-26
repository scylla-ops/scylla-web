import { t } from '@scylla/ui/i18n';
import type {
  MailSettings,
  UpdateMailSettingsInput,
} from '@base/features/instance-settings/domain/entities/mail-settings.entity.ts';
import type { MailProvider } from '@base/features/instance-settings/domain/structs/mail-provider.struct.ts';
import * as relayDraft from '@base/features/instance-settings/presentation/mappers/mail-relay-draft.mapper.ts';

export type MailRelayForm = ReturnType<typeof createMailRelayForm>;

/**
 * The draft of the relay over the settings of the server. A wrong field shows its error after the
 * field loses the focus, or after a save.
 */
export const createMailRelayForm = (settings: () => MailSettings) => {
  /** What the admin typed. `null`: the values of the server. */
  let typed = $state<relayDraft.MailRelayDraft | null>(null);
  let tried = $state(false);
  let touched = $state<relayDraft.MailRelayField[]>([]);

  const shown = $derived(typed ?? relayDraft.toDraft(settings().relay));
  const issues = $derived(relayDraft.draftIssues(shown, settings().relay));
  const changed = $derived(typed !== null && !relayDraft.sameAsServer(shown, settings().relay));

  return {
    get shown() {
      return shown;
    },
    get changed() {
      return changed;
    },
    get passwordSet() {
      return settings().relay?.passwordSet === true;
    },
    errorOf(field: relayDraft.MailRelayField): string | undefined {
      const issue = issues[field];
      return issue && (tried || touched.includes(field)) ? t(issue) : undefined;
    },
    touch(field: relayDraft.MailRelayField) {
      if (!touched.includes(field)) touched = [...touched, field];
    },
    set<K extends keyof relayDraft.MailRelayDraft>(field: K, value: relayDraft.MailRelayDraft[K]) {
      typed = { ...shown, [field]: value };
    },
    choose(provider: MailProvider) {
      typed = relayDraft.withProvider(shown, provider);
    },
    /** Gives the change to `save`, or shows the wrong fields. `saved` forgets the draft. */
    submit(save: (input: UpdateMailSettingsInput, saved: () => void) => void) {
      tried = true;
      if (Object.keys(issues).length > 0) return;
      save(relayDraft.toInput(shown), () => {
        typed = null;
        tried = false;
        touched = [];
      });
    },
  };
};
