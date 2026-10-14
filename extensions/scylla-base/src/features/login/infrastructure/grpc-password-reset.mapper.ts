import { PasswordResetDelivery as GrpcPasswordResetDelivery } from '@base/generated/scylla/auth/v1/auth.ts';
import type { PasswordResetDelivery } from '@base/features/login/domain/structs/password-reset.struct.ts';

export class GrpcPasswordResetMapper {
  static deliveryToDomain(delivery: GrpcPasswordResetDelivery): PasswordResetDelivery {
    switch (delivery) {
      case GrpcPasswordResetDelivery.MAIL:
        return 'mail';
      case GrpcPasswordResetDelivery.SERVER_LOG:
        return 'server-log';
      default:
        return 'unknown';
    }
  }
}
