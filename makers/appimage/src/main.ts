(process as {setSourceMapsEnabled?:(arg0:boolean)=>void}).setSourceMapsEnabled?.(true);

import { createHash } from "crypto";

import {
  copyPath,
  generateDesktop,
  joinFiles,
  mkSquashFs,
  mapArch,
  mapHash,
  getImageMetadata,
  sanitizeName
} from "./utils"

import MakerBase from "@electron-forge/maker-base";
import type { MakerAppImageConfig } from "../types/config";
import type { MakerMeta } from "./utils";

/**
 * A fetch-alike implementation used in this module, will be native API if
 * present or otherwise `node-fetch`.
 */
const nodeFetch = (() => {
  const fetchModule = import("node-fetch").then(fetch => fetch.default);
  if((globalThis as {fetch?:Awaited<typeof fetchModule>}).fetch !== undefined)
    return (url:string)=>(globalThis as unknown as {fetch:Awaited<typeof fetchModule>}).fetch(url)
  return async (url:string) => (await fetchModule)(url);
})()

/** Currently supported release of AppImageKit distributables. */
const supportedAppImageKit = 13;

class MakerAppImage<Config extends MakerAppImageConfig> extends MakerBase<Config> {
  defaultPlatforms = ["linux"];
  name = "AppImage";
  override isSupportedOnCurrentPlatform = () => process.platform === "linux";
  override requiredExternalBinaries = ["mksquashfs"];
  override async make({appName,dir,makeDir,packageJSON,targetArch}: MakerMeta) {
    const [
      { tmpdir },
      { join, dirname, extname, relative },
      { mkdtempSync, existsSync },
      { mkdir, writeFile, copyFile, readFile, chmod, rm, symlink }
    ] = await Promise.all([
      import("os"),
      import("path"),
      import("fs"),
      import("fs/promises"),
    ]);
    /** Current maker configuration. */
    const config = this.config,
      /** Node.js friendly name of the application. */
      name = sanitizeName(config.options?.name ?? packageJSON.name as string),
      /** Human-friendly application name. */
      productName = config.options?.productName ?? appName,
      /** A path to application's icon. */
      icon = config?.options?.icon ?? null,
      /** Resolved path to AppImage output file. */
      outFile = join(makeDir, this.name, targetArch, `${productName}-${packageJSON.version}-${targetArch}.AppImage`),
      /** A currently used AppImageKit release. */
      currentTag = config.options?.AppImageKitRelease ?? supportedAppImageKit,
      /**
       * Detailed information about the source files.
       * 
       * As of remote content, objects contain the data in form of
       * ArrayBuffers (which are then allocated to Buffers,
       * checksum-verified and saved as regular files). The text-based
       * generated content is however saved in form of the string (UTF-8
       * encoded, with LF endings).
       */
      sources = {
        /** Details about the AppImage runtime. */
        runtime: {
          data: nodeFetch(remote+currentTag+'/runtime-'+mapArch(targetArch))
            .then(response => {
              if(response)
                return response.arrayBuffer()
              else
                throw new Error("AppRun request failure.")
            }),
          md5: mapHash.runtime[mapArch(targetArch)]
        },
        /** Details about AppRun ELF executable, used to start the app. */
        AppRun: {
          data: nodeFetch(remote+currentTag+'/AppRun-'+mapArch(targetArch))
            .then(response => {
              if(response)
                return response.arrayBuffer()
              else
                throw new Error("AppRun request failure.")
            }),
          md5: mapHash.AppRun[mapArch(targetArch)]
        },
        /** Details about the generated `.desktop` file. */
        desktop: typeof config?.options?.desktopFile === "string" ?
          readFile(config.options.desktopFile, "utf-8") :
          Promise.resolve(generateDesktop({
            Type: "Application",
            Name: productName,
            GenericName: config.options?.genericName,
            Exec: config.options?.name ?? packageJSON.name,
            Icon: icon ? name : undefined,
            Categories: config.options?.categories ?
              config.options.categories.join(';')+';' :
              undefined,
            "X-AppImage-Name": name,
            "X-AppImage-Version": packageJSON.version,
            "X-AppImage-Arch": mapArch(targetArch)
          }, config.options?.actions)),
        /** Shell script used to launch the application. */
        shell: [
          '#!/bin/bash',
          'exec "${0%/*}/../lib/'+name+'/'+name+'" "${@}"'
        ].join('\n')
      };
    if(existsSync(outFile)) rm(outFile);
    /** A temporary directory used for the packaging. */
    const workDir = mkdtempSync(join(tmpdir(), `.${productName}-${packageJSON.version}-${targetArch}-`));
    const iconMeta = icon ? readFile(icon).then(icon => getImageMetadata(icon)) : Promise.resolve(undefined);
    {
      const cleanup = () => rm(workDir, {recursive: true});
      process.on("uncaughtExceptionMonitor", cleanup);
      process.on("exit", cleanup);
    }
    process.on("SIGINT", () => {
      console.error("User interrupted the process.");
      process.exit(130);
    })
    const directories = {
      lib: join(workDir, 'usr/lib/'),
      data: join(workDir, 'usr/lib/', config.options?.name ?? packageJSON.name),
      bin: join(workDir, 'usr/bin'),
      icons: iconMeta.then(meta => meta && meta.width && meta.height ?
        join(workDir, 'usr/share/icons/hicolor', meta.width.toFixed(0)+'x'+meta.height.toFixed(0)) :
        null
      )
    }
    const iconPath = icon ? join(workDir, name+extname(icon)) : undefined;
    /** First-step jobs, which does not depend on any other job. */
    const earlyJobs = [
      // Create further directory tree
      mkdir(directories.lib, {recursive: true, mode: 0o755}),
      mkdir(directories.bin, {recursive: true, mode: 0o755}),
      directories.icons
        .then(path => path ? mkdir(path, {recursive: true, mode: 0o755}).then(() => path) : undefined),
      // Save `.desktop` to file
      sources.desktop
        .then(data => writeFile(
          join(workDir, productName+'.desktop'), data, {mode:0o755, encoding: "utf-8"})
        ),
      // Verify and save `AppRun` to file
      sources.AppRun.data
        .then(data => {
          const buffer = Buffer.from(data);
          if(currentTag === supportedAppImageKit) {
            const hash = createHash("md5")
              .update(buffer)
              .digest('hex');
            if(hash !== sources.AppRun.md5)
              throw new Error("AppRun hash mismatch.");
          }
          writeFile(join(workDir, 'AppRun'), buffer, {mode: 0o755});
        }),
      // Save icon to file and symlink it as `.DirIcon`
      icon && iconPath && existsSync(icon) ?
        copyFile(icon, iconPath)
          .then(() => symlink(relative(workDir, iconPath), join(workDir, ".DirIcon"), 'file'))
        : Promise.reject(Error("Invalid icon / icon path.")),
    ] as const;
    const lateJobs = [
      // Write shell script to file
      earlyJobs[1]
        .then(() => writeFile(join(directories.bin, name),sources.shell, {mode: 0o755})),
      // Copy Electron app to AppImage directories
      earlyJobs[0]
        .then(() => copyPath(dir, directories.data, 0o755)),
      // Copy icon to `usr` directory whenever possible
      Promise.all([earlyJobs[2],earlyJobs[5]])
        .then(([path]) => icon && path ?
          copyFile(icon, join(path,name+extname(icon))) :
          void 0
        ),
      // Ensure that root folder has proper file mode
      chmod(workDir, 0o755)
    ] as const;
    // Wait for early/late jobs to finish
    await(Promise.all([...earlyJobs,...lateJobs]));
    // Run `mksquashfs` and wait for it to finish
    const mkSquashFsArgs:string[] = [
      workDir,
      outFile,
      "-noappend",
      "-all-root",
      "-all-time",
      "0",
      "-mkfs-time",
      "0"
    ];
    if(config.options?.compressor)
      mkSquashFsArgs.push("-comp", config.options.compressor);
    if(config.options?.compressor === "xz")
      mkSquashFsArgs.push(
        // Defaults for `xz` took from AppImageTool:
        "-Xdict-size",
        "100%",
        "-b",
        "16384"
      );
    await new Promise((resolve, reject) => {
      mkdir(dirname(outFile), {recursive: true}).then(() => {
        mkSquashFs(...mkSquashFsArgs)
        .once("close", () => resolve(undefined))
        .once("error", (error) => reject(error));
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

const remote = 'https://github.com/AppImage/AppImageKit/releases/download/';
module.exports = MakerAppImage;