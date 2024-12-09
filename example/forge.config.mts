import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerAppImage } from "@reforged/maker-appimage";

const config = {
  packagerConfig: { executableName: "reforged-example-app" as const },
  rebuildConfig: {},
  makers: [ new MakerAppImage() ] as const,
} satisfies ForgeConfig;

export default config;
