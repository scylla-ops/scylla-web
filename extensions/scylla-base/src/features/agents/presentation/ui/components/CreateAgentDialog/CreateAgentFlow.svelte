<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import Loader2Icon from '@lucide/svelte/icons/loader-2';
  import { cubicOut } from 'svelte/easing';
  import { fade, fly } from 'svelte/transition';
  import { scyllaNavigate } from '@platform/context';
  import { prefersReducedMotion } from '@scylla/ui';
  import { Button, DialogDescription, DialogTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    createAgentCreation,
  } from './create-agent.state.svelte.ts';
  import { trackHeight } from './track-height.attachments.ts';
  import { agentsMessages } from '../../agents.messages.ts';
  import DialogFooterBand from '../DialogFooterBand.svelte';
  import CreateAgentForm from './CreateAgentForm.svelte';
  import CreateAgentStart from './CreateAgentStart.svelte';
  import CreateAgentStepper from './CreateAgentStepper.svelte';
  import { createAgentMessages as messages } from './create-agent.messages.ts';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Built at each opening of the dialog: the secret goes with it.
  const creation = createAgentCreation();

  /** Read by the dialog: nothing closes it while the agent is created, only a button in step 2. */
  export const dismissible = (): boolean | 'button' => {
    if (creation.phase === 'form') return true;
    return creation.phase === 'start' ? 'button' : false;
  };

  const uid = $props.id();
  const formId = `create-agent-${uid}`;

  const STEP_MS = 450;
  const enterStep = (node: Element) =>
    prefersReducedMotion()
      ? fade(node, { duration: 150 })
      : fly(node, { x: 24, duration: STEP_MS, easing: cubicOut });
  const leaveStep = (node: Element) =>
    prefersReducedMotion()
      ? fade(node, { duration: 150 })
      : fly(node, { x: -24, duration: STEP_MS, easing: cubicOut });

  /** The body animates from the height of one step to the other. */
  let bodyHeight = $state<number | null>(null);
  const heightOf = (step: 1 | 2) => (height: number) => {
    if (creation.step === step) bodyHeight = height;
  };

  const firstDone = $derived(creation.phase === 'created' || creation.phase === 'start');

  const openAgent = () => {
    const agentId = creation.created?.agent.id;
    onClose();
    if (agentId) scyllaNavigate.goToAgentDetails(agentId);
  };
</script>

<div data-dialog-part="header" class="flex min-w-0 flex-col gap-2 px-6 pt-6 pr-12">
  <DialogTitle class="wrap-break-word">
    {creation.step === 2 && creation.created
      ? t(messages.startTitle(creation.created.agent.name))
      : t(messages.title)}
  </DialogTitle>
  <DialogDescription>
    {creation.step === 2 ? t(messages.startDescription) : t(messages.description)}
  </DialogDescription>
  <div class="mt-2">
    <CreateAgentStepper step={creation.step} {firstDone} />
  </div>
</div>

<div
  data-dialog-part="body"
  class="min-w-0 overflow-clip transition-[height] duration-450 ease-out motion-reduce:transition-none"
  style:height={bodyHeight === null ? undefined : `${bodyHeight}px`}
>
  <div class="grid grid-cols-1 content-start items-start">
    {#if creation.step === 1}
      <div
        data-step="1"
        class="col-start-1 row-start-1 min-w-0 px-6 py-5"
        {@attach trackHeight(heightOf(1))}
        in:enterStep
        out:leaveStep
      >
        <CreateAgentForm {creation} {formId} />
      </div>
    {:else if creation.created}
      <div
        data-step="2"
        class="col-start-1 row-start-1 min-w-0 px-6 py-5"
        {@attach trackHeight(heightOf(2))}
        in:enterStep
        out:leaveStep
      >
        <CreateAgentStart
          created={creation.created}
          grantFailed={creation.grantFailed}
          canWatch={creation.canWatch}
          liveAgent={creation.liveAgent}
          connected={creation.connected}
        />
      </div>
    {/if}
  </div>
</div>

{#if creation.step === 1}
  <DialogFooterBand>
    <Button variant="outline" onclick={onClose} disabled={creation.phase !== 'form'}>
      {t(messages.cancel)}
    </Button>
    <Button
      type="submit"
      form={formId}
      disabled={creation.phase === 'form' && !creation.canSubmit}
      aria-busy={creation.phase === 'creating'}
      class="min-w-32"
    >
      {#if creation.phase === 'creating'}
        <Loader2Icon class="animate-spin" />
        {t(messages.creating)}
      {:else if creation.phase === 'created'}
        <span class="pop flex items-center gap-1.5">
          <CheckIcon />
          {t(messages.created)}
        </span>
      {:else}
        {t(messages.create)}
      {/if}
    </Button>
  </DialogFooterBand>
{:else}
  <DialogFooterBand note={t(agentsMessages.noSecondChance)} anchor="agent-dialog-actions">
    <Button variant="outline" onclick={onClose}>{t(agentsMessages.close)}</Button>
    {#if creation.canWatch}
      <Button onclick={openAgent} disabled={!creation.connected}>{t(messages.openAgent)}</Button>
    {/if}
  </DialogFooterBand>
{/if}

<style>
  .pop {
    animation: pop 360ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes pop {
    0% {
      transform: scale(0.6);
      opacity: 0;
    }
    60% {
      transform: scale(1.08);
      opacity: 1;
    }
    100% {
      transform: scale(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pop {
      animation: none;
    }
  }
</style>
