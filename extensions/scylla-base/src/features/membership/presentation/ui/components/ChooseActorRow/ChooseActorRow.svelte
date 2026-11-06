<script lang="ts">
  import { SearchSelect } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import { membershipMessages } from '../../../messages/membership.messages.ts';
  import type { ActorChoice } from '../../../presenters/actor-choice.presenter.ts';

  interface Props {
    choices: readonly ActorChoice[];
    /** Rows can still arrive. */
    loading?: boolean;
    onChoose: (choice: ActorChoice) => void;
    onCancel: () => void;
  }

  let { choices, loading = false, onChoose, onCancel }: Props = $props();

  let chosen = $state('');
  const choice = $derived(choices.find(one => one.id === chosen));
  const options = $derived(choices.map(one => ({ ...one, value: one.id, label: one.name })));
</script>

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
