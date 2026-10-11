// SPDX-FileCopyrightText: 2025-2026 Dawid Papiewski "SpacingBat3" <spacingbat3@gmail.com>
//
// SPDX-License-Identifier: ISC

import { ForgeArch, ForgePlatform } from "@electron-forge/shared-types"

/**
 * A tuple/pair of {@link ForgePlatform} and {@link ForgeArch} to use
 * for matching against.
 */
type PlatformOrArchSpecifier = |
  `${ForgePlatform|"any"}-${ForgeArch}` | ForgePlatform | "any"

type ExecutableOrScript = |
  { path: string } | { script: string } |
  readonly string[] |
  NodeJS.ArrayBufferView     ;

/** Configuration definition of `@reforged/plugin-launcher`. */
export default interface PluginLauncherConfig {
  /**
   * Multi-type option, defining an executable that will be used to
   * wrap the original binary with. This option can reflect:
   *
   * - an inline shebang-prefixed script content (`string` or
   *   array of script lines, for convenience),
   *
   * - an inline executable, doesn't have to be shebanged but needs
   *   to be recognized by the kernel (binfmt on Linux for non-native
   *   executables, Windows might also recognize scripts without
   *   shebang by extension),
   *
   * - a path to the external file that can be both of the above.
   */
  launcher: { [P in PlatformOrArchSpecifier] ?: ExecutableOrScript };
}

export { PluginLauncherConfig, PlatformOrArchSpecifier }