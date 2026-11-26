<script lang="ts">
  import { imageUrl } from '@platform/grpc';
  import type { LucideIcon } from '@scylla/ui';
  import { cn } from '@scylla/ui/utils';
  import { IdentityAvatar, WorkspaceIcon } from '@shared/presentation/ui';
  import type { RowMark } from '../../presenters/row-mark.presenter.ts';

  interface Props {
    mark: RowMark;
    /** The glyph of the kind of the row: it shows when no actor acted. */
    icon: LucideIcon;
    /** The surface under the row: the ring of the workspace icon has its color. */
    surface: 'background' | 'popover';
  }

  let { mark, icon: Icon, surface }: Props = $props();
</script>

<!-- Who acted, as in the other lists of people, with the icon of the workspace on its corner. The
     text of the row says both: the mark is decorative. The avatar stays on the center line of the
     row; the icon hangs over its corner, and a margin keeps it off the text. -->
<span
  data-part="notification-mark"
  class={cn('relative size-6 shrink-0', mark.workspace && 'mr-1.5')}
  aria-hidden="true"
>
  {#if mark.actor}
    <IdentityAvatar profile={mark.actor.profile} kind={mark.actor.kind} size={24} />
  {:else}
    <span class="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Icon class="size-3.5" />
    </span>
  {/if}
  {#if mark.workspace}
    <span
      data-part="notification-workspace"
      class={cn(
        'absolute -right-1.5 -bottom-1.5 flex rounded-[5px] ring-2',
        surface === 'popover' ? 'ring-popover' : 'ring-background',
      )}
      title={mark.workspace.name}
    >
      <WorkspaceIcon icon={mark.workspace.icon} {imageUrl} size={16} />
    </span>
  {/if}
</span>
