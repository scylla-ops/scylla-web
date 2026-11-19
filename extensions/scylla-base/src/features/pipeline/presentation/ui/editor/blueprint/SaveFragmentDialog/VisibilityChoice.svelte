<script lang="ts">
  import Building2Icon from '@lucide/svelte/icons/building-2';
  import GlobeIcon from '@lucide/svelte/icons/globe';
  import { RadioGroup, RadioGroupItem } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';

  interface Props {
    workspaceName: string;
  }

  let { workspaceName }: Props = $props();
</script>

<!-- The community is the next step: the choice is shown, and not offered yet. -->
<section class="flex flex-col gap-1.5">
  <h3 class="text-sm">{t(libraryMessages.visibility)}</h3>
  <RadioGroup value="workspace" class="grid gap-3 sm:grid-cols-2">
    <label class="flex items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3">
      <RadioGroupItem value="workspace" />
      <Building2Icon class="size-4 text-muted-foreground" />
      <span class="text-sm">
        <span class="block font-medium">{t(libraryMessages.visibilityOrganization)}</span>
        <span class="text-xs text-muted-foreground">
          {t(libraryMessages.visibilityOrganizationDetail(workspaceName))}
        </span>
      </span>
    </label>
    <label class="flex items-center gap-3 rounded-lg border p-3 opacity-60">
      <RadioGroupItem value="community" disabled />
      <GlobeIcon class="size-4 text-muted-foreground" />
      <span class="text-sm">
        <span class="flex items-center gap-1.5 font-medium">
          {t(libraryMessages.visibilityCommunity)}
          <span class="rounded-full border px-1.5 text-[10.5px] font-medium">{t(libraryMessages.soon)}</span>
        </span>
        <span class="text-xs text-muted-foreground">{t(libraryMessages.visibilityCommunityDetail)}</span>
      </span>
    </label>
  </RadioGroup>
</section>
