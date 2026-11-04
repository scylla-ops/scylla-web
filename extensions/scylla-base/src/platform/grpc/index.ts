import { ScyllaGrpcTransport } from './scylla-grpc-transport.ts';

export { ScyllaGrpcTransport } from './scylla-grpc-transport.ts';
export {
  openSession,
  forgetSession,
  refreshSession,
  restoreSession,
  closeSession,
} from './session.ts';

export const grpcTransport = new ScyllaGrpcTransport();
