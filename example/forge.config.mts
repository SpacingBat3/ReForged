import type { ForgeConfig } from "@electron-forge/shared-types";
import MakerAppImage from "@reforged/maker-appimage";
import PluginLauncher from "@reforged/plugin-launcher";

const config = {
  packagerConfig: { executableName: "reforged-example-app" as const },
  rebuildConfig: {},
  makers: [ new MakerAppImage() ] as const,
  plugins: [ new PluginLauncher({ launcher: [
    '#!/bin/sh',
    'ME="$(readlink -f "$0")"',
    'echo "Hello, plugin world!"',
    'exec "$ME.bin" "$@"'
  ]}) ]
} satisfies ForgeConfig;

export default config;
