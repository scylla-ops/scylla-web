<script lang="ts" module>
  import type { ConsentPurpose } from '@platform/trackers';
  import type { ConsentGrants } from '../../../domain/structs/consent-choice.struct.ts';
  import type { ConsentPurposeRow } from '../../presenters/consent.presenter.ts';
  import type { PolicyLink } from '../policy-link.ts';

  export interface PreferencesFormProps {
    rows: readonly ConsentPurposeRow[];
    /** The purposes that the choice of this browser accepts: the switches start there. */
    granted: ReadonlySet<ConsentPurpose>;
    /** The browser sends Global Privacy Control: each switch stays off. */
    globalPrivacyControl: boolean;
    /** The line of the last choice. */
    lastChoice: string;
    policy?: PolicyLink;
    /** A choice is on its way to the server: the controls wait. */
    pending: boolean;
    onsave: (grants: ConsentGrants) => void;
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
  import { t } from '@scylla/ui/i18n';
  import { Button, Label, Switch } from '@scylla/ui/primitives';
  import { consentMessages as messages } from '../../messages/consent.messages.ts';

  let { rows, granted, globalPrivacyControl, lastChoice, policy, pending, onsave }: PreferencesFormProps =
    $props();

  const id = $props.id();

  // The switches start from the choice of the browser, once: the dialog builds the form again at
  // each opening.
  const draft = $state<ConsentGrants>(
    untrack(() => Object.fromEntries(rows.map(row => [row.purpose, granted.has(row.purpose)]))),
  );

  const all = (value: boolean): ConsentGrants =>
    Object.fromEntries(rows.map(row => [row.purpose, value]));
</script>

<div class="flex flex-col gap-3">
  {#if globalPrivacyControl}
    <p
      role="note"
      class="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm"
    >
      <ShieldCheckIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      {t(messages.globalPrivacyControl)}
    </p>
  {/if}

  <!-- The trackers that the service needs: no switch to turn off. -->
  <Label
    class="flex items-center justify-between gap-4 rounded-lg border border-border p-3 font-normal"
  >
    <span class="flex min-w-0 flex-col gap-0.5">
      <span class="text-sm font-medium">{t(messages.necessaryTitle)}</span>
      <span id="{id}-necessary" class="text-xs text-muted-foreground">
        {t(messages.necessaryDescription)}
      </span>
      <span class="text-xs text-muted-foreground">{t(messages.alwaysOn)}</span>
    </span>
    <Switch checked disabled aria-describedby="{id}-necessary" />
  </Label>

  {#each rows as row (row.purpose)}
    <Label
      class="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border p-3 font-normal"
    >
      <span class="flex min-w-0 flex-col gap-0.5">
        <span class="text-sm font-medium">{row.title}</span>
        <span id="{id}-{row.purpose}" class="text-xs text-muted-foreground">
          {row.description}
        </span>
        {#if row.partners.length > 0}
          <span class="text-xs text-muted-foreground">
            {t(messages.partners(row.partners.join(', ')))}
          </span>
        {/if}
      </span>
      <Switch
        checked={draft[row.purpose] === true}
        disabled={globalPrivacyControl || pending}
        aria-describedby="{id}-{row.purpose}"
        onCheckedChange={checked => (draft[row.purpose] = checked)}
      />
    </Label>
  {/each}

  <p class="text-center text-xs text-muted-foreground">
    {lastChoice}
    {#if policy}
      ·
      <a
        href={policy.href}
        target={policy.external ? '_blank' : undefined}
        rel={policy.external ? 'noopener noreferrer' : undefined}
        class="text-foreground underline underline-offset-4 hover:text-primary"
      >
        {t(messages.cookiePolicy)}
      </a>
    {/if}
  </p>

  <!-- Three buttons of the same weight. -->
  <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
    <Button
      variant="outline"
      disabled={globalPrivacyControl || pending}
      onclick={() => onsave(all(false))}
    >
      {t(messages.rejectAll)}
    </Button>
    <Button
      variant="outline"
      disabled={globalPrivacyControl || pending}
      onclick={() => onsave({ ...draft })}
    >
      {t(messages.saveChoices)}
    </Button>
    <Button
      variant="outline"
      disabled={globalPrivacyControl || pending}
      onclick={() => onsave(all(true))}
    >
      {t(messages.acceptAll)}
    </Button>
  </div>
</div>
