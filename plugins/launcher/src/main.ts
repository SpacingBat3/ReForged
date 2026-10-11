// SPDX-FileCopyrightText: 2025-2026 Dawid Papiewski "SpacingBat3" <spacingbat3@gmail.com>
//
// SPDX-License-Identifier: ISC

import { PluginBase } from "@electron-forge/plugin-base";
import type PluginLauncherConfig from "../types/config.d.ts";
import type { ForgeMultiHookMap, ForgeArch, ForgePlatform } from "@electron-forge/shared-types";
import { existsSync } from "node:fs";
import { rename, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

interface PackageJSON {
  name: string;
  displayName?: string;
}

type SplitOnce<T extends string, C extends string> = |
  T extends `${infer L extends string}${C}${infer R extends string}`
  ? [L, R] : [T];
type ResolveAny<T extends [string, string]|[string]|[]> = [
  "any" extends T[0] ? Exclude<T[0], "any"> | undefined : T[0],
  "any" extends T[1] ? Exclude<T[1], "any"> | undefined : T[1],
];

type LauncherKey   = keyof PluginLauncherConfig["launcher"];
type LauncherEntry = readonly[LauncherKey, PluginLauncherConfig["launcher"][LauncherKey]]

class LauncherRegistry {
  #registry: PluginLauncherConfig["launcher"];
  *lookup(platform: ForgePlatform, arch: ForgeArch) {
    for (const [specifier,launcher] of (Object.entries(this.#registry) as LauncherEntry[])) {
      const [l_platform, l_arch] = specifier
        .split("-", 1)
        .map(k => k == "any" ? undefined : k) as ResolveAny<SplitOnce<typeof specifier, '-'>>;
      if ((l_platform ?? platform) == platform && (l_arch ?? arch) == arch)
        yield { specifier, launcher };
    }
  }
  find(platform: ForgePlatform, arch: ForgeArch) {
    return this.lookup(platform, arch).next().value;
  }
  constructor(registry:PluginLauncherConfig["launcher"]) {
    this.#registry = registry;
  }
}

/**
 * A plugin that inserts a script or executable in place of Electron
 * binary.
 * 
 * This currently has some implications (e.g. you might not be able
 * to use Fuses plugin after you use this plugin, so proper ordering
 * of plugins is required) and has yet to be tested and polished for
 * non-unixlike OSes executable conventions (Windows/macOS).
 *
 * @experimental
 * @platform *nix (`linux`, `freebsd`, `openbsd`, etc.)
 */
export default class PluginLauncher extends PluginBase<PluginLauncherConfig> {
  override name = "launcher" as const;
  #launcherRegistry: LauncherRegistry;
  constructor(config: PluginLauncherConfig) {
    /** Type validation for non-TS envs */
    let badType = "";
    // config.launcher
    for (const launcher of Object.values(config.launcher)) {
      switch (typeof launcher) {
        case "string":
          if (!existsSync(launcher)) badType = "launcher";
          break;
        case "object":
          // {path:string} | {script:string}
          if (launcher.constructor === Object) {
            if ("path" in launcher && typeof launcher.path !== "string")
              badType = "launcher.path"
            else if ("script" in launcher && typeof launcher.script !== "string")
              badType = "launcher.script"
            else if (("path" in launcher && "script" in launcher) || (!("path" in launcher) && !("script" in launcher)))
              badType = "launcher"
            break;
          }
          // any[]
          if (Array.isArray(launcher)) {
            // string[]
            if (launcher.some(line => typeof line !== "string"))
              badType = "launcher";
          }
          // NodeJS.ArrayBufferView
          else if (!ArrayBuffer.isView(launcher))
            badType = "launcher";
          break;
        default: badType = "launcher";
      }
      if (badType) break;
    }
    // Error emitting
    if(badType) throw TypeError(`Invalid type for '${badType}' property.`)
    // Further class construction
    super(config);
    this.#launcherRegistry = new LauncherRegistry(this.config.launcher);
  }
  override getHooks(): ForgeMultiHookMap {
    /** A `package.json` configuration stored in class. */
    let json: PackageJSON;
    return {
      /** This hook will read parsed packageJson and pass it unchanged. */
      readPackageJson: async (forge,packageJson) => {
        {/* Ensure plugin is always placed as last: we don't want to break
          others when replacing binary with shell script (fuses plugin?). */
          const { plugins } = forge;
          const pos = 1+plugins.findIndex(p => p instanceof PluginLauncher ||
            ("config" in p && p.name === self.name));
          if(pos !== plugins.length)
            throw Error("Shell plugin must be placed as last");
        }
        json = packageJson as PackageJSON;
        return packageJson;
      },
      /** This hook wraps binary into a shell script. */
      postPackage: async (forge, pack) => {
        const { launcher } = this.#launcherRegistry
          .find(pack.platform, pack.arch) ?? {};
        if (!launcher) return;
        const jobs = [];
        const { name, executableName } = forge.packagerConfig;
        for (const path of pack.outputPaths) jobs.push((async () => {
          const bin = executableName ?? name ?? json.name;
          const launcherBuffer =
            Array.isArray(launcher) ? launcher.join("\n")
            : "path" in launcher    ? readFile(launcher.path)
            : "script" in launcher  ? launcher.script
            : launcher;
          await rename(
            join(path, bin),
            join(path, bin+".bin")
          );
          await writeFile(join(path,bin), await launcherBuffer, {mode: 0o755});
        })());
        await Promise.all(jobs);
      }
    }
  }
}

export { PluginLauncher, type PluginLauncherConfig };
export type { PlatformOrArchSpecifier } from "../types/config.d.ts";