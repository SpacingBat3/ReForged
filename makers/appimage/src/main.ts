(process as {setSourceMapsEnabled?:(arg0:boolean)=>void}).setSourceMapsEnabled?.(true);

import { createHash, getHashes } from "crypto";
import { tmpdir } from "os";
import { resolve, dirname, extname, relative } from "path";
import {
  mkdtempSync,
  existsSync,
  rmSync
} from "fs";
import {
  mkdir,
  writeFile,
  copyFile,
  readFile,
  chmod,
  symlink
} from "fs/promises";
import { EventEmitter } from "events";

import { MakerBase } from "@electron-forge/maker-base";
import sanitizeName from "@spacingbat3/lss";

import {
  copyPath,
  generateDesktop,
  joinFiles,
  mkSquashFs,
  mapArch,
  mapHash,
  getImageMetadata,
  getSquashFsVer
} from "./utils.js"

import type MakerAppImageConfig from "../types/config.d.ts";
import type { MakerMeta } from "./utils.js";

const enum RemoteDefaults {
  MirrorHost = 'https://github.com/AppImage/',
  MirrorPath = '/releases/download/',
  MirrorAK = 'AppImageKit',
  MirrorT2R = 'type2-runtime',
  /** Currently supported release of AppImageKit distributables. */
  Tag = 13,
  Dir = "{{ version }}",
  FileName = "{{ filename }}-{{ arch }}",
}


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
  override async make({appName,dir,makeDir,packageJSON,targetArch}: MakerMeta, ...vendorExt: unknown[]) {
    const {
      actions,
      categories,
      compressor,
      genericName,
      flagsFile,
      type2runtime
    } = (this.config.options ?? {});
    const appImageArch = mapArch(targetArch);
    function parseMirror(string:string,version:typeof currentTag,filename:string|null=null) {
      string = string
        .replaceAll(/{{ *version *}}/g,`${version}`)
        .replaceAll(/{{ *arch *}}/g,appImageArch)
        .replaceAll(/{{ *node.arch *}}/g,targetArch);
      if(filename !== null)
        string = string.replaceAll(/{{ *filename *}}/g, filename);
      return string;
    }
    /** A URL-like object from which assets will be downloaded. */
    const remote = {
      mirror: {
        runtime: type2runtime ?
          `${RemoteDefaults.MirrorHost}${RemoteDefaults.MirrorT2R}${RemoteDefaults.MirrorPath}` :
          process.env["REFORGED_APPIMAGEKIT_MIRROR"] ??
            process.env["APPIMAGEKIT_MIRROR"] ??
            `${RemoteDefaults.MirrorHost}${RemoteDefaults.MirrorAK}${RemoteDefaults.MirrorPath}`,
        AppRun: process.env["REFORGED_APPIMAGEKIT_MIRROR"] ??
          process.env["APPIMAGEKIT_MIRROR"] ??
          `${RemoteDefaults.MirrorHost}${RemoteDefaults.MirrorAK}${RemoteDefaults.MirrorPath}`
      },
      dir: process.env["REFORGED_APPIMAGEKIT_CUSTOM_DIR"] ?? process.env["APPIMAGEKIT_CUSTOM_DIR"] ?? RemoteDefaults.Dir,
      file: process.env["REFORGED_APPIMAGEKIT_CUSTOM_FILENAME"] ?? process.env["APPIMAGEKIT_CUSTOM_FILENAME"] ?? RemoteDefaults.FileName
    };
    /** Node.js friendly name of the application. */
    const name = sanitizeName(this.config.options?.name ?? packageJSON.name as string);
    /** Name of binary, used for shell script generation and `Exec` values. */
    const bin = this.config.options?.bin ?? name;
    const binShell = bin.replaceAll(/(?<!\\)"/g,'\\"');
    /** Human-friendly application name. */
    const productName = this.config.options?.productName ?? appName;
    /** A path to application's icon. */
    const icon = this.config?.options?.icon ?? null;
    /** Resolved path to AppImage output file. */
    const outFile = resolve(makeDir, this.name, targetArch, `${productName}-${packageJSON.version}-${targetArch}.AppImage`);
    /** A currently used AppImageKit release. */
    const currentTag = (
      type2runtime ? "continuous" : this.config.options?.AppImageKitRelease ?? RemoteDefaults.Tag
    ) satisfies Exclude<Required<MakerAppImageConfig>["options"]["AppImageKitRelease"],undefined>;
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
      runtime: Object.freeze({
        data: fetch(parseMirror(`${remote.mirror.runtime}${remote.dir}/${remote.file}`,currentTag,"runtime"))
          .then(response => {
            if(response.ok)
              return response.arrayBuffer()
            else
              throw new Error(`Runtime request failure (${response.status}: ${response.statusText}).`)
          }),
        md5: mapHash.runtime[mapArch(targetArch)]
      }),
      /** Details about AppRun ELF executable, used to start the app. */
      AppRun: Object.freeze({
        data: fetch(parseMirror(`${remote.mirror.AppRun}${remote.dir}/${remote.file}`,currentTag,"AppRun"))
          .then(response => {
            if(response.ok)
              return response.arrayBuffer()
            else
              throw new Error(`AppRun request failure (${response.status}: ${response.statusText}).`)
          }),
        md5: mapHash.AppRun[mapArch(targetArch)]
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
          "X-AppImage-Version": packageJSON.version,
          "X-AppImage-Arch": mapArch(targetArch)
        }, actions)),
      /** Shell script used to launch the application. */
      shell: [
        '#!/bin/sh -e',
        // Normalized string to 'usr/' in the AppImage.
        'USR="$(echo "$0" | sed \'s/\\/\\/*/\\//g;s/\\/$//;s/\\/[^/]*\\/[^/]*$//\')"',
        // Executes the binary and passes arguments to it.
        `exec "$USR/lib/${name}/${binShell}" "$@"`
      ]
    });
    /** Whenever using the script is necessary. */
    let useScript = false;
    if(flagsFile) {
      useScript = true;
      sources.shell.pop();
      sources.shell.push(
        'ARGV=\'\'',
        'for arg in "$@"; do',
        '\tARGV="$ARGV${ARGV:+ }$(echo "$arg" | sed \'s~\\\\~\\\\\\\\~g;s~"~"\\\\""~g;s~^\\(.*\\)$~"\\1"~g\')"',
        'done',
        `CFG="\${XDG_CONFIG_HOME:-"\${HOME:-/home/"$USER"}/.config"}/${name}-flags.conf"`,
        'if [ -f "$CFG" ]; then ARGV="$(cat "$CFG" | sed \'s~^\\s*#.*$~~g\') $ARGV"; fi',
        `echo "$ARGV" | exec xargs "$USR/lib/${name}/${binShell}"`
      )
    }
    this.ensureFile(outFile);
    // Verify if there's a `bin` file in packaged application.
    if(!existsSync(resolve(dir, bin)))
      throw new Error([
        `Could not find executable '${bin}' in packaged application.`,
        "Make sure 'packagerConfig.executableName' or 'config.options.bin'",
        "in Forge config are pointing to valid file."
      ].join(" "));
    /** A temporary directory used for the packaging. */
    const workDir = mkdtempSync(resolve(tmpdir(), `.${productName}-${packageJSON.version}-${targetArch}-`));
    const iconMeta = icon ? readFile(icon).then(icon => getImageMetadata(icon)) : Promise.resolve(undefined);
    {
      let cleanup = () => {
        cleanup = () => {};
        rmSync(workDir, {recursive: true});
      }
      process.on("uncaughtExceptionMonitor", cleanup);
      process.on("exit", cleanup);
    }
    process.on("SIGINT", () => {
      console.error("User interrupted the process.");
      process.exit(130);
    })
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
    /** First-step jobs, which does not depend on any other job. */
    const earlyJobs = [
      // Create further directory tree (0,1,2)
      mkdir(directories.lib, {recursive: true, mode: 0o755}),
      mkdir(directories.bin, {recursive: true, mode: 0o755}),
      directories.icons
        .then(path => path ? mkdir(path, {recursive: true, mode: 0o755}).then(() => path) : undefined),
      // Save `.desktop` to file (3)
      sources.desktop
        .then(data => writeFile(
          resolve(workDir, productName+'.desktop'), data, {mode:0o755, encoding: "utf-8"})
        ),
      // Verify and save `AppRun` to file (4)
      sources.AppRun.data
        .then(data => {
          const buffer = Buffer.from(data);
          if(currentTag === RemoteDefaults.Tag) {
            if(!getHashes().includes("md5"))
              throw new Error("MD5 is not supported by 'node:crypto'.");
            const hash = createHash("md5")
              .update(buffer)
              .digest('hex');
            if(hash !== sources.AppRun.md5)
              throw new Error("AppRun hash mismatch.");
          }
          return writeFile(resolve(workDir, 'AppRun'), buffer, {mode: 0o755});
        }),
      // Save icon to file and symlink it as `.DirIcon` (5)
      icon ? iconPath && existsSync(icon) ?
        copyFile(icon, iconPath)
          .then(() => symlink(relative(workDir, iconPath), resolve(workDir, ".DirIcon"), 'file'))
        : Promise.reject(Error("Invalid icon / icon path.")) : Promise.resolve(),
    ] as const;
    const lateJobs = [
      // Write shell script to file or create a symlink
      earlyJobs[1]
        .then(() => {
          const binPath = resolve(directories.bin, bin);
          if(useScript)
            return writeFile(binPath,sources.shell.join('\n'), {mode: 0o755})
          return symlink(relative(directories.bin, resolve(directories.data,binShell)),binPath,"file");
        }),
      // Copy Electron app to AppImage directories
      earlyJobs[0]
        .then(() => copyPath(dir, directories.data, 0o755)),
      // Copy icon to `usr` directory whenever possible
      Promise.all([earlyJobs[2],earlyJobs[5]])
        .then(([path]) => icon && path ?
          copyFile(icon, resolve(path,name+extname(icon))) :
          void 0
        ),
      // Ensure that root folder has proper file mode
      chmod(workDir, 0o755)
    ] as const;
    // Wait for early/late jobs to finish
    await(Promise.all([...earlyJobs,...lateJobs]));
    // Run `mksquashfs` and wait for it to finish
    const mkSquashFsArgs = [workDir, outFile];
    const mkSquashFsVer = getSquashFsVer();
    switch(-1) {
      // -noappend is supported since 1.2+
      case(mkSquashFsVer.compare("1.2.0")): //@ts-expect-error falls through
        break; case -1:
      mkSquashFsArgs.push("-noappend");
      // -all-root is supported since 2.0+
      case mkSquashFsVer.compare("2.0.0"): //@ts-expect-error falls through
        break; case -1:
      mkSquashFsArgs.push("-all-root");
      // -all-time and -mkfs-time is supported since 4.4+
      case mkSquashFsVer.compare("4.4.0"):
        break;
      default: if(process.env["SOURCE_DATE_EPOCH"] === undefined)
      mkSquashFsArgs.push("-all-time", "0", "-mkfs-time", "0");
    }
    // Set compressor options if available
    if(compressor)
      mkSquashFsArgs.push("-comp", compressor);
    if(compressor === "xz")
      mkSquashFsArgs.push(
        // Defaults for `xz` took from AppImageTool:
        "-Xdict-size",
        "100%",
        "-b",
        "16384"
      );
    await new Promise((resolve, reject) => {
      mkdir(dirname(outFile), {recursive: true}).then(() => {
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
    // Append runtime to SquashFS image and wait for that task to finish
    await sources.runtime.data
      //TODO: Find how properly embed MD5 or SHA256 signatures
      /*.then(
        async runtime => config.options?.digestMd5??true ?
          setChecksum(runtime, await readFile(outFile)) :
          runtime
      )*/
      .then(runtime => joinFiles(Buffer.from(runtime),outFile))
      .then(buffer => writeFile(outFile, buffer))
      .then(() => chmod(outFile, 0o755))
    // Finally, return a path to maker artifacts
    return [outFile];
  }
}
export {
  MakerAppImage
};

export type {
  MakerAppImageConfig,
  MakerAppImageConfigOptions,
  FreeDesktopCategories
} from "../types/config.d.ts";

export type {
  ForgeArch,
  MakerMeta
} from "./utils.js";