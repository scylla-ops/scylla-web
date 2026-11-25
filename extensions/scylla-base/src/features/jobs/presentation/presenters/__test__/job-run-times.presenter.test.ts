import { describe, it, expect } from 'vitest';
import { formatDate, formatTime } from '@shared/utils/date-utils.ts';
import { runTimes } from '../job-run-times.presenter.ts';

const CREATED = '2026-01-01T12:00:00.000Z';
const STARTED = '2026-01-01T12:00:02.000Z';
const FINISHED = '2026-01-01T12:00:47.000Z';

describe('runTimes', () => {
  it('gives the date of the creation, then only the hour of a time on the same day', () => {
    expect(runTimes({ createdAt: CREATED, startedAt: STARTED, finishedAt: FINISHED })).toEqual([
      { kind: 'created', full: formatDate(CREATED), text: formatDate(CREATED) },
      { kind: 'started', full: formatDate(STARTED), text: formatTime(STARTED) },
      { kind: 'finished', full: formatDate(FINISHED), text: formatTime(FINISHED) },
    ]);
  });

  it('gives the date of a time on another day than the creation', () => {
    const finishedAt = '2026-01-03T12:00:00.000Z';

    expect(runTimes({ createdAt: CREATED, startedAt: STARTED, finishedAt }).at(-1)).toEqual({
      kind: 'finished',
      full: formatDate(finishedAt),
      text: formatDate(finishedAt),
    });
  });

  it('leaves out a time that the run does not have yet', () => {
    expect(runTimes({ createdAt: CREATED }).map(time => time.kind)).toEqual(['created']);
  });
});
