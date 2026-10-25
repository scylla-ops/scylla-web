import { t } from '@scylla/ui/i18n';
import type { PipelineIssue } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import { pipelineMessages } from '../messages/pipeline.messages.ts';

/** Says why the pipeline cannot be saved. */
export const pipelineIssueText = (issue: PipelineIssue): string => {
  if (issue.kind === 'step-ids') return t(pipelineMessages.invalidStepIds(issue.ids.join(', ')));
  return t(issue.issue === 'empty' ? pipelineMessages.nameRequired : pipelineMessages.noSpaces);
};
