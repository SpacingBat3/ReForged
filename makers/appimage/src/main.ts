(process as {setSourceMapsEnabled?:(arg0:boolean)=>void}).setSourceMapsEnabled?.(true);

import { tmpdir } from "os";
import { resolve, extname, relative } from "path";
import {
  existsSync,
  rmSync
} from "fs";
import {
  mkdir,
  mkdtemp,
  writeFile,
  copyFile,
  readFile,
  chmod,
  symlink,
  rm,
  cp
} from "fs/promises";
import { EventEmitter } from "events";

import { debug, format } from "util";
import { MakerBase } from "@electron-forge/maker-base";
import sanitizeName from "@spacingbat3/lss";

import {
  generateDesktop,
  joinFiles,
  mkSquashFs,
  mapArch,
  getImageMetadata,
  getSquashFsVer
} from "./utils.js"

import type MakerAppImageConfig from "../types/config.d.ts";
import type { MakerMeta } from "./utils.js";
import type { DebugLoggerFunction } from "util";

const enum RemoteDefaults {
  /** Current URL to where runtimes are served. */
  Mirror = 'https://github.com/AppImage/type2-runtime/releases/download/',
  /** Currently supported release of runtime. */
  Tag = "continuous",
}

const d:DebugLoggerFunction = (() => {
  const timer = function*(){for(let timeNext,time = process.uptime();;time=timeNext)
    yield (timeNext=process.uptime())-time
  }()
  if(debug("reforged:maker-appimage").enabled || /(?:^|,)(?:\*|reforged:(?:\*|maker-appimage))(?:$|,)/
      .test(process.env["DEBUG"]??""))
    // Function that logs similarly to debugLog.
    return (...args:unknown[]) => console.error(
      "@reforged/maker-appimage %o: %s (+%f ms)",
      process.pid,
      format(...args),
      (timer.next().value*1000).toFixed(2)
    );
  // NO-OP function
  return () => {};
})()

/**
 * An AppImage maker for Electron Forge.
 *
 * See `Readme.md` file distributed in subproject's root dir for more
 * information and documentation of supported env variables. See
 * JSDoc/TSDoc/TypeDoc documentation (this ones!) for supported
 * configuration options.
 *
 * @example
 * ```js
 * {
 *   name: "@reforged/maker-appimage",
 *   config: {
 *     options: {
 *       // Package name.
 *       name: "example-app",
 *       // Executable name.
 *       bin: "app",
 *       // Human-friendly name of the application.
 *       productName: "Example Electron Application",
 *       // `GenericName` in generated `.desktop` file.
 *       genericName: "Example application",
 *       // Path to application's icon.
 *       icon: "/path/to/icon.png",
 *       // Desktop file to be used instead of the configuration above.
 *       desktopFile: "/path/to/example-app.desktop",
 *       // Release of `AppImage/AppImageKit`, either number or "continuous".
 *       AppImageKitRelease: "continuous",
 *       // Support parsing Arch Linux '*_flags.conf' file.
 *       flagsFile: "true"
 *     }
 *   }
 * }
 * ```
 */
