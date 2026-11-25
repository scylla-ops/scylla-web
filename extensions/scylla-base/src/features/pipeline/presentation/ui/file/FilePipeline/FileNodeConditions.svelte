<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';
  import type { NodeDetails } from '@base/features/pipeline/presentation/presenters/node-details.presenter.ts';

  interface Props {
    details: NodeDetails;
  }

  let { details }: Props = $props();
</script>

<!-- The cases of a switch, read only: the port that each one opens and the rules it matches. -->
{#if details.cases.length}
  <section class="flex flex-col gap-1.5">
    <h3 class="text-[11px] tracking-wider text-muted-foreground uppercase">
      {t(nodeMessages.cases)}
    </h3>
    <ul class="flex flex-col gap-2">
      {#each details.cases as item (item.port)}
        <li class="flex flex-col gap-1.5 rounded-lg border px-3 py-2">
          <div class="flex items-center justify-between gap-3">
            <span class="rounded-md border bg-accent px-1.5 py-0.5 font-mono text-[11.5px]">
              {item.port}
            </span>
            <span class="text-xs text-muted-foreground">
              {t(nodeMessages.matchRules)} · {item.match}
            </span>
          </div>
          <ul class="flex flex-col gap-1 font-mono text-[12px]">
            {#each item.rules as rule, index (index)}
              <li class="break-words">{rule}</li>
            {/each}
          </ul>
        </li>
      {/each}
    </ul>
    {#if details.allMatches}
      <p class="text-xs text-muted-foreground">{details.allMatches}</p>
    {/if}
  </section>
{/if}
