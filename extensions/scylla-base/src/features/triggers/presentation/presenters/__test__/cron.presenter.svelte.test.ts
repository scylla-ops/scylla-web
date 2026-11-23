import { afterEach, describe, expect, it } from 'vitest';
import { flushSync } from 'svelte';
import { i18n } from '@lingui/core';
import { messages } from '@base/features/triggers/locales/fr/messages.ts';
import type { CronModel } from '@base/features/triggers/presentation/mappers/cron.mapper.ts';
import { describeCron } from '../cron.presenter.ts';

const WEEKDAYS_AT_NINE: CronModel = {
  frequency: 'weekly',
  minute: 0,
  hour: 9,
  weekdays: [1, 2, 3, 4, 5],
  dayOfMonth: 1,
  custom: '',
};

i18n.load('fr', messages);

afterEach(() => i18n.activate('en'));

describe('the summary of a schedule on the page', () => {
  it('follows a switch of the language without a new render', () => {
    let shown = '';
    const stop = $effect.root(() => {
      const summary = $derived(describeCron(WEEKDAYS_AT_NINE));
      $effect(() => {
        shown = summary;
      });
    });
    flushSync();
    expect(shown).toBe('Mon, Tue, Wed, Thu, Fri at 09:00');

    i18n.activate('fr');
    flushSync();

    expect(shown).toBe('Lun, Mar, Mer, Jeu, Ven à 09:00');
    stop();
  });
});
