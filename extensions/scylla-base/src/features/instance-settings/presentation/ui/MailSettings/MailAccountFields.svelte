<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { Badge, Input } from '@scylla/ui/primitives';
  import { mailSettingsMessages as messages } from '@base/features/instance-settings/presentation/messages/mail-settings.messages.ts';
  import MailField from './MailField.svelte';
  import type { MailRelayForm } from './mail-relay-form.state.svelte.ts';

  interface Props {
    form: MailRelayForm;
    disabled: boolean;
  }

  let { form, disabled }: Props = $props();

  const id = $props.id();
</script>

<div class="grid gap-4 sm:grid-cols-2">
  <MailField id={`${id}-username`} label={t(messages.username)} hint={t(messages.usernameHint)}>
    {#snippet children(describedBy)}
      <Input
        id={`${id}-username`}
        value={form.shown.username}
        maxlength={255}
        autocomplete="off"
        spellcheck={false}
        aria-describedby={describedBy}
        {disabled}
        oninput={event => form.set('username', event.currentTarget.value)}
      />
    {/snippet}
  </MailField>
  <MailField
    id={`${id}-password`}
    label={t(messages.password)}
    hint={t(messages.passwordHint)}
    error={form.errorOf('password')}
  >
    {#snippet badge()}
      <Badge variant={form.passwordSet ? 'secondary' : 'outline'}>
        {t(form.passwordSet ? messages.passwordSet : messages.passwordNotSet)}
      </Badge>
    {/snippet}
    {#snippet children(describedBy)}
      <Input
        id={`${id}-password`}
        type="password"
        value={form.shown.password}
        maxlength={1024}
        autocomplete="new-password"
        placeholder={form.passwordSet ? t(messages.passwordKeep) : undefined}
        aria-invalid={form.errorOf('password') ? 'true' : undefined}
        aria-describedby={describedBy}
        {disabled}
        oninput={event => form.set('password', event.currentTarget.value)}
        onblur={() => form.touch('password')}
      />
    {/snippet}
  </MailField>
</div>

<div class="grid gap-4 sm:grid-cols-2">
  <MailField
    id={`${id}-from-address`}
    label={t(messages.fromAddress)}
    hint={t(messages.fromAddressHint)}
    error={form.errorOf('fromAddress')}
  >
    {#snippet children(describedBy)}
      <Input
        id={`${id}-from-address`}
        type="email"
        value={form.shown.fromAddress}
        maxlength={254}
        autocomplete="off"
        placeholder={t(messages.fromAddressPlaceholder)}
        aria-invalid={form.errorOf('fromAddress') ? 'true' : undefined}
        aria-describedby={describedBy}
        {disabled}
        oninput={event => form.set('fromAddress', event.currentTarget.value)}
        onblur={() => form.touch('fromAddress')}
      />
    {/snippet}
  </MailField>
  <MailField id={`${id}-from-name`} label={t(messages.fromName)}>
    {#snippet children(describedBy)}
      <Input
        id={`${id}-from-name`}
        value={form.shown.fromName}
        maxlength={100}
        autocomplete="off"
        placeholder={t(messages.fromNamePlaceholder)}
        aria-describedby={describedBy}
        {disabled}
        oninput={event => form.set('fromName', event.currentTarget.value)}
      />
    {/snippet}
  </MailField>
</div>