export default class MakerAppImage extends MakerBase<MakerAppImageConfig> {
  /** @internal */
  readonly __VndReForgedAPI = 1 as const;
  defaultPlatforms:["linux"] = ["linux"];
  name = "AppImage" as const;
  override requiredExternalBinaries:["mksquashfs"] = ["mksquashfs"];
  override isSupportedOnCurrentPlatform:()=>true = ()=>true;
  override async make({
    appName, dir, makeDir, packageJSON, targetArch
  }: MakerMeta, ...vendorExt: unknown[]): Promise<[AppImagePath:string]> {
    d("Initializing maker metadata.")
    const {
      actions, categories, compressor, genericName, icon
    } = (this.config.options ?? {});
    let {
      name, bin, productName, runtime
    } = (this.config.options ?? {})
    // FIXME: https://github.com/tc39/proposal-throw-expressions would be nice
    //        here when decision to add it to standard will be made.
    const appImageArch = mapArch[targetArch]??(()=>{throw new Error(`Unsupported architecture: '${targetArch}'.`)})();
    // Fallbacks:
    name ??= sanitizeName(this.config.options?.name ?? packageJSON.name as string);
    bin  ??= name;
    productName ??= appName;
    runtime ??= `${RemoteDefaults.Mirror}${RemoteDefaults.Tag}/runtime-${appImageArch}`;
    /** Resolved path to AppImage output file. */
    const outFile = resolve(makeDir, this.name, targetArch, `${productName}-${packageJSON.version}-${targetArch}.AppImage`);
    const binShell = bin.replaceAll(/(?<!\\)"/g,'\\"');
    /**
     * Detailed information about the source files.
     *
     * As of remote content, objects contain the data in form of
     * ArrayBuffers (which are then allocated to Buffers,
     * checksum-verified and saved as regular files). The text-based
     * generated content is however saved in form of the string (UTF-8
     * encoded, with LF endings).
     */
    const sources = Object.freeze({
      /** Details about the AppImage runtime. */
      runtime: existsSync(runtime)?readFile(runtime):fetch(runtime)
          .then(response => {
            d("Fetched AppImage runtime from mirror.")
            if(response.status === 200)
              return response.arrayBuffer()
            else
              throw new Error(`Runtime request failure (${response.status}: ${response.statusText}).`)
          }),
      /** Details about the generated `.desktop` file. */
      desktop: typeof this.config.options?.desktopFile === "string" ?
        readFile(this.config.options.desktopFile, "utf-8") :
        Promise.resolve(generateDesktop({
          Version: "1.5",
          Type: "Application",
          Name: productName,
          GenericName: genericName,
          Exec: `${bin.includes(" ") ? `"${binShell}"` : bin} %U`,
          Icon: icon ? name : undefined,
          Categories: categories ?
            categories.join(';')+';' :
            undefined,
          "X-AppImage-Name": name,
          "X-AppImage-Version": packageJSON.version as string,
          "X-AppImage-Arch": appImageArch
        }, actions))
    });
    // Verify if there's a `bin` file in packaged application.
    if(!existsSync(resolve(dir, bin)))
      throw new Error([
        `Could not find executable '${bin}' in packaged application.`,
        "Make sure 'packagerConfig.executableName' or 'config.options.bin'",
        "in Forge config are pointing to valid file."
      ].join(" "));
    /** Icon metadata, ie. detected dimensions and filetype. */
    const iconMeta = icon ? readFile(icon).then(icon => getImageMetadata(icon)) : Promise.resolve(undefined);
    /** A temporary directory used for the packaging. */
    const workDir = await mkdtemp(resolve(tmpdir(), `.${productName}-${packageJSON.version}-${targetArch}-`));
    d("Setup cleanup hooks for error scenarios.")
    const [cleanupHook, cleanupSyncHook] = (() => {
      let cleanup = async () => {
        cleanup = async () => {};
        await rm(workDir, {recursive: true});
      }
      return [
        () => cleanup(),
        () => void (existsSync(workDir) && rmSync(workDir, {recursive: true})) as void
      ] as const;
    })()
    process.once("uncaughtExceptionMonitor", cleanupHook);
    process.once("exit", cleanupSyncHook);
    process.once("SIGINT", () => {throw new Error("User interrupted the process.")});
    const directories = {
      lib: resolve(workDir, 'usr/lib/'),
      data: resolve(workDir, 'usr/lib/', name),
      bin: resolve(workDir, 'usr/bin'),
      icons: iconMeta.then(meta => meta && meta.width && meta.height ?
        resolve(workDir, 'usr/share/icons/hicolor', meta.width.toFixed(0)+'x'+meta.height.toFixed(0)) :
        null
      )
    }
    const iconPath = icon ? resolve(workDir, name+extname(icon)) : undefined;
    const binPath = resolve(directories.bin,bin);
    d("Queuing asynchronous jobs batches.")
    /** First-step jobs, which does not depend on any other job. */
    const earlyJobs = [
      // Create further directory tree (0,1,2)
      mkdir(directories.lib, {recursive: true, mode: 0o755}),
      mkdir(directories.bin, {recursive: true, mode: 0o755}),
      directories.icons
        .then(path => path ? mkdir(path, {recursive: true, mode: 0o755}).then(() => path) : undefined),
      // Save `.desktop` to file (3)
      sources.desktop
        .then(data => (d("Writing '.desktop' file to 'workDir'."),writeFile(
          resolve(workDir, productName+'.desktop'), data, {mode:0o755, encoding: "utf-8"})
        )),
      // Create `AppRun` as a link to bin/ (4)
      symlink(relative(workDir,binPath),resolve(workDir,'AppRun'),"file"),
      // Save icon to file and symlink it as `.DirIcon` (5)
      icon ? iconPath && existsSync(icon) ?
        copyFile(icon, iconPath)
          .then(() => symlink(
            relative(workDir, iconPath), resolve(workDir, ".DirIcon"), 'file')
          )
        : Promise.reject(Error("Invalid icon / icon path.")) : Promise.resolve(),
    ] as const;
    const lateJobs = [
      // Write shell script to file or create a symlink
      earlyJobs[1]
        .then(() => symlink(
          relative(directories.bin, resolve(directories.data,bin)),binPath,"file")
        ),
      // Copy Electron app to AppImage directories
      earlyJobs[0]
        .then(() => (
          d("Copying Electron app data."),
          cp(dir, directories.data, {errorOnExist:true,recursive:true,verbatimSymlinks:true}))
        ),
      // Copy icon to `usr` directory whenever possible
      Promise.all([earlyJobs[2],earlyJobs[5]])
        .then(([path]) => icon && path ?
          copyFile(icon, resolve(path,name+extname(icon))) :
          void 0
        ),
      // Ensure that root folder has proper file mode
      chmod(workDir, 0o755)
    ] as const;
    d("Waiting for queued jobs to finish.")
    // Wait for early/late jobs to finish
    await(Promise.all([...earlyJobs,...lateJobs]));
    d("Preparing 'mksquashfs' arguments for data image generation.")
    // Run `mksquashfs` and wait for it to finish
    const mkSquashFsArgs = [workDir, outFile];
    const mkSquashFsVer = getSquashFsVer();
    switch(-1) {
      // -noappend is supported since 1.2+
      case(mkSquashFsVer.compare("1.2.0")): break;
      //@ts-expect-error falls through
      case -1: mkSquashFsArgs.push("-noappend");

      // -all-root is supported since 2.0+
      case mkSquashFsVer.compare("2.0.0"): break;
      //@ts-expect-error falls through
      case -1: mkSquashFsArgs.push("-all-root");
      // -all-time and -mkfs-time is supported since 4.4+
      case mkSquashFsVer.compare("4.4.0"): break;
      case -(process.env["SOURCE_DATE_EPOCH"] === undefined):
      mkSquashFsArgs.push("-all-time", "0", "-mkfs-time", "0");
    }
    // Set compressor options if available
    switch(compressor) {
      case undefined: break;
      //@ts-expect-error falls through
      default: mkSquashFsArgs.push("-comp", compressor);
      // Defaults for `xz` took from AppImageTool:
      case "xz": mkSquashFsArgs.push(
        "-Xdict-size", "100%",
        "-b", "16384"
      );
    }
    d("Queuing 'mksquashfs' task.")
    await new Promise((resolve, reject) => {
      this.ensureFile(outFile).then(() => {
        const evtCh = mkSquashFs(...mkSquashFsArgs)
          .once("close", (code,_signal,msg) => code !== 0 ?
            reject(new Error(`mksquashfs returned ${msg ? `'${msg}' in stderr` : "non-zero code"} (${code}).`)):
            resolve(undefined)
          )
          .once("error", (error) => reject(error));
        for(let vndHead; vndHead !== undefined && vndHead !== "RF1"; vndHead=vendorExt.pop());
        const [vndCh] = vendorExt;
        // Leak current progress to API consumers if supported
        if(vndCh instanceof EventEmitter)
          evtCh.on("progress", percent => vndCh.emit("progress", percent));
      }).catch(error => reject(error));
    });
    d("Cleanup workDir & craft final AppImage.")
    await Promise.all([
      cleanupHook()
        .then(() => void process
          .off("uncaughtExceptionMonitor",cleanupHook)
          .off("exit", cleanupSyncHook) as void),
      writeFile(outFile,await joinFiles(await sources.runtime,outFile),{mode:0o755})
    ]);
    // Finally, return paths to maker artifacts
    return [outFile];
  }
}

export {
  MakerAppImage
};

export type {
  MakerAppImageConfig,
  MakerAppImageConfigOptions
} from "../types/config.d.ts";

export type {
  ForgeArch,
  MakerMeta
} from "./utils.js";