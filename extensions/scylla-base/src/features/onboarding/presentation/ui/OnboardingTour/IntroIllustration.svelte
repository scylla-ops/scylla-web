<script lang="ts">
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import ClockIcon from '@lucide/svelte/icons/clock';
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import ServerIcon from '@lucide/svelte/icons/server';
  import WebhookIcon from '@lucide/svelte/icons/webhook';
  import WorkflowIcon from '@lucide/svelte/icons/workflow';
  import type { IntroSlideKind } from '@base/features/onboarding/presentation/presenters/intro.presenter.ts';

  interface Props {
    kind: IntroSlideKind;
  }

  let { kind }: Props = $props();

  const agents = [
    { name: 'build-01', host: 'ava-dev', dot: 'bg-success' },
    { name: 'build-02', host: 'mac-mini', dot: 'bg-success' },
    { name: 'gpu-01', host: 'rig', dot: 'bg-muted-foreground' },
  ];
  const nodes = [
    { id: 'checkout', run: 'git clone' },
    { id: 'test', run: 'npm test' },
    { id: 'deploy', run: './deploy.sh' },
  ];
  const sources = [
    { icon: GitBranchIcon, text: 'main' },
    { icon: ClockIcon, text: '0 2 * * *' },
    { icon: WebhookIcon, text: 'POST /hooks' },
  ];
</script>

<div
  class="flex h-40 items-center justify-center overflow-hidden rounded-xl border bg-muted/30 p-4"
  aria-hidden="true"
>
  {#if kind === 'agents'}
    <div class="flex w-full max-w-sm flex-col gap-2">
      {#each agents as agent (agent.name)}
        <div class="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
          <ServerIcon class="size-4 text-primary" />
          <span class="font-mono text-xs">{agent.name}</span>
          <span class="text-xs text-muted-foreground">{agent.host}</span>
          <span class="flex-1"></span>
          <span class="size-2 rounded-full {agent.dot}"></span>
        </div>
      {/each}
    </div>
  {:else if kind === 'pipelines'}
    <div class="flex items-center gap-2">
      {#each nodes as node, index (node.id)}
        {#if index > 0}<span class="h-px w-6 bg-border"></span>{/if}
        <div class="flex flex-col gap-1 rounded-lg border bg-card px-3 py-2">
          <span class="flex items-center gap-1.5 text-xs font-semibold">
            <WorkflowIcon class="size-3.5 text-primary" />{node.id}
          </span>
          <span class="font-mono text-[11px] text-muted-foreground">{node.run}</span>
        </div>
      {/each}
    </div>
  {:else if kind === 'triggers'}
    <div class="flex items-center gap-4">
      <div class="flex flex-col gap-2">
        {#each sources as source (source.text)}
          <span class="flex items-center gap-2 rounded-full border bg-card px-3 py-1 font-mono text-xs">
            <source.icon class="size-3.5 text-primary" />{source.text}
          </span>
        {/each}
      </div>
      <ArrowRightIcon class="size-5 text-muted-foreground" />
      <div class="flex items-center gap-2 rounded-lg border border-primary/50 bg-card px-3 py-2">
        <WorkflowIcon class="size-4 text-primary" />
        <span class="font-mono text-xs">my-pipeline</span>
      </div>
    </div>
  {:else}
    <div class="w-full max-w-sm rounded-lg border bg-card p-3 font-mono text-xs leading-relaxed">
      <p class="text-muted-foreground">$ npm test</p>
      <p class="text-success">✓ 128 tests (4.2 s)</p>
      <p class="text-muted-foreground">$ ./deploy.sh</p>
      <p class="text-primary">→ preview</p>
    </div>
  {/if}
</div>
