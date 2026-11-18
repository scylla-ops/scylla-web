<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import XIcon from '@lucide/svelte/icons/x';
  import { Badge, Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { type AppHost, featureFixOf } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  interface Props {
    host: AppHost;
    /** The features that the server can need and that the agent does not tell. */
    missing: string[];
  }

  let { host, missing }: Props = $props();

  const fixOf = (feature: string) =>
    featureFixOf(host, feature) === 'install-git' ? messages.installGit : messages.updateForFeature;
</script>

{#each host.features as feature (feature)}
  <Badge class="h-4.5 pl-[7px]">
    <CheckIcon aria-hidden="true" />
    <span class="[text-box:trim-both_cap_alphabetic]">{feature}</span>
  </Badge>
{/each}
{#each missing as feature (feature)}
  <Tooltip>
    <TooltipTrigger>
      {#snippet child({ props })}
        <Badge {...props} tabindex={0} variant="warning" class="h-4.5 pl-1.5">
          <XIcon aria-hidden="true" />
          <span class="[text-box:trim-both_cap_alphabetic]">{feature}</span>
        </Badge>
      {/snippet}
    </TooltipTrigger>
    <TooltipContent><p>{t(fixOf(feature))}</p></TooltipContent>
  </Tooltip>
{/each}
{#if !host.features.length && !missing.length}
  <Badge variant="secondary" class="h-4.5 text-muted-foreground">
    <span class="[text-box:trim-both_cap_alphabetic]">{t(messages.noFeature)}</span>
  </Badge>
{/if}
