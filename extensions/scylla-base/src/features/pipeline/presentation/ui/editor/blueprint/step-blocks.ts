import type { MessageDescriptor } from '@lingui/core';
import type { NodeFormValue } from '../../../utils/blueprint-converter.ts';
import { blueprintMessages } from './blueprint.messages.ts';

export type StepBlockKey = 'bash' | 'sh' | 'exec';

/** A kind of step the palette offers: what a new step of it starts with. */
export interface StepBlock {
  key: StepBlockKey;
  label: MessageDescriptor;
  hint: MessageDescriptor;
  /** The id a new step asks for; a number is added when it is taken. */
  idPrefix: string;
  value: () => NodeFormValue;
}

export const STEP_BLOCKS: readonly StepBlock[] = [
  {
    key: 'bash',
    label: blueprintMessages.blockBash,
    hint: blueprintMessages.blockBashHint,
    idPrefix: 'script',
    value: () => ({ kind: 'script', script: '', shell: 'bash', env: [] }),
  },
  {
    key: 'sh',
    label: blueprintMessages.blockSh,
    hint: blueprintMessages.blockShHint,
    idPrefix: 'script',
    value: () => ({ kind: 'script', script: '', shell: 'sh', env: [] }),
  },
  {
    key: 'exec',
    label: blueprintMessages.blockCommand,
    hint: blueprintMessages.blockCommandHint,
    idPrefix: 'command',
    value: () => ({ kind: 'exec', command: '', args: [], env: [] }),
  },
];

export const stepBlockOf = (key: string): StepBlock | undefined =>
  STEP_BLOCKS.find(block => block.key === key);
