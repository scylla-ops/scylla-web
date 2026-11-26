<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { Input, Select, SelectContent, SelectItem, SelectTrigger } from '@scylla/ui/primitives';
  import type { MailSecurity } from '@base/features/instance-settings/domain/entities/mail-settings.entity.ts';
  import {
    MAIL_PROVIDERS,
    type MailProvider,
  } from '@base/features/instance-settings/domain/structs/mail-provider.struct.ts';
  import { mailSettingsMessages as messages } from '@base/features/instance-settings/presentation/messages/mail-settings.messages.ts';
  import { providerName } from '@base/features/instance-settings/presentation/presenters/mail-settings.presenter.ts';
  import MailField from './MailField.svelte';
  import type { MailRelayForm } from './mail-relay-form.state.svelte.ts';

  interface Props {
    form: MailRelayForm;
    disabled: boolean;
  }

  let { form, disabled }: Props = $props();

  const SECURITIES: MailSecurity[] = ['tls', 'starttls', 'none'];

  const id = $props.id();
</script>

<MailField
  id={`${id}-provider`}
  label={t(messages.provider)}
  hint={t(messages.providerHints[form.shown.provider])}
>
  {#snippet children(describedBy)}
    <Select
      type="single"
      value={form.shown.provider}
      {disabled}
      onValueChange={value => form.choose(value as MailProvider)}
    >
      <SelectTrigger id={`${id}-provider`} class="w-full sm:w-64" aria-describedby={describedBy}>
        {providerName(form.shown.provider)}
      </SelectTrigger>
      <SelectContent>
        {#each MAIL_PROVIDERS as provider (provider)}
          <SelectItem value={provider} label={providerName(provider)}>
            {providerName(provider)}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  {/snippet}
</MailField>

<div class="flex flex-col gap-2">
  <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem_11rem]">
    <MailField id={`${id}-host`} label={t(messages.host)} error={form.errorOf('host')}>
      {#snippet children(describedBy)}
        <Input
          id={`${id}-host`}
          value={form.shown.host}
          maxlength={253}
          autocomplete="off"
          spellcheck={false}
          placeholder={t(messages.hostPlaceholder)}
          aria-invalid={form.errorOf('host') ? 'true' : undefined}
          aria-describedby={describedBy}
          {disabled}
          oninput={event => form.set('host', event.currentTarget.value)}
          onblur={() => form.touch('host')}
        />
      {/snippet}
    </MailField>
    <MailField id={`${id}-port`} label={t(messages.port)} error={form.errorOf('port')}>
      {#snippet children(describedBy)}
        <Input
          id={`${id}-port`}
          value={form.shown.port}
          inputmode="numeric"
          maxlength={5}
          autocomplete="off"
          aria-invalid={form.errorOf('port') ? 'true' : undefined}
          aria-describedby={describedBy}
          {disabled}
          oninput={event => form.set('port', event.currentTarget.value)}
          onblur={() => form.touch('port')}
        />
      {/snippet}
    </MailField>
    <MailField id={`${id}-security`} label={t(messages.security)}>
      {#snippet children(describedBy)}
        <Select
          type="single"
          value={form.shown.security}
          {disabled}
          onValueChange={value => form.set('security', value as MailSecurity)}
        >
          <SelectTrigger
            id={`${id}-security`}
            class="w-full"
            aria-describedby={[describedBy, `${id}-security-hint`].filter(Boolean).join(' ')}
          >
            {t(messages.securities[form.shown.security])}
          </SelectTrigger>
          <SelectContent>
            {#each SECURITIES as security (security)}
              <SelectItem value={security} label={t(messages.securities[security])}>
                {t(messages.securities[security])}
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>
      {/snippet}
    </MailField>
  </div>
  <p id={`${id}-security-hint`} class="text-xs text-muted-foreground">
    {t(messages.securityHints[form.shown.security])}
  </p>
</div>
