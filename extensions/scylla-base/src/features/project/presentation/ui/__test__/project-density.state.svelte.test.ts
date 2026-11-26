import { describe, it, expect, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { PROJECT_DENSITY_KEY, projectDensity } from '../../project-density.user-state.ts';
import { PINS, UNGROUPED } from '../../presenters/project-sections.presenter.ts';
import { createProjectDensity, type ProjectDensityState } from '../project-density.state.svelte.ts';

let cleanups: Array<() => void> = [];

const densitiesOf = (workspaceId = 'org-1'): ProjectDensityState => {
  let state!: ProjectDensityState;
  cleanups.push(
    $effect.root(() => {
      state = createProjectDensity(() => workspaceId);
    }),
  );
  flushSync();
  return state;
};

const stored = () => JSON.parse(localStorage.getItem(PROJECT_DENSITY_KEY) ?? 'null') as unknown;

afterEach(() => {
  cleanups.forEach(cleanup => cleanup());
  cleanups = [];
  localStorage.clear();
});

describe('createProjectDensity', () => {
  it('shows the comfortable cards in each section when the person chose nothing', () => {
    const densities = densitiesOf();

    expect(densities.default).toBe('comfortable');
    expect(densities.of(PINS)).toBe('comfortable');
    expect(densities.mixed).toBe(false);
  });

  it('gives one section its own density, and keeps it for the next visit', () => {
    densitiesOf().setSection('g-1', 'list');

    const next = densitiesOf();
    expect(next.of('g-1')).toBe('list');
    expect(next.of(UNGROUPED)).toBe('comfortable');
    expect(next.owns('g-1')).toBe(true);
    expect(next.mixed).toBe(true);
  });

  it('changes the density of the page for the sections with no density of their own', () => {
    const densities = densitiesOf();
    densities.setSection(PINS, 'tiles');
    densities.setDefault('compact');

    expect(densities.of(UNGROUPED)).toBe('compact');
    expect(densities.of(PINS)).toBe('tiles');
  });

  it('gives each section the density of the page with « Apply to all sections »', () => {
    const densities = densitiesOf();
    densities.setDefault('list');
    densities.setSection('g-1', 'tiles');
    densities.applyToAll();

    expect(densities.of('g-1')).toBe('list');
    expect(densities.mixed).toBe(false);
    expect(stored()).toEqual({ 'org-1': { default: 'list', sections: {} } });
  });

  it('keeps one choice for each workspace', () => {
    densitiesOf('org-1').setDefault('tiles');

    expect(densitiesOf('org-2').default).toBe('comfortable');
    expect(densitiesOf('org-1').default).toBe('tiles');
  });

  it('shows a choice that comes later, as the value of the server after the first paint', () => {
    const densities = densitiesOf();

    projectDensity.save('org-1', { default: 'compact', sections: { [PINS]: 'list' } });
    flushSync();

    expect(densities.default).toBe('compact');
    expect(densities.of(PINS)).toBe('list');
  });
});
