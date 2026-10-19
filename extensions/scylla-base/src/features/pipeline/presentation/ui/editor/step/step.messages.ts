import { msg } from '@lingui/core/macro';

/** The strings of a step's fields: the blueprint's inspector and the scripting view share them. */
export const stepMessages = {
  stepKind: msg`Step kind`,
  stepId: msg`Step ID`,
  missingCommand: msg`A command is required.`,
  emptyScript: msg`The script is empty.`,
  invalidId: msg`Invalid step ID`,
  idEmpty: msg`The step ID cannot be empty.`,
  idInvalidCharacters: (characters: string) =>
    msg`The step ID cannot contain ${characters}. Use only lowercase letters (a-z), digits, - and _.`,
  idTooLong: (length: number) => msg`The step ID has ${length} characters. The maximum is 128.`,
  suggestedId: msg`Suggested ID`,
  use: msg({ context: 'suggested-id', message: 'Use' }),
  useId: (id: string) => msg`Use ${id}`,
};
