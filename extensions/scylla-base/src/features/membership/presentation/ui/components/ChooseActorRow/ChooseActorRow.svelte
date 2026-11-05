<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import {
    Button,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '@scylla/ui/primitives';
  import { membershipMessages } from '../../../messages/membership.messages.ts';

  export interface ActorChoice {
    id: string;
    name: string;
  }

  interface Props {
    choices: readonly ActorChoice[];
    onChoose: (choice: ActorChoice) => void;
    onCancel: () => void;
  }

  let { choices, onChoose, onCancel }: Props = $props();

  let chosen = $state('');
  const choice = $derived(choices.find(one => one.id === chosen));
</script>

<div class="flex items-center gap-2 rounded-xl border p-4">
  <Select type="single" value={chosen} onValueChange={next => (chosen = next)}>
    <SelectTrigger class="flex-1" aria-label={t(membershipMessages.member)}>
      {choice?.name ?? t(membershipMessages.chooseMember)}
    </SelectTrigger>
    <SelectContent>
      {#each choices as one (one.id)}
        <SelectItem value={one.id} label={one.name}>{one.name}</SelectItem>
      {/each}
    </SelectContent>
  </Select>
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
