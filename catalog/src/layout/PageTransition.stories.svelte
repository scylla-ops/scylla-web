<script module lang="ts">
  import { PageTransition } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  const PAGES = ['Dashboard', 'Pipelines', 'Secrets'];

  const { Story } = defineMeta({ title: 'Layout/PageTransition', component: PageTransition });
</script>

<script lang="ts">
  let page = $state(PAGES[0]);
</script>

<Story name="Change of page" asChild>
  <div class="grid gap-4">
    <div class="flex gap-2">
      {#each PAGES as name (name)}
        <Button variant={name === page ? 'default' : 'outline'} size="sm" onclick={() => (page = name)}>
          {name}
        </Button>
      {/each}
    </div>
    <div class="relative h-48 max-w-xl overflow-hidden rounded-xl border">
      <PageTransition key={page}>
        <div class="p-6">
          <h2 class="text-lg">{page}</h2>
          <p class="text-sm text-muted-foreground">Each change of key plays the transition again.</p>
        </div>
      </PageTransition>
    </div>
  </div>
</Story>
