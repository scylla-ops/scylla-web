import type { PipelineStepEntity } from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';
import { nameOf, parseScript, stepsOf, withName, withSteps } from '@base/features/pipeline/presentation/mappers/pipeline-document.mapper.ts';

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
  const steps = $derived(stepsOf(parsed.document));
  const pipelineName = $derived(nameOf(parsed.document));
  const isValid = $derived(parsed.document !== null && parsed.error === null);
  const isDirty = $derived(script !== baseline);

  return {
    get script() {
      return script;
    },
    get steps() {
      return steps;
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

    setScript(next: string) {
      script = next;
    },

    setSteps(next: PipelineStepEntity[]) {
      script = withSteps(parsed.document, next, params.projectId());
    },

    setName(name: string) {
      const renamed = withName(parsed.document, name);
      if (renamed !== null) script = renamed;
    },
  };
};

export type PipelineDocument = ReturnType<typeof createPipelineDocument>;
