import type { MessageDescriptor } from '@lingui/core';
import BoxIcon from '@lucide/svelte/icons/box';
import LaptopIcon from '@lucide/svelte/icons/laptop';
import MonitorIcon from '@lucide/svelte/icons/monitor';
import TerminalIcon from '@lucide/svelte/icons/terminal';
import type { LucideIcon } from '@scylla/ui';
import type { InstallWay } from '@base/features/apps/domain/structs/agent-install.struct.ts';
import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';

export interface InstallWayView {
  icon: LucideIcon;
  label: MessageDescriptor;
  /** Where the command runs, under the name of the tile. */
  tool: MessageDescriptor;
  /** The line under the command. */
  short: MessageDescriptor;
  /** The text of the "i" card. Windows has its own card. */
  hint?: MessageDescriptor;
}

export const INSTALL_WAYS: Record<InstallWay, InstallWayView> = {
  linux: {
    icon: TerminalIcon,
    label: messages.linux,
    tool: messages.shell,
    short: messages.linuxShort,
    hint: messages.linuxHint,
  },
  macos: {
    icon: LaptopIcon,
    label: messages.macos,
    tool: messages.terminal,
    short: messages.macosShort,
    hint: messages.macosHint,
  },
  windows: {
    icon: MonitorIcon,
    label: messages.windows,
    tool: messages.powershell,
    short: messages.windowsShort,
  },
  docker: {
    icon: BoxIcon,
    label: messages.docker,
    tool: messages.container,
    short: messages.dockerShort,
    hint: messages.dockerHint,
  },
};

export const INSTALL_WAY_ORDER: readonly InstallWay[] = ['linux', 'macos', 'windows', 'docker'];
