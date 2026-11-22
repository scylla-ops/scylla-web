<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { Button, Input, Label } from '@scylla/ui/primitives';
  import type { LegalOperator } from '@platform/legal';
  import { legalSettingsMessages as messages } from '@base/features/legal/presentation/messages/legal-settings.messages.ts';
  import LegalSection from './LegalSection.svelte';
  import TextArea from './TextArea.svelte';

  interface Props {
    operator: LegalOperator;
    disabled: boolean;
    /** Calls `saved` when the server holds the values. */
    onSave: (operator: LegalOperator, saved: () => void) => void;
  }

  let { operator, disabled, onSave }: Props = $props();

  /** What the user typed. `null`: the values of the server. */
  let typed = $state<LegalOperator | null>(null);
  const shown = $derived(typed ?? operator);
  const changed = $derived(
    typed !== null &&
      (Object.keys(operator) as (keyof LegalOperator)[]).some(
        field => typed?.[field].trim() !== operator[field],
      ),
  );

  const set = (field: keyof LegalOperator, value: string) => {
    typed = { ...shown, [field]: value };
  };

  const id = $props.id();
</script>

<LegalSection title={t(messages.operatorTitle)} description={t(messages.operatorDescription)}>
  <form
    class="flex flex-col gap-4"
    onsubmit={event => {
      event.preventDefault();
      onSave(shown, () => (typed = null));
    }}
  >
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="flex flex-col gap-2">
        <Label for={`${id}-name`}>{t(messages.name)}</Label>
        <Input
          id={`${id}-name`}
          value={shown.name}
          maxlength={200}
          placeholder={t(messages.namePlaceholder)}
          {disabled}
          oninput={event => set('name', event.currentTarget.value)}
        />
      </div>
      <div class="flex flex-col gap-2">
        <Label for={`${id}-contact`}>{t(messages.contact)}</Label>
        <Input
          id={`${id}-contact`}
          value={shown.contact}
          maxlength={200}
          placeholder={t(messages.contactPlaceholder)}
          {disabled}
          oninput={event => set('contact', event.currentTarget.value)}
        />
      </div>
      <div class="flex flex-col gap-2">
        <Label for={`${id}-address`}>{t(messages.address)}</Label>
        <TextArea
          id={`${id}-address`}
          rows={3}
          value={shown.address}
          maxlength={500}
          {disabled}
          oninput={event => set('address', event.currentTarget.value)}
        />
      </div>
      <div class="flex flex-col gap-2">
        <Label for={`${id}-registration`}>{t(messages.registration)}</Label>
        <TextArea
          id={`${id}-registration`}
          rows={3}
          value={shown.registration}
          maxlength={500}
          aria-describedby={`${id}-registration-hint`}
          {disabled}
          oninput={event => set('registration', event.currentTarget.value)}
        />
        <p id={`${id}-registration-hint`} class="text-xs text-muted-foreground">
          {t(messages.registrationHint)}
        </p>
      </div>
      <div class="flex flex-col gap-2">
        <Label for={`${id}-director`}>{t(messages.publicationDirector)}</Label>
        <Input
          id={`${id}-director`}
          value={shown.publicationDirector}
          maxlength={200}
          {disabled}
          oninput={event => set('publicationDirector', event.currentTarget.value)}
        />
      </div>
      <div class="flex flex-col gap-2">
        <Label for={`${id}-host`}>{t(messages.host)}</Label>
        <TextArea
          id={`${id}-host`}
          rows={3}
          value={shown.host}
          maxlength={500}
          aria-describedby={`${id}-host-hint`}
          {disabled}
          oninput={event => set('host', event.currentTarget.value)}
        />
        <p id={`${id}-host-hint`} class="text-xs text-muted-foreground">{t(messages.hostHint)}</p>
      </div>
    </div>
    <div class="flex justify-end">
      <Button type="submit" disabled={disabled || !changed}>{t(messages.save)}</Button>
    </div>
  </form>
</LegalSection>
