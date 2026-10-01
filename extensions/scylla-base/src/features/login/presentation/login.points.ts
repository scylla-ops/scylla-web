import { definePoints, point } from '@scylla/core-sdk';
import type { FormItem } from '@scylla/ui';
import { loginMessages } from './ui/login.messages.ts';

/** What the components in the login zones receive. */
export interface LoginZoneContext {
  isPending: boolean;
}

export const loginPoints = definePoints('login', {
  /**
   * Below the card. Receives components; there is no default content.
   * No `permission`: the user has none yet on this page (`widgets_plan.md` §14, question 3).
   */
  footer: point.zone<LoginZoneContext>(),
  /** The title, the description and the labels of the login page. */
  texts: point.texts(loginMessages),
  /**
   * The fields of the credentials form, built with the messages of `texts`.
   * Keep the ids: the submit reads `identifier` and `password`.
   */
  fields: point.value<readonly FormItem<'identifier' | 'password'>[]>(),
});
