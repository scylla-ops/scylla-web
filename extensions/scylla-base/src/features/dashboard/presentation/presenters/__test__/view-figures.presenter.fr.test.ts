import { describe, it, expect } from 'vitest';
import { messages } from '@base/features/dashboard/locales/fr/messages.ts';
import { t } from '@scylla/ui/i18n';
import { withLocale } from '@test/i18n.ts';
import { viewMessages } from '@base/features/dashboard/presentation/messages/widgets-view.messages.ts';
import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
import { loadText } from '../agent-widget.presenter.ts';
import { durationChange, durationText, rateText } from '../job-figures.presenter.ts';
import { weekdayNames } from '../heatmap.presenter.ts';
import { countText, dateLine, perBucketText } from '../view-figures.presenter.ts';

withLocale('fr', messages);

/** French puts a no-break space, U+00A0 or U+202F after the version of ICU. */
const spaced = (text: string): string => text.replace(/\s/gu, ' ');

describe('the figures of the dashboard in French', () => {
  it('writes a decimal with a comma', () => {
    expect(perBucketText(7, 10, 'day')).toBe('0,7 par jour');
  });

  it('writes a percent and a large number as French does', () => {
    expect(spaced(rateText(146 / 164))).toBe('89 %');
    expect(spaced(durationChange(176, 200)?.label ?? '')).toBe('−12 %');
    expect(spaced(countText(1312))).toBe('1 312');
  });

  it('writes a load and a duration as French does', () => {
    expect(spaced(loadText(45))).toBe('45 %');
    expect(spaced(durationText(19))).toBe('19 s');
  });

  it('counts the jobs of the last 24 hours with the plural of French', () => {
    expect(t(viewMessages.jobsAndFailed(1, 0))).toBe('1 job · 0 en échec');
    expect(t(viewMessages.jobsAndFailed(3, 1))).toBe('3 jobs · 1 en échec');
  });

  it('names the outcomes of the legends, in the plural', () => {
    const { completed, failed, orphaned } = widgetMessages;
    expect([completed, failed, orphaned].map(t)).toEqual(['Terminés', 'Échoués', 'Orphelins']);
  });

  it('writes the day in French', () => {
    expect(spaced(dateLine(new Date('2026-11-23T10:20:00.000Z'), 'UTC'))).toBe(
      'lundi 23 novembre à 10:20',
    );
  });

  it('names the days in French, from Monday', () => {
    expect(weekdayNames('fr', 'narrow')).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D']);
  });
});
