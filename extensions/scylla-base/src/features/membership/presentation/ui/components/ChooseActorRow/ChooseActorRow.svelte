<script lang="ts">
  import { SearchSelect, type SearchSelectOption } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import { Identity } from '@shared/presentation/ui';
  import { membershipMessages } from '../../../messages/membership.messages.ts';
  import type { ActorChoice } from '../../../presenters/actor-choice.presenter.ts';
  import { memberProfile } from '../../../presenters/member-rows.presenter.ts';

  interface Props {
    choices: readonly ActorChoice[];
    /** Rows can still arrive. */
    loading?: boolean;
    onChoose: (choice: ActorChoice) => void;
    onCancel: () => void;
  }

  let { choices, loading = false, onChoose, onCancel }: Props = $props();

  let chosen = $state('');
  const byId = $derived(new Map(choices.map(one => [one.id, one])));
  const choice = $derived(byId.get(chosen));
  const options = $derived(choices.map(one => ({ ...one, value: one.id, label: one.name })));

  const profileOf = (one: ActorChoice) =>
    memberProfile({ name: one.name, handle: one.handle ?? '' });
</script>

{#snippet row(option: SearchSelectOption)}
  {@const one = byId.get(option.value)}
  {#if one}
    <span class="flex min-w-0 items-center gap-2">
      <Identity format="cell" profile={profileOf(one)} kind={one.kind} />
      {#if one.hint}
        <span class="truncate text-xs text-muted-foreground">{one.hint}</span>
      {/if}
    </span>
  {/if}
{/snippet}

{#snippet chip(option: SearchSelectOption)}
  {@const one = byId.get(option.value)}
  {#if one}
    <Identity
      format="chip"
      class="shrink"
      profile={profileOf(one)}
      kind={one.kind}
      onRemove={() => (chosen = '')}
    />
  {/if}
{/snippet}

<div class="flex items-center gap-2 rounded-xl border p-4">
  <SearchSelect
    class="flex-1"
    {options}
    bind:value={chosen}
    {loading}
    focusOnMount
    placeholder={t(membershipMessages.chooseMember)}
    aria-label={t(membershipMessages.member)}
    emptyText={t(membershipMessages.noMemberToAdd)}
    {row}
    {chip}
  />
  <Button
    disabled={!choice}
    onclick={() => {
      if (choice) onChoose(choice);
    }}
  >
    {t(membershipMessages.chooseRole)}
  </Button>
  <Button variant="ghost" onclick={onCancel}>{t(membershipMessages.cancel)}</Button>
</div>
