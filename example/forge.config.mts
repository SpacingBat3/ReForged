import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerAppImage } from "@reforged/maker-appimage";

const config = Object.freeze({
  packagerConfig: Object.freeze({ executableName: "reforged-example-app" }),
  rebuildConfig: Object.freeze({}),
  makers: [ new MakerAppImage() ],
} as const satisfies ForgeConfig);

export default config;
