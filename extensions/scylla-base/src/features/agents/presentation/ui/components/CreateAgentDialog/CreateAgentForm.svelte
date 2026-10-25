<script lang="ts">
  import Building2Icon from '@lucide/svelte/icons/building-2';
  import FolderIcon from '@lucide/svelte/icons/folder';
  import { Badge, Input, Label, RadioGroup, RadioGroupItem } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type {
    AgentCreation,
    AgentReach,
  } from './create-agent.state.svelte.ts';
  import CreateAgentProject from './CreateAgentProject.svelte';
  import { createAgentMessages as messages } from '@base/features/agents/presentation/messages/create-agent.messages.ts';

  interface Props {
    creation: AgentCreation;
    formId: string;
  }

  let { creation, formId }: Props = $props();

  const id = $props.id();
  const busy = $derived(creation.phase !== 'form');

  const card = (selected: boolean, enabled = true) =>
    cn(
      'flex gap-3 rounded-lg border p-3.5 transition-colors',
      !enabled ? 'opacity-60' : 'cursor-pointer',
      selected ? 'border-primary' : enabled && 'hover:bg-muted/40',
    );
</script>

<form
  id={formId}
  class="flex flex-col gap-2"
  onsubmit={event => {
    event.preventDefault();
    void creation.submit();
  }}
>
  <Label for="{id}-name" class="text-sm font-medium">{t(messages.name)}</Label>
  <Input
    id="{id}-name"
    bind:value={creation.name}
    placeholder={t(messages.namePlaceholder)}
    autocomplete="off"
    spellcheck={false}
    autofocus
    disabled={busy}
    aria-invalid={creation.nameInvalid || undefined}
    aria-describedby="{id}-name-help"
  />
  <p
    id="{id}-name-help"
    class={cn('text-xs', creation.nameInvalid ? 'text-destructive' : 'text-muted-foreground')}
  >
    {creation.nameInvalid ? t(messages.nameInvalid) : t(messages.nameHelp)}
  </p>

  <span id="{id}-where" class="mt-4 text-sm font-medium">{t(messages.where)}</span>
  <RadioGroup
    value={creation.reach ?? ''}
    onValueChange={value => (creation.reach = value as AgentReach)}
    aria-labelledby="{id}-where"
    disabled={busy}
    class="flex flex-col gap-2"
  >
    {#if creation.projectOption !== 'hidden'}
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div
        class={card(creation.reach === 'project', creation.projectOption !== 'error')}
        onclick={() => (creation.reach = 'project')}
      >
        <RadioGroupItem
          value="project"
          id="{id}-project"
          disabled={creation.projectOption === 'error'}
          class="mt-0.5"
        />
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <Label for="{id}-project" class="flex items-center gap-2 text-sm font-medium">
            <FolderIcon class="size-4" aria-hidden="true" />
            {t(messages.oneProject)}
            <Badge variant="secondary" class="font-normal">{t(messages.recommended)}</Badge>
          </Label>
          <p class="text-xs text-muted-foreground">{t(messages.oneProjectText)}</p>
          <CreateAgentProject {creation} disabled={busy} />
        </div>
      </div>
    {/if}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div
      class={card(creation.reach === 'organization')}
      onclick={() => (creation.reach = 'organization')}
    >
      <RadioGroupItem value="organization" id="{id}-organization" class="mt-0.5" />
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <Label for="{id}-organization" class="flex items-center gap-2 text-sm font-medium">
          <Building2Icon class="size-4" aria-hidden="true" />
          {t(messages.allProjectsOf(creation.organizationName))}
        </Label>
        <p class="text-xs text-muted-foreground">{t(messages.allProjectsText)}</p>
      </div>
    </div>
  </RadioGroup>
</form>
