<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import LockIcon from '@lucide/svelte/icons/lock';
  import { Label, RadioGroup, RadioGroupItem } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { ConnectionKind } from '@base/features/apps/presentation/app-credentials.queries.ts';
  import { credentialsMessages as messages } from '@base/features/apps/presentation/messages/credentials.messages.ts';

  let { kind = $bindable() }: { kind: ConnectionKind } = $props();

  const CHOICES: readonly {
    value: ConnectionKind;
    icon: typeof KeyRoundIcon;
    title: MessageDescriptor;
    body: MessageDescriptor;
  }[] = [
    { value: 'token', icon: KeyRoundIcon, title: messages.token, body: messages.tokenBody },
    { value: 'ci', icon: GitBranchIcon, title: messages.ci, body: messages.ciBody },
    { value: 'keypair', icon: LockIcon, title: messages.keypair, body: messages.keypairBody },
  ];
</script>

<fieldset class="flex flex-col gap-3">
  <legend class="mb-3 text-sm font-medium">{t(messages.howConnect)}</legend>
  <RadioGroup value={kind} onValueChange={value => (kind = value as ConnectionKind)}>
    {#each CHOICES as choice (choice.value)}
      <Label
        class={cn(
          'flex cursor-pointer items-center gap-3 rounded-lg border p-4 font-normal',
          kind === choice.value && 'border-primary',
        )}
      >
        <RadioGroupItem value={choice.value} />
        <choice.icon class="size-4 shrink-0" aria-hidden="true" />
        <span class="flex flex-col gap-0.5">
          <span class="text-sm font-medium">{t(choice.title)}</span>
          <span class="text-xs text-muted-foreground">{t(choice.body)}</span>
        </span>
      </Label>
    {/each}
  </RadioGroup>
</fieldset>
