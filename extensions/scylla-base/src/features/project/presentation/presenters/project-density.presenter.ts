import type { MessageDescriptor } from '@lingui/core';
import type { DropSlotShape, GhostItemShape } from '@scylla/ui';
import { projectMessages } from '../messages/project.messages.ts';
import type { SectionKey } from './project-sections.presenter.ts';

/**
 * How a section shows its projects: the card with its pipelines, a smaller card, one row for each
 * project, or a small tile (an overview of the health).
 */
export type ProjectDensity = 'comfortable' | 'compact' | 'list' | 'tiles';

export const PROJECT_DENSITIES = [
  'comfortable',
  'compact',
  'list',
  'tiles',
] as const satisfies readonly ProjectDensity[];
export const DEFAULT_DENSITY: ProjectDensity = 'comfortable';

/** The choice of a person for one workspace: the density of the page, and of some sections. */
export interface DensityChoice {
  default: ProjectDensity;
  /** A section with its own density: `pins`, `ungrouped` or the id of a group. */
  sections: Record<SectionKey, ProjectDensity>;
}

export const NO_CHOICE: DensityChoice = { default: DEFAULT_DENSITY, sections: {} };

export const isDensity = (value: unknown): value is ProjectDensity =>
  PROJECT_DENSITIES.some(density => density === value);

/** A choice as the server or the local copy gives it; null when this build cannot read it. */
export const decodeDensityChoice = (value: unknown): DensityChoice | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const { default: page, sections } = value as Record<string, unknown>;
  if (!isDensity(page)) return null;
  if (typeof sections !== 'object' || sections === null || Array.isArray(sections)) return null;
  return {
    default: page,
    sections: Object.fromEntries(
      Object.entries(sections as Record<string, unknown>).filter(
        (entry): entry is [string, ProjectDensity] => isDensity(entry[1]),
      ),
    ),
  };
};

/** The density of a section: its own, else the density of the page. */
export const densityOf = (choice: DensityChoice, key: SectionKey): ProjectDensity =>
  choice.sections[key] ?? choice.default;

/** A section takes a density. The density of the page is no override: the section follows it. */
export const withSectionDensity = (
  choice: DensityChoice,
  key: SectionKey,
  density: ProjectDensity,
): DensityChoice => {
  const sections = Object.fromEntries(
    Object.entries(choice.sections).filter(([other]) => other !== key),
  );
  return {
    default: choice.default,
    sections: density === choice.default ? sections : { ...sections, [key]: density },
  };
};

/** The density of the page. A section with its own density keeps it. */
export const withDefaultDensity = (
  choice: DensityChoice,
  density: ProjectDensity,
): DensityChoice => ({
  default: density,
  sections: Object.fromEntries(
    Object.entries(choice.sections).filter(([, own]) => own !== density),
  ),
});

/** « Apply to all sections »: each section takes the density of the page. */
export const withoutOverrides = (choice: DensityChoice): DensityChoice => ({
  default: choice.default,
  sections: {},
});

/** What a density shows in the menus. */
export const DENSITY_LABELS: Record<ProjectDensity, MessageDescriptor> = {
  comfortable: projectMessages.densityComfortable,
  compact: projectMessages.densityCompact,
  list: projectMessages.densityList,
  tiles: projectMessages.densityTiles,
};

/** The grid of a section in each density. A card needs about 300 px, a tile about 140 px. */
export const DENSITY_GRIDS: Record<ProjectDensity, string> = {
  comfortable: 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3',
  compact: 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4',
  list: 'grid grid-cols-1 gap-2',
  tiles: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
};

/** The skeleton of one item while a section loads. */
export const DENSITY_SKELETONS: Record<ProjectDensity, string> = {
  comfortable: 'h-60 w-full rounded-xl',
  compact: 'h-24 w-full rounded-xl',
  list: 'h-12 w-full rounded-lg',
  tiles: 'h-28 w-full rounded-xl',
};

/** The shape of the slot of a dragged card, and of the ghost card « New project ». */
export const DENSITY_SLOTS: Record<ProjectDensity, DropSlotShape> = {
  comfortable: 'card',
  compact: 'card',
  list: 'row',
  tiles: 'tile',
};
export const DENSITY_GHOSTS: Record<ProjectDensity, GhostItemShape> = {
  comfortable: 'card',
  compact: 'card',
  list: 'row',
  tiles: 'tile',
};

/**
 * The cards of the first batch and of each "Show more": the denser the section, the more items.
 * Two rows on a desktop, a short screen on a phone.
 */
const BATCHES: Record<ProjectDensity, { first: number; phone: number; more: number }> = {
  comfortable: { first: 6, phone: 3, more: 12 },
  compact: { first: 12, phone: 6, more: 24 },
  list: { first: 20, phone: 10, more: 40 },
  tiles: { first: 24, phone: 12, more: 48 },
};

export const firstCardsOf = (density: ProjectDensity, phone: boolean): number =>
  phone ? BATCHES[density].phone : BATCHES[density].first;

export const moreCardsOf = (density: ProjectDensity): number => BATCHES[density].more;
