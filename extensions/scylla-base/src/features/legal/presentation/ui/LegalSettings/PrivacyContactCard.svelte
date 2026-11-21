<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { Button, Input, Label } from '@scylla/ui/primitives';
  import { legalSettingsMessages as messages } from '@base/features/legal/presentation/messages/legal-settings.messages.ts';
  import LegalSection from './LegalSection.svelte';

  interface Props {
    contact: string;
    disabled: boolean;
    /** Calls `saved` when the server holds the value. */
    onSave: (contact: string, saved: () => void) => void;
  }

  let { contact, disabled, onSave }: Props = $props();

  /** What the user typed. `null`: the value of the server. */
  let typed = $state<string | null>(null);
  const shown = $derived(typed ?? contact);
  const changed = $derived(typed !== null && typed.trim() !== contact);

  const id = $props.id();
</script>

<LegalSection title={t(messages.privacyTitle)} description={t(messages.privacyDescription)}>
  <form
    class="flex flex-col gap-2"
    onsubmit={event => {
      event.preventDefault();
      onSave(shown.trim(), () => (typed = null));
    }}
  >
    <Label for={`${id}-contact`}>{t(messages.privacyContact)}</Label>
    <div class="flex items-center gap-2">
      <Input
        id={`${id}-contact`}
        class="max-w-96"
        value={shown}
        maxlength={320}
        placeholder={t(messages.privacyPlaceholder)}
        {disabled}
        oninput={event => (typed = event.currentTarget.value)}
      />
      <Button type="submit" disabled={disabled || !changed}>{t(messages.save)}</Button>
    </div>
  </form>
</LegalSection>
