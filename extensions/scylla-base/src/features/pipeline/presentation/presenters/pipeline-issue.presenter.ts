import { t } from '@scylla/ui/i18n';
import { PIPELINE_NAME_MAX_LENGTH } from '@base/features/pipeline/domain/structs/pipeline-name.struct.ts';
import type { PipelineNameIssue } from '@base/features/pipeline/domain/structs/pipeline-name.struct.ts';
import type { PipelineIssue } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import type { PipelineFileKey } from '@base/features/pipeline/domain/structs/pipeline-key.struct.ts';
import { pipelineMessages } from '../messages/pipeline.messages.ts';

/** Says why the name is refused. */
export const pipelineNameIssueText = (issue: PipelineNameIssue): string => {
  if (issue === 'empty') return t(pipelineMessages.nameRequired);
  if (issue === 'too-long') return t(pipelineMessages.nameTooLong(PIPELINE_NAME_MAX_LENGTH));
  return t(pipelineMessages.nameOneLine);
};

/** Says why the pipeline cannot be saved. */
export const pipelineIssueText = (issue: PipelineIssue): string => {
  if (issue.kind === 'node-ids') return t(pipelineMessages.invalidNodeIds(issue.ids.join(', ')));
  if (issue.kind === 'nodes') return t(pipelineMessages.invalidNodes(issue.ids.join(', ')));
  if (issue.kind === 'repeated-ids')
    return t(pipelineMessages.repeatedNodeIds(issue.ids.join(', ')));
  return pipelineNameIssueText(issue.issue);
};

/** Says that a pipeline file has the key of the name: the file wins. */
export const pipelineKeyTakenText = (file: PipelineFileKey): string =>
  t(pipelineMessages.keyTaken(file.path || file.key, file.key));
