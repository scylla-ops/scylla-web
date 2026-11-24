import { grpcTransport } from '@platform/grpc';
import { UserStateServiceClient } from '@base/generated/scylla/accounts/v1/user_state_service.client.ts';
import { createUserState } from './user-state.ts';

export {
  createUserState,
  type UserState,
  type UserStateDefinition,
  type UserStateKey,
} from './user-state.ts';

export const userState = createUserState(new UserStateServiceClient(grpcTransport.getTransport()));
