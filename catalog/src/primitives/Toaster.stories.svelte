<script module lang="ts">
  import { Button, Toaster } from '@scylla/ui/primitives';
  import { toast } from '@scylla/ui/utils';
  import { defineMeta } from '@storybook/addon-svelte-csf';

  interface Options {
    duration?: number;
  }

  const KINDS = {
    success: (options?: Options) => toast.success('The pipeline is saved.', options),
    info: (options?: Options) => toast.info('A new version is ready.', options),
    warning: (options?: Options) => toast.warning('The agent is offline.', options),
    error: (options?: Options) => toast.error('The server does not answer.', options),
    loading: (options?: Options) => toast.loading('Saving…', options),
    description: (options?: Options) =>
      toast('Copied', { description: 'The id is in the clipboard.', ...options }),
  };

  /** The toasts of the entry stay: they have no end. */
  const showAll = () => {
    for (const show of Object.values(KINDS)) show({ duration: Number.POSITIVE_INFINITY });
  };

  const { Story } = defineMeta({ title: 'Primitives/Toaster', component: Toaster });
</script>

<Story name="Kinds" asChild>
  <Toaster expand visibleToasts={6} />
  <div class="flex flex-wrap gap-2" {@attach showAll}>
    {#each Object.entries(KINDS) as [kind, show] (kind)}
      <Button variant="outline" onclick={() => show()}>{kind}</Button>
    {/each}
  </div>
</Story>
