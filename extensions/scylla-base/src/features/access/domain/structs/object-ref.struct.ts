/** An object of the server that has roles or permissions. */
export type ObjectKind = 'platform' | 'workspace' | 'project';

export interface ObjectRef {
  kind: ObjectKind;
  id: string;
}

/** The id of the one platform object: the instance. */
export const PLATFORM_ID = '00000000000000000000000000';

export const platformRef: ObjectRef = { kind: 'platform', id: PLATFORM_ID };
export const workspaceRef = (id: string): ObjectRef => ({ kind: 'workspace', id });
export const projectRef = (id: string): ObjectRef => ({ kind: 'project', id });
