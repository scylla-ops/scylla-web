import { msg } from '@lingui/core/macro';

export const resetSecretMessages = {
  title: (name: string) => msg`Reset the secret of ${name}?`,
  description: msg`Scylla makes a new secret and shows it one time.`,
  newSecretName: msg`Name of the new secret`,
  newSecretNameHelp: msg`Unique for this agent. By default, the name of its machine.`,
  revokeNow: msg`Revoke the old secrets now`,
  revokeOn: msg`The old secrets stop working, so the agent disconnects until it uses the new secret.`,
  keepOne: (label: string) => msg`Uncheck to keep “${label}” until then.`,
  keepMany: msg`Uncheck to keep the old secrets until then.`,
  revokeOff: msg`The old secrets keep working until you revoke them.`,
  cancel: msg`Cancel`,

  revealTitle: (name: string) => msg`New secret for ${name}`,
  revealBody: msg`Copy it now. Scylla keeps only a hash, so it cannot show it again.`,
  secret: msg`Secret`,
  secretCopied: msg`Secret copied`,
  putSecret: msg`Put it in SCYLLA_APP_SECRET (or --app-secret) on the agent machine, then restart the agent.`,
  revokedOne: (label: string) => msg`The old secret “${label}” is revoked.`,
  revokedMany: (count: number) => msg`The ${count} old secrets are revoked.`,
  keptOne: (label: string) => msg`The old secret “${label}” stays enabled.`,
  keptMany: msg`The old secrets stay enabled.`,
  revokeFailed: msg`Scylla could not revoke all the old secrets. Revoke them in Secrets.`,
  done: msg`Done`,
};
