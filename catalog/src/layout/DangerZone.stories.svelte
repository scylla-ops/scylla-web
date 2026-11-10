<script module lang="ts">
  import { DangerZone } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const { Story } = defineMeta({ title: 'Layout/DangerZone', component: DangerZone });
</script>

{#snippet deleteProject()}<Button variant="destructive">Delete the project</Button>{/snippet}

{#snippet archive()}<Button variant="destructive">Archive</Button>{/snippet}

<Story name="With content" asChild>
  <DangerZone
    title="Danger zone"
    description="These actions cannot be undone."
    action={deleteProject}
    class="max-w-2xl"
  >
    <p class="text-sm text-muted-foreground">
      The pipelines, the secrets and the runs of the project go too.
    </p>
  </DangerZone>
</Story>

<Story name="Header only" asChild>
  <DangerZone title="Archive the workspace" action={archive} class="max-w-2xl" />
</Story>
