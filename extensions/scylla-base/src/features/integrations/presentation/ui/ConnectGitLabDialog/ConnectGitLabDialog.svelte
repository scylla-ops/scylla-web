<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { connectGitLabMessages as messages } from '@base/features/integrations/presentation/messages/connect-gitlab.messages.ts';
  import GitLabTokenFlow from './GitLabTokenFlow.svelte';
  import type { GitLabTokenTarget } from './gitlab-token.state.svelte.ts';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    target: GitLabTokenTarget;
  }

  let { open, onOpenChange, target }: Props = $props();

  const title = $derived(
    target.connection
      ? t(messages.replaceTitle(target.connection.account))
      : t(messages.title),
  );
  const description = $derived(
    t(target.connection ? messages.replaceDescription : messages.description),
  );
</script>

<!-- `button`: a stray Escape or click must not lose a token that the user pasted. -->
<ScyllaDialog {open} {onOpenChange} {title} {description} dismissible="button" class="sm:max-w-lg">
  <GitLabTokenFlow {target} onClose={() => onOpenChange(false)} />
</ScyllaDialog>
