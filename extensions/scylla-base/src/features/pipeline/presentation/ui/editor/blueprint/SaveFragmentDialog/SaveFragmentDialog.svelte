<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { FragmentEntity } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import type { EditorLibrary } from '../editor-library.state.svelte.ts';
  import SaveFragmentForm from './SaveFragmentForm.svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    nodes: PipelineNodeEntity[];
    library: EditorLibrary;
    pipelineName: string;
    onSaved: (fragment: FragmentEntity, replace: boolean) => void;
  }

  let { open, onOpenChange, nodes, library, pipelineName, onSaved }: Props = $props();
</script>

<ScyllaDialog
  {open}
  {onOpenChange}
  title={t(libraryMessages.saveTitle)}
  description={t(libraryMessages.saveDescription(nodes.length, library.workspaceName))}
  class="sm:max-w-xl"
>
  <!-- Built again at each opening: the draft starts from the selection of that moment. -->
  <SaveFragmentForm
    {nodes}
    {library}
    {pipelineName}
    onSaved={(fragment, replace) => {
      onSaved(fragment, replace);
      onOpenChange(false);
    }}
    onCancel={() => onOpenChange(false)}
  />
</ScyllaDialog>
