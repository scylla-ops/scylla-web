<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import type {
    MailSettings,
    UpdateMailSettingsInput,
  } from '@base/features/instance-settings/domain/entities/mail-settings.entity.ts';
  import { mailSettingsMessages as messages } from '@base/features/instance-settings/presentation/messages/mail-settings.messages.ts';
  import { relayDescription } from '@base/features/instance-settings/presentation/presenters/mail-settings.presenter.ts';
  import MailAccountFields from './MailAccountFields.svelte';
  import MailSection from './MailSection.svelte';
  import MailServerFields from './MailServerFields.svelte';
  import { createMailRelayForm } from './mail-relay-form.state.svelte.ts';

  interface Props {
    settings: MailSettings;
    disabled: boolean;
    /** Calls `saved` when the server holds the values. */
    onSave: (input: UpdateMailSettingsInput, saved: () => void) => void;
  }

  let { settings, disabled, onSave }: Props = $props();

  const form = createMailRelayForm(() => settings);
</script>

<MailSection title={t(messages.relayTitle)} description={relayDescription(settings)}>
  <form
    class="flex flex-col gap-4"
    novalidate
    onsubmit={event => {
      event.preventDefault();
      form.submit(onSave);
    }}
  >
    <MailServerFields {form} {disabled} />
    <MailAccountFields {form} {disabled} />
    <div class="flex justify-end">
      <Button type="submit" disabled={disabled || !form.changed}>{t(messages.save)}</Button>
    </div>
  </form>
</MailSection>
