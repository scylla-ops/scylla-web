import type { AppAccess } from '@base/features/apps';

/** A grant on another organization than the one on screen. A system grant is on none. */
export const isOtherOrganization = (grant: AppAccess, organizationId: string): boolean =>
  grant.organizationId !== null && grant.organizationId !== organizationId;

/** The grants of the current organization first, then the system ones, then the others. */
export const orderGrants = (access: readonly AppAccess[], organizationId: string): AppAccess[] => {
  const rank = (grant: AppAccess) =>
    grant.organizationId === organizationId ? 0 : grant.scope === 'system' ? 1 : 2;
  return [...access].sort((a, b) => rank(a) - rank(b));
};

/** A project of another organization carries the name of its organization. */
export const projectLabel = (grant: AppAccess, organizationId: string): string =>
  isOtherOrganization(grant, organizationId)
    ? `${grant.organizationName} / ${grant.projectName}`
    : grant.projectName;

export type AccessReach =
  | { kind: 'none' }
  | { kind: 'system' }
  | { kind: 'organization' }
  | { kind: 'otherOrganizations'; names: string[] }
  | { kind: 'project'; project: string }
  | { kind: 'projects'; count: number };

/** Where the agent takes jobs: the widest grant decides. */
export const accessReachOf = (
  access: readonly AppAccess[],
  organizationId: string,
): AccessReach => {
  if (access.length === 0) return { kind: 'none' };
  if (access.some(grant => grant.scope === 'system')) return { kind: 'system' };

  const organizations = access.filter(grant => grant.scope === 'organization');
  if (organizations.some(grant => grant.organizationId === organizationId)) {
    return { kind: 'organization' };
  }
  if (organizations.length > 0) {
    return {
      kind: 'otherOrganizations',
      names: [...new Set(organizations.map(grant => grant.organizationName))],
    };
  }

  const projects = [...new Set(access.map(grant => projectLabel(grant, organizationId)))];
  return projects.length === 1
    ? { kind: 'project', project: projects[0] }
    : { kind: 'projects', count: projects.length };
};

/** A system grant, or the organization grant of the organization on screen. */
export const coversEveryProject = (access: readonly AppAccess[], organizationId: string): boolean =>
  access.some(
    grant =>
      grant.scope === 'system' ||
      (grant.scope === 'organization' && grant.organizationId === organizationId),
  );

/** The project grants in the organization on screen: its organization grant replaces them. */
export const projectGrantsIn = (
  access: readonly AppAccess[],
  organizationId: string,
): AppAccess[] =>
  access.filter(grant => grant.scope === 'project' && grant.organizationId === organizationId);

export const projectsWithoutGrant = <P extends { id: string }>(
  projects: readonly P[],
  access: readonly AppAccess[],
): P[] => {
  const granted = new Set(
    access.filter(grant => grant.scope === 'project').map(grant => grant.scopeId),
  );
  return projects.filter(project => !granted.has(project.id));
};

/** The server checks the grants on each job status: without a cover, a running job cannot report. */
export const keepsCover = (access: readonly AppAccess[], removed: AppAccess): boolean =>
  access.some(
    grant =>
      grant.grantId !== removed.grantId &&
      (grant.scope === 'system' ||
        (removed.scope === 'project' &&
          grant.scope === 'organization' &&
          grant.organizationId === removed.organizationId)),
  );
