import type { ExtensionManifest } from '../types/extension';
import { createRegistrableDecorator } from './decorator-factory';

const extensionRegistryTool = createRegistrableDecorator<ExtensionManifest>();

export const Extension = extensionRegistryTool.decorator;
export const setExtensionHandler = extensionRegistryTool.setHandler;