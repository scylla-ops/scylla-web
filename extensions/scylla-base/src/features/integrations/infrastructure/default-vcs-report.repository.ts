import type { IVcsReportServiceClient } from '@base/generated/scylla/integrations/v1/vcs_report_service.client.ts';
import type {
  JobReports,
  RetryJobReportInput,
  VcsReport,
} from '@base/features/integrations/domain/entities/vcs-report.entity.ts';
import type { VcsReportRepository } from '@base/features/integrations/domain/repository/vcs-report.repository.ts';
import { required, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcVcsReport from './grpc-vcs-report.mapper.ts';

export class DefaultVcsReportRepository implements VcsReportRepository {
  constructor(private readonly client: IVcsReportServiceClient) {}

  public async listByJobs(jobIds: string[]): Promise<JobReports[]> {
    if (jobIds.length === 0) return [];
    const response = await this.client.listJobReports({ jobIds: jobIds.map(wrapId) }).response;
    return response.jobs.map(grpcVcsReport.jobReportsToDomain);
  }

  public async retry(input: RetryJobReportInput): Promise<VcsReport> {
    const response = await this.client.retryJobReport({
      jobId: wrapId(input.jobId),
      context: input.context,
    }).response;
    return grpcVcsReport.toDomain(required(response.report, 'report'));
  }
}
