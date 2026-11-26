import { userState } from '@platform/user-state';
import {
  decodeDensityChoice,
  NO_CHOICE,
  type DensityChoice,
} from './presenters/project-density.presenter.ts';

export const PROJECT_DENSITY_KEY = 'scylla.project-density';

/** For each workspace, the density of the projects page and of its sections. */
type ChoiceByWorkspace = Record<string, DensityChoice>;

const decode = (value: unknown): ChoiceByWorkspace | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>).map(
    ([id, choice]) => [id, decodeDensityChoice(choice)] as const,
  );
  return entries.every(([, choice]) => choice !== null)
    ? (Object.fromEntries(entries) as ChoiceByWorkspace)
    : null;
};

const read = (): ChoiceByWorkspace => {
  try {
    return decode(JSON.parse(globalThis.localStorage?.getItem(PROJECT_DENSITY_KEY) ?? 'null')) ?? {};
  } catch {
    return {};
  }
};

// The page reads the value of the server when it comes after the first paint.
const listeners = new Set<() => void>();
const write = (value: ChoiceByWorkspace) => {
  globalThis.localStorage?.setItem(PROJECT_DENSITY_KEY, JSON.stringify(value));
  listeners.forEach(listener => listener());
};

/** `project.module.ts` imports this file: the key is defined before the read of the server. */
const state = userState.define<ChoiceByWorkspace>({
  key: 'project-density',
  decode,
  readLocal: () => {
    const value = read();
    return Object.keys(value).length > 0 ? value : null;
  },
  writeLocal: (_, value) => write(value),
});

/** The densities of the projects page that a person chose, for each workspace. */
export const projectDensity = {
  read: (workspaceId: string): DensityChoice => read()[workspaceId] ?? NO_CHOICE,
  save: (workspaceId: string, choice: DensityChoice) => {
    const next = { ...read(), [workspaceId]: choice };
    write(next);
    state.save(next);
  },
  /** Called after each write, also the value of the server. Returns the end of the listen. */
  onChange: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
