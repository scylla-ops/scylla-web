<script lang="ts">
  import { createGitLabToken, type GitLabTokenTarget } from './gitlab-token.state.svelte.ts';
  import GitLabTokenForm from './GitLabTokenForm.svelte';
  import GitLabTokenResult from './GitLabTokenResult.svelte';

  interface Props {
    target: GitLabTokenTarget;
    onClose: () => void;
  }

  let { target, onClose }: Props = $props();

  // Built at each opening of the dialog: the token and the result of the last opening are gone.
  const form = createGitLabToken(() => target);
  const now = Date.now();
</script>

{#if form.result}
  <GitLabTokenResult result={form.result} warnings={form.warnings(now)} {now} onDone={onClose} />
{:else}
  <GitLabTokenForm {form} onCancel={onClose} />
{/if}
