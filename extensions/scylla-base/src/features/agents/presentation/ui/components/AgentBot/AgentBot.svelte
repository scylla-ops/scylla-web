<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { AgentState } from '@base/features/agents/domain/structs/agent-state.struct.ts';
  import { agentBotMessages } from '@base/features/agents/presentation/messages/agent-bot.messages.ts';

  interface Props {
    state: AgentState;
    /** `sm`: a list row (36 px tile). `lg`: the detail header (56 px tile). */
    size?: 'sm' | 'lg';
    class?: string;
  }

  let { state, size = 'sm', class: className }: Props = $props();
</script>

<span
  role="img"
  aria-label={t(agentBotMessages[state])}
  data-state={state}
  data-size={size}
  class={cn('tile', className)}
>
  {#if state === 'running'}
    <span class="ring" aria-hidden="true"></span>
  {/if}
  <svg
    class="bot"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <g class="body">
      <path class="antenna" d="M12 8V4H8" />
      <rect class="head" width="16" height="12" x="4" y="8" rx="2" />
      <path class="ear-l" d="M2 14h2" />
      <path class="ear-r" d="M20 14h2" />
      <path class="eye eye-r" d="M15 13v2" />
      <path class="eye eye-l" d="M9 13v2" />
      {#if state === 'never'}
        <path class="arc arc-near" d="M5.6 3.4 Q6.4 2.1 8.1 2.1" stroke-width="1.6" />
        <path class="arc arc-far" d="M3.4 2.8 Q4.9 0.2 8.2 0.3" stroke-width="1.6" />
      {/if}
    </g>
    {#if state === 'offline' && size === 'lg'}
      <text class="z z-1" x="17.5" y="6.5">z</text>
      <text class="z z-2" x="17.5" y="6.5">z</text>
    {/if}
  </svg>
</span>

<style>
  .tile {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border: 1.5px solid transparent;
  }
  .tile[data-size='sm'] {
    width: 36px;
    height: 36px;
    border-radius: calc(var(--radius) - 2px);
  }
  .tile[data-size='lg'] {
    width: 56px;
    height: 56px;
    border-radius: calc(var(--radius) + 4px);
  }
  .tile[data-size='sm'] .bot {
    width: 20px;
    height: 20px;
  }
  .tile[data-size='lg'] .bot {
    width: 30px;
    height: 30px;
  }
  .bot {
    overflow: visible;
  }
  .ring {
    position: absolute;
    inset: -1.5px;
    border: 1.5px solid var(--info);
    border-radius: inherit;
    opacity: 0;
    pointer-events: none;
  }
  .z {
    fill: currentColor;
    stroke: none;
    font-size: 5px;
    font-weight: 600;
    opacity: 0;
    transform-box: fill-box;
    transform-origin: center;
  }
  .body,
  .antenna {
    transform-box: view-box;
  }
  .eye {
    transform-box: fill-box;
    transform-origin: center;
  }

  .tile[data-state='idle'] {
    color: var(--success);
    background: color-mix(in oklab, var(--success) 14%, transparent);
    border-color: var(--success);
  }
  .tile[data-state='running'] {
    color: var(--info);
    background: color-mix(in oklab, var(--info) 16%, transparent);
    border-color: var(--info);
  }
  .tile[data-state='offline'] {
    color: var(--muted-foreground);
    background: var(--muted);
  }
  .tile[data-state='never'] {
    color: var(--warning);
    background: transparent;
    border-style: dashed;
    border-color: var(--warning);
  }
  .tile[data-state='disabled'] {
    color: var(--destructive);
    background: color-mix(in oklab, var(--destructive) 12%, transparent);
  }

  .tile[data-state='idle'] .body {
    transform-origin: 12px 20px;
    animation: idle-breathe 2.4s ease-in-out infinite;
  }
  .tile[data-state='idle'] .eye {
    animation: idle-blink 2.4s linear infinite;
  }
  .tile[data-state='idle'] .antenna {
    transform-origin: 12px 8px;
    animation: idle-antenna 2.4s linear infinite;
  }
  @keyframes idle-breathe {
    0%,
    100% {
      transform: none;
    }
    50% {
      transform: translateY(-0.7px) scale(0.975, 1.045);
    }
  }
  @keyframes idle-blink {
    0%,
    64.5% {
      transform: scaleY(1);
    }
    68% {
      transform: scaleY(0.1);
    }
    72.5%,
    100% {
      transform: scaleY(1);
    }
  }
  @keyframes idle-antenna {
    0% {
      transform: rotate(0deg);
      animation-timing-function: ease-out;
    }
    10.4% {
      transform: rotate(-14deg);
      animation-timing-function: ease-in-out;
    }
    22.9% {
      transform: rotate(9deg);
      animation-timing-function: cubic-bezier(0.3, 1.4, 0.6, 1);
    }
    37.5%,
    100% {
      transform: rotate(0deg);
    }
  }

  .tile[data-state='running'] .body {
    transform-origin: 12px 20px;
    animation: run-hop 1.2s linear infinite;
  }
  .tile[data-state='running'] .eye {
    animation: run-eyes 1.2s ease-in-out infinite;
  }
  .tile[data-state='running'] .ring {
    animation: run-ring 1.2s ease-out infinite;
  }
  @keyframes run-hop {
    0% {
      transform: none;
      animation-timing-function: ease-out;
    }
    12.5% {
      transform: scale(1.12, 0.86);
      animation-timing-function: cubic-bezier(0.2, 0.7, 0.4, 1);
    }
    35% {
      transform: translateY(-4.6px) scale(0.92, 1.1);
      animation-timing-function: cubic-bezier(0.6, 0, 0.8, 0.4);
    }
    58% {
      transform: scale(1.1, 0.9);
      animation-timing-function: ease-out;
    }
    79% {
      transform: scale(0.98, 1.03);
      animation-timing-function: ease-in-out;
    }
    100% {
      transform: none;
    }
  }
  @keyframes run-eyes {
    0%,
    12.5% {
      transform: none;
    }
    35% {
      transform: translateY(-0.55px);
    }
    58%,
    100% {
      transform: none;
    }
  }
  @keyframes run-ring {
    0%,
    57.9% {
      opacity: 0;
      transform: scale(1);
    }
    58% {
      opacity: 0.7;
      transform: scale(1);
    }
    96%,
    100% {
      opacity: 0;
      transform: scale(1.32);
    }
  }

  .tile[data-state='offline'] .eye {
    transform: scaleY(0.12);
  }
  .tile[data-state='offline'] .body {
    transform-origin: 12px 20px;
    transform: translateY(0.55px) rotate(7deg);
    animation: offline-sway 2.4s ease-in-out infinite;
  }
  .tile[data-state='offline'] .z {
    animation: offline-z 2.4s ease-out infinite;
  }
  .tile[data-state='offline'] .z-2 {
    animation-delay: -1.2s;
  }
  @keyframes offline-sway {
    0%,
    100% {
      transform: translateY(0.55px) rotate(7deg);
    }
    50% {
      transform: translateY(0) rotate(2deg);
    }
  }
  @keyframes offline-z {
    0% {
      opacity: 0;
      transform: translate(0, 0) scale(0.7);
    }
    25% {
      opacity: 0.9;
    }
    100% {
      opacity: 0;
      transform: translate(3px, -4.5px) scale(1);
    }
  }

  .tile[data-state='never'] .body {
    transform-origin: 12px 12px;
    animation: never-tilt 2.4s ease-in-out infinite;
  }
  .tile[data-state='never'] .eye {
    animation: never-look 2.4s ease-in-out infinite;
  }
  .tile[data-state='never'] .arc {
    animation: never-signal 1.2s ease-in-out infinite;
  }
  .tile[data-state='never'] .arc-far {
    animation-delay: 0.25s;
  }
  @keyframes never-tilt {
    0%,
    100% {
      transform: rotate(0deg);
    }
    25% {
      transform: rotate(-9deg);
    }
    75% {
      transform: rotate(9deg);
    }
  }
  @keyframes never-look {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-0.74px);
    }
    75% {
      transform: translateX(0.74px);
    }
  }
  @keyframes never-signal {
    0%,
    100% {
      opacity: 0.15;
    }
    35% {
      opacity: 1;
    }
    70% {
      opacity: 0.15;
    }
  }

  .tile[data-state='disabled'] .body {
    transform-origin: 12px 20px;
    transform: translateY(0.9px) scaleY(0.95);
    animation: disabled-shiver 2.4s linear infinite;
  }
  .tile[data-state='disabled'] .eye {
    opacity: 0.22;
    animation: disabled-flicker 2.4s steps(1, end) infinite;
  }
  @keyframes disabled-shiver {
    0%,
    72%,
    79%,
    100% {
      transform: translateY(0.9px) scaleY(0.95);
    }
    73.75% {
      transform: translate(0.55px, 0.9px) scaleY(0.95);
    }
    75.5% {
      transform: translate(-0.55px, 0.9px) scaleY(0.95);
    }
    77.25% {
      transform: translate(0.55px, 0.9px) scaleY(0.95);
    }
  }
  @keyframes disabled-flicker {
    0%,
    72.9% {
      opacity: 0.22;
    }
    73% {
      opacity: 1;
    }
    75.8% {
      opacity: 0.22;
    }
    78.3% {
      opacity: 0.85;
    }
    81.7%,
    100% {
      opacity: 0.22;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tile *,
    .tile .ring {
      animation: none !important;
    }
    .tile[data-state='offline'] .z-1 {
      opacity: 0.8;
    }
  }
</style>
