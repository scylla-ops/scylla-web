import { msg } from '@lingui/core/macro';
import KeyRoundIcon from '@lucide/svelte/icons/key-round';
import { Permission } from '@platform/authz';
import { contextStore } from '@platform/context';
import { commandForm, routeParams, type CreateCommand } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';

const context = toRune(contextStore);

export const secretCommands: readonly CreateCommand[] = [
  {
    id: 'secret.create',
    kind: 'create',
    title: msg`New secret`,
    keywords: msg`create add password key`,
    icon: KeyRoundIcon,
    permission: Permission.CREATE_SECRET,
    available: () => !!context().project.id,
    here: () => !!context().project.id && !routeParams().pipelineId,
    place: () => context().project.name ?? undefined,
    form: commandForm({
      load: () => import('./ui/CreateSecretDialog/CreateSecretDialog.svelte'),
      props: () => ({ projectId: context().project.id ?? '' }),
    }),
  },
];
