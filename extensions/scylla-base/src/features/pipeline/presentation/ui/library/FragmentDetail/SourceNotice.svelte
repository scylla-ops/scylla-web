<script lang="ts">
  import LinkIcon from '@lucide/svelte/icons/link';
  import { t } from '@scylla/ui/i18n';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';

  let { reference, workspace }: { reference: string; workspace: string } = $props();
</script>

<!-- A linked fragment is read only: its versions come from the publisher. -->
<div class="flex gap-2.5 rounded-xl border bg-muted/50 p-3 text-xs">
  <LinkIcon class="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
  <div class="flex flex-col gap-0.5">
    <p class="font-medium text-foreground">{t(communityMessages.linkedNoticeTitle(reference))}</p>
    <p class="text-muted-foreground">{t(communityMessages.linkedNotice(workspace))}</p>
  </div>
</div>
