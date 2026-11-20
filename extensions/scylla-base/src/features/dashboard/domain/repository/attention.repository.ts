import type {
  AttentionList,
  AttentionQuery,
} from '@base/features/dashboard/domain/structs/attention.struct.ts';

/** The items that need a person (DashboardService.ListAttentionItems). */
export interface AttentionRepository {
  list(query: AttentionQuery): Promise<AttentionList>;
}
