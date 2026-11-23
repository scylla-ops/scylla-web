<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { fade } from 'svelte/transition';
  import LogoMarkImage from '@scylla/ui/assets/logo_mark.svg';
  import LogoMark from '@shared/presentation/ui/layout/LogoMark/LogoMark.svelte';
  import { ARRIVAL_MS, arrival } from './arrival.state.svelte.ts';
  import { arrive } from './arrival.attachments.svelte.ts';

  arrival.comeBack();
</script>

<svelte:window onpageshow={arrival.pageShown} />

<!--
  After a sign-in with a provider, from the first frame: the frame of the sign-in page, with no
  column, over the app that starts. The curtain then closes over it.
-->
{#if arrival.hidesApp}
  <div aria-hidden="true" data-slot="arrival-back" class="fixed inset-0 z-100 flex bg-sidebar">
    <div
      class="flex w-2/5 shrink-0 items-center justify-center border-r border-sidebar-border bg-sidebar"
    >
      <LogoMark state={arrival.phase === 'back' ? 'idle' : 'lit'} class="size-70" />
    </div>
  </div>
{/if}

<!--
  Over each page, after a sign-in: it keeps the panel and the mark of the sign-in page while the
  app loads under it. The core renders it after the router: the page is before it in the DOM.
-->
{#if arrival.covers && arrival.mode === 'curtain'}
  <div
    aria-hidden="true"
    data-slot="arrival"
    class="fixed inset-0 z-100"
    class:pointer-events-none={arrival.phase === 'landing' || arrival.phase === 'arrived'}
    {@attach arrive(
      () => arrival.phase === 'landing',
      () => arrival.targetBox,
    )}
  >
    <!-- At the start, the panel and the mark are where the sign-in page shows them. -->
    <div
      data-part="arrival-panel"
      class="absolute inset-y-0 left-0 w-2/5 border-r border-sidebar-border bg-sidebar"
    >
      <span
        data-part="arrival-separator"
        class="absolute inset-y-0 -right-px w-px bg-primary opacity-0"
      ></span>
    </div>
    <div data-part="arrival-flight" class="absolute inset-0">
      <img
        data-part="arrival-mark"
        src={LogoMarkImage}
        alt=""
        class="absolute top-1/2 left-1/5 -mt-35 -ml-35 size-70 max-w-none"
      />
    </div>
  </div>
{/if}

<!--
  Below lg, or with reduced motion: a 200 ms fade in, and a 200 ms fade out to the app. After a
  sign-in with a provider, the veil is on the first frame, with no fade in.
-->
{#if arrival.covers && arrival.mode === 'fade'}
  <div
    aria-hidden="true"
    data-slot="arrival"
    class="fixed inset-0 z-100 flex items-center justify-center bg-sidebar"
    transition:fade={{ duration: ARRIVAL_MS.fade, easing: cubicOut }}
  >
    <img src={LogoMarkImage} alt="" class="size-24 lg:size-70" />
  </div>
{/if}
