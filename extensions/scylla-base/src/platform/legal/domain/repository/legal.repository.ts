import type { LegalInfo, UpdateLegalSettingsInput } from '../structs/legal-info.struct.ts';

export interface LegalRepository {
  /** Needs no session. */
  info(): Promise<LegalInfo>;
  /** An instance admin only. Gives the settings after the change. */
  update(input: UpdateLegalSettingsInput): Promise<LegalInfo>;
}
