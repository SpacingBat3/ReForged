import { PluginBase } from "@electron-forge/plugin-base";
import type PluginLauncherConfig from "../types/config.d.ts";
import type { ForgeMultiHookMap } from "@electron-forge/shared-types";

import { rename, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

interface PackageJSON {
  name: string;
  displayName?: string;
}

/**
 * A plugin that inserts a shell script in place of Electron binary.
 * Made for unix-alike OSes in mind (TODO others!).
 *
 * @experimental
 * @platform *nix (`linux`, `freebsd`, `openbsd`, etc.)
 */
export default class PluginLauncher extends PluginBase<PluginLauncherConfig> {
  override name = "launcher" as const;
  async #writeShell(path:string) {
    let { launcher } = this.config as typeof this.config;
    if(typeof launcher !== "string" && !Array.isArray(launcher))
      throw TypeError("For now, 'script' field is obligatory"+`, typeof script = ${typeof launcher}`, {cause: `script=${launcher}`});
    if(Array.isArray(launcher))
      launcher = launcher.join('\n');
    if(typeof launcher === "string" && !launcher.startsWith("#!/"))
      launcher = await readFile(launcher);
    return writeFile(path,launcher,{mode: 0o755});
  }
  constructor(config: PluginLauncherConfig) {
    /** Type validation for non-TS envs */
    let badType = "";
    // config.launcher
    switch(typeof config.launcher) {
      case "string": break;
      case "object":
        // any[]
        if(Array.isArray(config.launcher)) {
          // [`#!${string}`,...string[]]
          if(config.launcher.some(line => typeof line !== "string") ||
              !(config.launcher[0] as string|undefined)?.startsWith("#!"))
            badType = "launcher";
        }
        // NodeJS.ArrayBufferView
        else if(!ArrayBuffer.isView(config.launcher))
          badType = "launcher";
        break;
      default: badType = "launcher";
    }
    // Error emitting
    if(badType) throw TypeError(`Invalid type for '${badType}' property.`)
    // Further class constructing
    super(config);
  }
  override getHooks(): ForgeMultiHookMap {
    /** A reference to `this` object of current class scope. */
    const self = this;
    /** A `package.json` configuration stored in class. */
    let json: PackageJSON;
    return {
      /** This hook will read parsed packageJson and pass it unchanged. */
      async readPackageJson(forge,packageJson) {
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
      async postPackage(forge,pack) {
        const jobs = [];
        const { name, executableName } = forge.packagerConfig;
        for(const path of pack.outputPaths) if(pack.platform!=="win32" && pack.platform!=="darwin")
          jobs.push((async () => {
            const bin = executableName ?? name ?? json.name;
            await rename(
              join(path, bin),
              join(path, bin+".bin")
            );
            await self.#writeShell(join(path, bin));
          })());
        await Promise.all(jobs);
      }
    }
  }
}

export {PluginLauncher, PluginLauncherConfig};