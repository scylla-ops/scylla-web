<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { fragmentMutations } from '@base/features/pipeline/presentation/fragment.queries.ts';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
  import PublishForm from './PublishForm.svelte';
  import type { FragmentDetail } from './fragment-detail.state.svelte.ts';

  let { detail }: { detail: FragmentDetail } = $props();

  const publish = createMutation(() => fragmentMutations.publishToMarketplace());

  const close = () => (detail.publishing = null);
</script>

<ScyllaDialog
  open={detail.publishing !== null}
  onOpenChange={open => {
    if (!open) close();
  }}
  title={t(communityMessages.publishTitle(detail.fragment?.name ?? ''))}
  description={t(communityMessages.publishDescription(detail.workspaceName))}
  class="sm:max-w-xl"
>
  {#if detail.fragment && detail.me && detail.publishing !== null}
    <PublishForm
      fragment={detail.fragment}
      scope={detail.scope}
      workspace={detail.workspaceName}
      version={detail.publishing}
      pending={publish.isPending}
      onCancel={close}
      onPublish={input => publish.mutate({ ...input, author: detail.me! }, { onSuccess: close })}
    />
  {/if}
</ScyllaDialog>
