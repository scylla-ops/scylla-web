// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  decodeDensityChoice,
  densityOf,
  firstCardsOf,
  moreCardsOf,
  NO_CHOICE,
  PROJECT_DENSITIES,
  withDefaultDensity,
  withoutOverrides,
  withSectionDensity,
  type DensityChoice,
} from '../project-density.presenter.ts';
import { PINS, UNGROUPED } from '../project-sections.presenter.ts';

const MIXED: DensityChoice = { default: 'compact', sections: { [PINS]: 'tiles', 'g-1': 'list' } };

describe('the density of a section', () => {
  it('is the comfortable card when the person chose nothing', () => {
    expect(densityOf(NO_CHOICE, 'g-1')).toBe('comfortable');
  });

  it('is its own density, else the density of the page', () => {
    expect(densityOf(MIXED, PINS)).toBe('tiles');
    expect(densityOf(MIXED, 'g-1')).toBe('list');
    expect(densityOf(MIXED, UNGROUPED)).toBe('compact');
  });

  it('keeps a section density only when it is not the density of the page', () => {
    expect(withSectionDensity(MIXED, UNGROUPED, 'tiles').sections).toEqual({
      [PINS]: 'tiles',
      'g-1': 'list',
      [UNGROUPED]: 'tiles',
    });
    // The section follows the page again.
    expect(withSectionDensity(MIXED, 'g-1', 'compact')).toEqual({
      default: 'compact',
      sections: { [PINS]: 'tiles' },
    });
  });

  it('changes the page and keeps the sections with another density of their own', () => {
    expect(withDefaultDensity(MIXED, 'list')).toEqual({
      default: 'list',
      sections: { [PINS]: 'tiles' },
    });
  });

  it('gives each section the density of the page with « Apply to all sections »', () => {
    expect(withoutOverrides(MIXED)).toEqual({ default: 'compact', sections: {} });
  });
});

describe('the choice that the server keeps', () => {
  it('reads a choice, and forgets a section density that this build does not know', () => {
    expect(decodeDensityChoice({ default: 'list', sections: { a: 'tiles', b: 'huge' } })).toEqual(
      { default: 'list', sections: { a: 'tiles' } },
    );
  });

  it('refuses a choice with no density of the page that it knows', () => {
    expect(decodeDensityChoice({ default: 'huge', sections: {} })).toBeNull();
    expect(decodeDensityChoice({ default: 'list' })).toBeNull();
    expect(decodeDensityChoice(['list'])).toBeNull();
    expect(decodeDensityChoice(null)).toBeNull();
  });
});

describe('the batches of each density', () => {
  it('shows more items in a denser section, and fewer on a phone', () => {
    const first = PROJECT_DENSITIES.map(density => firstCardsOf(density, false));
    const more = PROJECT_DENSITIES.map(moreCardsOf);

    expect(first).toEqual([6, 12, 20, 24]);
    expect(more).toEqual([12, 24, 40, 48]);
    for (const density of PROJECT_DENSITIES) {
      expect(firstCardsOf(density, true)).toBeLessThan(firstCardsOf(density, false));
    }
  });
});
