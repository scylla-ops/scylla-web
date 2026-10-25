import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { nameOf, parseScript, nodesOf, withName, withNodes } from '@base/features/pipeline/presentation/mappers/pipeline-document.mapper.ts';
import { pipelineIssue } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';

export interface PipelineDocumentParams {
  projectId: () => string;
  /** A default draft, or a fetched pipeline. */
  initialScript: () => string | undefined;
}

/** The editor's document: the script text is the single source of truth for both tabs. */
export const createPipelineDocument = (params: PipelineDocumentParams) => {
  let script = $state('');
  /** The saved state: the dirty check compares against it. */
  let baseline = $state('');

  // The document arrives after the first render; later edits must be kept.
  $effect(() => {
    const initial = params.initialScript();
    if (initial === undefined) return;

    baseline = initial;
    script = initial;
  });

  const parsed = $derived(parseScript(script));
  const nodes = $derived(nodesOf(parsed.document));
  const pipelineName = $derived(nameOf(parsed.document));
  const isValid = $derived(parsed.document !== null && parsed.error === null);
  const isDirty = $derived(script !== baseline);
  /** What stops the save: the rules of the domain, on the document as it is. */
  const issue = $derived(isValid ? pipelineIssue({ name: pipelineName, nodes }) : null);

  return {
    get script() {
      return script;
    },
    get nodes() {
      return nodes;
    },
    get pipelineName() {
      return pipelineName;
    },
    get parseError() {
      return parsed.error;
    },
    get isValid() {
      return isValid;
    },
    get isDirty() {
      return isDirty;
    },
    get issue() {
      return issue;
    },

    setScript(next: string) {
      script = next;
    },

    setNodes(next: PipelineNodeEntity[]) {
      script = withNodes(parsed.document, next, params.projectId());
    },

    setName(name: string) {
      const renamed = withName(parsed.document, name);
      if (renamed !== null) script = renamed;
    },
  };
};

export type PipelineDocument = ReturnType<typeof createPipelineDocument>;
