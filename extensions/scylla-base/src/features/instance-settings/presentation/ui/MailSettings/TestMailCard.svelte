<script lang="ts">
  import SendIcon from '@lucide/svelte/icons/send';
  import { createMutation } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { Button, Input } from '@scylla/ui/primitives';
  import { checkEmail } from '@shared/utils/account-validation.ts';
  import { mailSettingsMutations } from '@base/features/instance-settings/presentation/instance-settings.queries.ts';
  import { mailSettingsMessages as messages } from '@base/features/instance-settings/presentation/messages/mail-settings.messages.ts';
  import MailField from './MailField.svelte';
  import MailSection from './MailSection.svelte';
  import TestMailResult from './TestMailResult.svelte';

  interface Props {
    /** The server has a mail server to send the test mail. */
    canSend: boolean;
    disabled: boolean;
  }

  let { canSend, disabled }: Props = $props();

  const send = createMutation(() => mailSettingsMutations.sendTest());

  let to = $state('');
  let touched = $state(false);
  const issue = $derived(checkEmail(to));
  const error = $derived(touched && issue ? t(issue) : undefined);

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    touched = true;
    if (issue) return;
    send.mutate(to.trim());
  };

  const id = $props.id();
</script>

<MailSection title={t(messages.testTitle)} description={t(messages.testDescription)}>
  <div class="flex flex-col gap-4">
    <form novalidate onsubmit={submit}>
      <MailField
        id={`${id}-to`}
        label={t(messages.testTo)}
        hint={canSend ? undefined : t(messages.testNoRelay)}
        {error}
      >
        {#snippet children(describedBy)}
          <div class="flex flex-wrap items-center gap-2">
            <Input
              id={`${id}-to`}
              type="email"
              class="min-w-0 grow basis-64"
              value={to}
              maxlength={254}
              autocomplete="email"
              placeholder={t(messages.testToPlaceholder)}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={describedBy}
              disabled={disabled || !canSend}
              oninput={event => (to = event.currentTarget.value)}
              onblur={() => (touched = to !== '')}
            />
            <Button type="submit" disabled={disabled || !canSend || send.isPending}>
              <SendIcon />
              {t(messages.testSend)}
            </Button>
          </div>
        {/snippet}
      </MailField>
    </form>
    {#if send.data}
      <TestMailResult result={send.data} />
    {/if}
  </div>
</MailSection>
