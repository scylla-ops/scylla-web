import type { StepDefinition } from '../entities/pipeline-step.entity.ts';

/** A ready-made step that the editor offers. Built in today; the backend can serve them later. */
export interface StepTemplate {
  id: string;
  /** Shown as is: a tool name such as `npm ci` reads the same in every language. */
  name: string;
  /** The id the new step proposes; the canvas makes it unique. */
  stepId: string;
  /** A hint for the icon. An unknown value falls back to the icon of the step's kind. */
  icon?: string;
  definition: StepDefinition;
}
