<script module lang="ts">
  import { SecretRevealDialog } from '@scylla/ui';
  import { Button, CodeSnippet } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({
    title: 'Feedback/SecretRevealDialog',
    component: SecretRevealDialog,
    parameters: { layout: 'fullscreen' },
  });
</script>

<script lang="ts">
  let open = $state(true);
</script>

{#snippet run()}
  <CodeSnippet value="scylla agent run --token $SCYLLA_TOKEN" />
{/snippet}

{#snippet reopen()}
  <div class="p-4"><Button variant="outline" onclick={() => (open = true)}>Open again</Button></div>
{/snippet}

<Story name="With a second step" asChild>
  {@render reopen()}
  <SecretRevealDialog
    {open}
    title="Your agent is ready"
    description="Copy the token now. You cannot see it again."
    secret="sk_live_51H8x2dLkq9Zr7"
    secretLabel="agent-eu-1"
    secondStep={{ title: 'Run the agent', content: run }}
    footerNote="You can make a new token on the page of the agent."
    onClose={() => (open = false)}
  />
</Story>

<Story name="With a note" asChild>
  {@render reopen()}
  <SecretRevealDialog
    {open}
    title="Your token is ready"
    description="Copy the token now. You cannot see it again."
    secret="sk_live_51H8x2dLkq9Zr7"
    secretLabel="ci-token"
    revealedNote="Keep it in the secrets of your CI."
    onClose={() => (open = false)}
  />
</Story>
