<script lang="ts">
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import {
    Badge,
    Button,
    DialogFooter,
    Input,
    Label,
    RadioGroup,
    RadioGroupItem,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { connectGitLabMessages as messages } from '@base/features/integrations/presentation/messages/connect-gitlab.messages.ts';
  import ProviderTile from '../ProviderTile.svelte';
  import type { createGitLabToken } from './gitlab-token.state.svelte.ts';

  interface Props {
    form: ReturnType<typeof createGitLabToken>;
    onCancel: () => void;
  }

  let { form, onCancel }: Props = $props();

  const fieldId = $props.id();
  const DOCS_URL = 'https://docs.gitlab.com/user/profile/service_accounts/';

  const steps = $derived([
    t(messages.stepServiceAccount),
    t(messages.stepMaintainer),
    t(messages.stepToken),
  ]);
</script>

<form
  class="flex flex-col gap-5"
  novalidate
  onsubmit={event => {
    event.preventDefault();
    form.submit();
  }}
>
  {#if !form.replacing}
    <fieldset>
      <legend class="sr-only">{t(messages.host)}</legend>
      <!-- GitLab self-managed comes in a later release: GitLab.com is the only choice. -->
      <RadioGroup value="gitlab.com" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Label
          class="flex cursor-pointer items-center gap-3 rounded-xl border border-primary bg-card p-3 font-normal"
        >
          <RadioGroupItem value="gitlab.com" />
          <ProviderTile provider="gitlab" />
          <span class="flex min-w-0 flex-col">
            <span class="text-sm font-medium">{t(messages.gitlabCom)}</span>
            <span class="text-xs text-muted-foreground">{t(messages.gitlabComHost)}</span>
          </span>
        </Label>
        <Label
          class="flex cursor-not-allowed items-center gap-3 rounded-xl border bg-card p-3 font-normal text-muted-foreground"
        >
          <RadioGroupItem value="self-managed" disabled />
          <ProviderTile provider="gitlab" class="opacity-60" />
          <span class="flex min-w-0 grow flex-col">
            <span class="text-sm font-medium">{t(messages.selfManaged)}</span>
            <span class="text-xs">{t(messages.selfManagedHost)}</span>
          </span>
          <Badge variant="secondary">{t(messages.later)}</Badge>
        </Label>
      </RadioGroup>
    </fieldset>

    <div class="flex flex-col gap-2">
      <h3 class="text-sm">{t(messages.beforeYouStart)}</h3>
      <ol class="flex flex-col gap-2">
        {#each steps as step, index (step)}
          <li class="flex items-center gap-3 text-sm">
            <span
              class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            {step}
          </li>
        {/each}
      </ol>
      <a
        href={DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex w-fit items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
      >
        {t(messages.serviceAccountDocs)}
        <ExternalLinkIcon class="size-3.5" aria-hidden="true" />
      </a>
    </div>
  {/if}

  <div class="flex flex-col gap-2">
    <Label for={fieldId}>{t(messages.token)}</Label>
    <Input
      id={fieldId}
      type="password"
      autocomplete="off"
      spellcheck={false}
      class="font-mono"
      placeholder="glpat-…"
      aria-invalid={form.error ? 'true' : undefined}
      aria-describedby={`${fieldId}-hint`}
      bind:value={form.token}
    />
    {#if form.error}
      <p id={`${fieldId}-hint`} role="alert" class="text-xs text-destructive">{form.error}</p>
    {:else}
      <p id={`${fieldId}-hint`} class="text-xs text-muted-foreground">{t(messages.tokenHint)}</p>
    {/if}
  </div>

  <DialogFooter>
    <Button type="button" variant="outline" data-dialog-dismiss onclick={onCancel}>
      {t(messages.cancel)}
    </Button>
    <Button type="submit" disabled={!form.canSubmit}>
      {t(form.replacing ? messages.replace : messages.connect)}
    </Button>
  </DialogFooter>
</form>
