<script lang="ts">
  import StarIcon from '@lucide/svelte/icons/star';
  import { createMutation } from '@scylla/core-sdk';
  import { Button } from '@scylla/ui/primitives';
  import { IconButton } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { FragmentEntity } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { fragmentMutations } from '@base/features/pipeline/presentation/fragment.queries.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';

  interface Props {
    fragment: FragmentEntity;
    /** With its label: the header of the fragment page. */
    labelled?: boolean;
  }

  let { fragment, labelled = false }: Props = $props();

  const setFavorite = createMutation(() => fragmentMutations.setFavorite(fragment.workspaceId));
  const label = $derived(t(fragment.favorite ? libraryMessages.unfavorite : libraryMessages.favorite));
  const toggle = (event: MouseEvent) => {
    // On a card, the click would open the fragment.
    event.stopPropagation();
    setFavorite.mutate({ id: fragment.id, favorite: !fragment.favorite });
  };
</script>

{#snippet star()}
  <StarIcon class={cn('size-4', fragment.favorite && 'fill-warning text-warning')} />
{/snippet}

{#if labelled}
  <Button variant="outline" aria-pressed={fragment.favorite} onclick={toggle}>
    {@render star()}
    {t(libraryMessages.favorite)}
  </Button>
{:else}
  <IconButton
    icon={StarIcon}
    tooltip={label}
    onclick={toggle}
    class="size-7"
    iconClass={cn('size-4', fragment.favorite && 'fill-warning text-warning')}
  />
{/if}
