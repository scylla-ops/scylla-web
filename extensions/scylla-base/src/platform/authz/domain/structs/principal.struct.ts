/** `UNSPECIFIED` also means a principal kind this build does not know. */
export enum PrincipalKind {
  UNSPECIFIED = 0,
  USER = 1,
  APP = 2,
}

/** Who receives a grant: a user or an app, by its id. */
export interface Principal {
  kind: PrincipalKind;
  id: string;
}
