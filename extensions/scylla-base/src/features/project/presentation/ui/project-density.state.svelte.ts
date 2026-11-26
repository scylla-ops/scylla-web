import { projectDensity } from '../project-density.user-state.ts';
import {
  densityOf,
  withDefaultDensity,
  withoutOverrides,
  withSectionDensity,
  type DensityChoice,
  type ProjectDensity,
} from '../presenters/project-density.presenter.ts';
import type { SectionKey } from '../presenters/project-sections.presenter.ts';

/**
 * The densities of the projects page of a workspace: the density of the page, which the toolbar
 * sets, and the sections with their own, which their menu sets. A choice of the person, kept in
 * the user-state key `project-density`.
 */
export const createProjectDensity = (workspaceId: () => string) => {
  const id = $derived(workspaceId());
  let choice = $state<DensityChoice>(projectDensity.read(workspaceId()));
  // The value of the server can come after the first paint.
  $effect(() =>
    projectDensity.onChange(() => {
      choice = projectDensity.read(id);
    }),
  );

  const save = (next: DensityChoice) => {
    choice = next;
    projectDensity.save(id, next);
  };

  return {
    /** The density of the page: a section with no density of its own. */
    get default(): ProjectDensity {
      return choice.default;
    },
    /** Some sections have their own density: « Apply to all sections » can remove them. */
    get mixed(): boolean {
      return Object.keys(choice.sections).length > 0;
    },
    of(key: SectionKey): ProjectDensity {
      return densityOf(choice, key);
    },
    /** The section has a density of its own. */
    owns(key: SectionKey): boolean {
      return key in choice.sections;
    },
    setDefault(density: ProjectDensity) {
      save(withDefaultDensity(choice, density));
    },
    setSection(key: SectionKey, density: ProjectDensity) {
      save(withSectionDensity(choice, key, density));
    },
    applyToAll() {
      save(withoutOverrides(choice));
    },
  };
};

export type ProjectDensityState = ReturnType<typeof createProjectDensity>;
