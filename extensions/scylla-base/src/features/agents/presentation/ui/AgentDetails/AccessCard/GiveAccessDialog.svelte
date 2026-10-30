<script lang="ts">
  import Building2Icon from '@lucide/svelte/icons/building-2';
  import FolderIcon from '@lucide/svelte/icons/folder';
  import InfoIcon from '@lucide/svelte/icons/info';
  import Loader2Icon from '@lucide/svelte/icons/loader-2';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { ScyllaDialog } from '@scylla/ui';
  import {
    Button,
    DialogDescription,
    DialogTitle,
    Label,
    RadioGroup,
    RadioGroupItem,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { AgentAccess } from './agent-access.state.svelte.ts';
  import type { AgentReach } from '@base/features/agents/presentation/ui/components/CreateAgentDialog/create-agent.state.svelte.ts';
  import DialogFooterBand from '../../components/DialogFooterBand.svelte';
  import ProjectPicker from './ProjectPicker.svelte';
  import { accessCardMessages as messages } from '@base/features/agents/presentation/messages/access-card.messages.ts';

  interface Props {
    manager: AgentAccess;
    agentName: string;
  }

  let { manager, agentName }: Props = $props();

  const id = $props.id();
  const formId = `give-access-${id}`;

  const projectOpen = $derived(manager.canPickProject || manager.projectsStatus === 'loading');

  const card = (selected: boolean, enabled: boolean) =>
    cn(
      'flex gap-3 rounded-lg border p-3.5 transition-colors',
      !enabled ? 'opacity-60' : 'cursor-pointer',
      selected ? 'border-primary' : enabled && 'hover:bg-muted/40',
    );

  const pick = (reach: AgentReach) => {
    if (manager.working) return;
    if (reach === 'project' ? projectOpen : manager.canPickOrganization) manager.reach = reach;
  };
</script>

<ScyllaDialog
  open={manager.giving}
  onOpenChange={next => {
    if (!next) manager.closeGive();
  }}
  dismissible={!manager.working}
  class="w-[calc(100vw-2rem)] gap-0 p-0 sm:max-w-[520px]"
>
  <div data-dialog-part="header" class="flex flex-col gap-2 px-6 pt-6 pr-12">
    <DialogTitle>{t(messages.giveTitle(agentName))}</DialogTitle>
    <DialogDescription>{t(messages.giveDescription)}</DialogDescription>
  </div>

  <form
    id={formId}
    data-dialog-part="body"
    class="flex flex-col gap-3 px-6 py-5"
    onsubmit={event => {
      event.preventDefault();
      void manager.give();
    }}
  >
    <RadioGroup
      value={manager.reach ?? ''}
      onValueChange={value => pick(value as AgentReach)}
      aria-label={t(messages.where)}
      disabled={manager.working}
      class="flex flex-col gap-2"
    >
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div class={card(manager.reach === 'project', projectOpen)} onclick={() => pick('project')}>
        <RadioGroupItem value="project" id="{id}-project" disabled={!projectOpen} class="mt-0.5" />
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <Label for="{id}-project" class="flex items-center gap-2 text-sm font-medium">
            <FolderIcon class="size-4" aria-hidden="true" />
            {t(messages.oneProject)}
          </Label>
          <p class="text-xs text-muted-foreground">{t(messages.oneProjectText)}</p>
          <ProjectPicker {manager} />
        </div>
      </div>
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div
        class={card(manager.reach === 'organization', manager.canPickOrganization)}
        onclick={() => pick('organization')}
      >
        <RadioGroupItem
          value="organization"
          id="{id}-organization"
          disabled={!manager.canPickOrganization}
          class="mt-0.5"
        />
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <Label for="{id}-organization" class="flex items-center gap-2 text-sm font-medium">
            <Building2Icon class="size-4" aria-hidden="true" />
            {t(messages.allProjectsOf(manager.organizationName))}
          </Label>
          <p class="text-xs text-muted-foreground">
            {manager.canPickOrganization
              ? t(messages.allProjectsText)
              : t(messages.organizationDenied)}
          </p>
        </div>
      </div>
    </RadioGroup>

    {#if manager.replaced.length > 0 || manager.kept.length > 0}
      <div
        class="flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-xs"
      >
        <TriangleAlertIcon class="mt-px size-3.5 shrink-0 text-warning" aria-hidden="true" />
        <div class="flex flex-col gap-1">
          {#if manager.replaced.length > 0}
            <p>
              {t(messages.replacesProjects(manager.listOf(manager.replaced.map(manager.nameOf))))}
              {t(messages.reconnectKeepsJobs)}
            </p>
          {/if}
          {#if manager.kept.length > 0}
            <p>{t(messages.keepsProjects(manager.listOf(manager.kept.map(manager.nameOf))))}</p>
          {/if}
        </div>
      </div>
    {/if}

    {#if manager.reach}
      <p class="flex items-start gap-2 text-xs text-muted-foreground">
        <InfoIcon class="mt-px size-3.5 shrink-0" aria-hidden="true" />
        {t(manager.reach === 'project' ? messages.roleProject : messages.roleOrganization)}
      </p>
    {/if}
  </form>

  <DialogFooterBand>
    <Button variant="outline" onclick={manager.closeGive} disabled={manager.working}>
      {t(messages.cancel)}
    </Button>
    <Button type="submit" form={formId} disabled={!manager.canGive} aria-busy={manager.working}>
      {#if manager.working}
        <Loader2Icon class="animate-spin" />
        {t(messages.giving)}
      {:else}
        {t(messages.give)}
      {/if}
    </Button>
  </DialogFooterBand>
</ScyllaDialog>
