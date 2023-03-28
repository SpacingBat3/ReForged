import type { ForgeConfig } from "@electron-forge/shared-types";
import type { MakerAppImageConfig } from "@reforged/maker-appimage";

export = {
  packagerConfig: {
    executableName: "reforged-example-app"
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@reforged/maker-appimage',
      config: {
        options: {}
      } satisfies MakerAppImageConfig,
    }
  ],
} satisfies ForgeConfig;
