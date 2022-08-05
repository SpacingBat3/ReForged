import srcmap from "source-map-support";

srcmap.install();

import MakerBase, { MakerOptions } from "@electron-forge/maker-base";
import EventEmitter from "events";
import { createHash } from "crypto";

import type { MakerAppImageConfig } from "../types/config";
import type { Mode } from "fs";

type AppImageArch = "x86_64"|"aarch64"|"armhf"|"i686";
type ForgeArch = "x64" | "arm64" | "armv7l" | "ia32" | "mips64el" | "universal";
type ModeFunction = (source:string,destination:string) => Mode|Promise<Mode>;

/** Currently supported release of AppImageKit distributables. */
const supportedAppImageKit = 13;

interface MakerMeta extends MakerOptions {
    targetArch: ForgeArch;
}

interface mkSquashFsEvent extends EventEmitter {
    /**
     * Emitted when `mksquashfs` process has been closed.
     */
    on(eventName: "close", listener: (
        /** A returned code when process normally exits. */
        code: number|null,
        /** A signal which closed the process. */
        signal:NodeJS.Signals|null
    ) => void): this;
    /**
     * Emitted once `mksquashfs` process has been closed.
     */
    once(eventName: "close", listener: (
        /** A returned code when process normally exits. */
        code: number|null,
        /** A signal which closed the process. */
        signal:NodeJS.Signals|null
    ) => void): this;
    /**
     * Emitted when `mksquashfs` process has been closed.
     */
    addListener(eventName: "close", listener: (
        /** A returned code when process normally exits. */
        code: number|null,
        /** A signal which closed the process. */
        signal:NodeJS.Signals|null
    ) => void): this;
    /**
     * Emitted when `mksquashfs` process has been closed.
     */
    removeListener(eventName: "close", listener: (
        /** A returned code when process normally exits. */
        code: number|null,
        /** A signal which closed the process. */
        signal:NodeJS.Signals|null
    ) => void): this;

    /**
     * Emitted whenever a progress has been made on SquashFS image generation.
     */
    on(eventName: "progress", listener: (
        /** A number from range 0-100 indicating the current progress made on creating the image. */
        percent: number) => void): this;
    /**
     * Emitted whenever a progress has been made on SquashFS image generation.
     */
    once(eventName: "progress", listener: (
        /** A number from range 0-100 indicating the current progress made on creating the image. */
        percent: number) => void): this;
    /**
     * Emitted whenever a progress has been made on SquashFS image generation.
     */
    addListener(eventName: "progress", listener: (
        /** A number from range 0-100 indicating the current progress made on creating the image. */
        percent: number) => void): this;
    /**
     * Emitted whenever a progress has been made on SquashFS image generation.
     */
    removeListener(eventName: "progress", listener: (
        /** A number from range 0-100 indicating the current progress made on creating the image. */
        percent: number) => void): this;

    /** Emitted whenever process has threw an error. */
    on(eventName: "error", listener: (error: Error) => void): this;
    /** Emitted whenever process has threw an error. */
    once(eventName: "error", listener: (error: Error) => void): this;
    /** Emitted whenever process has threw an error. */
    addListener(eventName: "error", listener: (error: Error) => void): this;
    /** Emitted whenever process has threw an error. */
    removeListener(eventName: "error", listener: (error: Error) => void): this;

    /** @internal */
    emit(event: "progress", percent: number): boolean;
    /** @internal */
    emit(event: "close", code: number|null, signal:NodeJS.Signals|null): boolean;
    /** @internal */
    emit(event: "error", error: Error): boolean;
}

class MakerAppImage<Config extends MakerAppImageConfig> extends MakerBase<Config> {
    defaultPlatforms = ["linux"];
    name = "AppImage";
    override isSupportedOnCurrentPlatform = () => process.platform === "linux";
    override requiredExternalBinaries = ["mksquashfs"];
    override async make({appName,dir,makeDir,packageJSON,targetArch}: MakerMeta) {
        const [
            { tmpdir },
            { join, dirname, extname, relative, basename },
            { mkdtempSync, existsSync },
            { mkdir, writeFile, copyFile, chmod, rm, symlink }
        ] = await Promise.all([
            import("os"),
            import("path"),
            import("fs"),
            import("fs/promises"),
        ]);
        /** Current maker configuration. */
        const config = this.config,
            /** Node.js friendly name of the application. */
            name = config.options?.name ?? (packageJSON.name as string),
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
                    data: import("node-fetch") 
                        .then(f => f.default(remote+currentTag+'/runtime-'+mapArch(targetArch)))
                        .then(response => {
                            if(response)
                                return response.arrayBuffer()
                            else
                                throw new Error("AppRun request failure.")
                        }),
                    md5: mapHash("runtime",mapArch(targetArch))
                },
                /** Details about AppRun ELF executable, used to start the app. */
                AppRun: {
                    data: import("node-fetch")
                        .then(f => f.default(remote+currentTag+'/AppRun-'+mapArch(targetArch)))
                        .then(response => {
                            if(response)
                                return response.arrayBuffer()
                            else
                                throw new Error("AppRun request failure.")
                        }),
                    md5: mapHash("AppRun",mapArch(targetArch))
                },
                /** Details about the generated `.desktop` file. */
                desktop: generateDesktop({
                    Type: "Application",
                    Name: productName,
                    GenericName: config.options?.genericName ?? null,
                    Exec: config.options?.name ?? packageJSON.name,
                    Icon: icon ? './'+name+extname(icon) : null,
                    Categories: config.options?.categories ?
                        config.options.categories.join(';')+';' :
                        null
                }),
                /** Shell script used to launch WebCord. */
                shell: [
                    '#!/bin/bash',
                    'exec "${0%/*}/../lib/'+name+'/'+name+'" "${@}"'
                ].join('\n')
            };
        if(existsSync(outFile)) rm(outFile);
        /** A temporary directory used for the packaging. */
        const workDir = mkdtempSync(join(tmpdir(), `.${productName}-${packageJSON.version}-${targetArch}-`));
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
            //icons: join(workDir, 'usr/share/', config.options?.name ?? packageJSON.name),
        }
        const iconPath = icon ? join(workDir, name+extname(icon)) : undefined
        const defineMode:ModeFunction = async (_source,destination) => {
            switch (basename(destination)) {
                case "locales":
                case "resources":
                    return 0o644;
                default:
                    return 0o755;
            }
        }
        /** First-step jobs, which does not depend on any other job than */
        const earlyJobs = [
            // Create further directory tree
            mkdir(directories.lib, {recursive: true, mode: 0o755}),
            mkdir(directories.bin, {recursive: true, mode: 0o755}),
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
                : Promise.resolve<void>(void undefined),
        ] as const;
        const lateJobs = [
            // Write shell script to file
            earlyJobs[1]
                .then(() => writeFile(join(directories.bin, name),sources.shell, {mode: 0o755})),
            // Copy Electron app to AppImage directories
            earlyJobs[0]
                .then(() => {copyPath(dir, directories.data, defineMode);}),
            // Ensure that root folder has proper file mode
            chmod(workDir, 0o755)
        ] as const;
        // Wait for early/late jobs to finish
        await(Promise.all([...earlyJobs,...lateJobs]));
        // Run `mksquashfs` and wait for it to finish
        await new Promise((resolve, reject) => {
            mkdir(dirname(outFile), {recursive: true}).then(() => {
                mkSquashFs(workDir, outFile, "-all-root")
                    .once("close", () => resolve(undefined))
                    .once("error", (error) => reject(error));
            }).catch(error => reject(error));
        });
        // Append runtime to SquashFS image and wait for that task to finish
        await sources.runtime.data
            .then(runtime => joinFiles(Buffer.from(runtime),outFile))
            .then(buffer => writeFile(outFile, buffer))
            .then(() => chmod(outFile, 0o755))
        // Finally, return a path to maker artifacts
        return [outFile];
    }
}

async function generateDesktop(desktopEntry: Record<string,string|null>, actions?: Record<string,Record<string,string|null>>) {
    const template:string[] = [];
    template.push('[Desktop Entry]');
    for(const entry of Object.entries(desktopEntry)) if(entry[1] !== null)
        template.push(entry.join('='));
    if(actions) for(const [name,record] of Object.entries(actions)) {
        template.push('\n[Desktop Action '+name+']');
        for(const entry of Object.entries(record)) if(entry[1] !== null)
            template.push(entry.join('='));
    }
    return template.join('\n');
}

/**
 * Asynchroniously copy path from `source` to `destination`, with similar logic
 * to Unix `cp -R` command.
 */
async function copyPath(source:string, destination:string, dirmode: Mode|ModeFunction = 0o644) {
    async function copyDirRecursively(source:string, destination:string) {
        const jobs: Array<Promise<void>> = [];
        const [
            {copyFile, readdir, lstat, mkdir},
            {resolve}
        ] = await Promise.all([
            import("fs/promises"),
            import("path")
        ]);
        const items = await readdir(source);
        const mode = typeof dirmode === "function" ? dirmode(source,destination) : dirmode;
        await mkdir(destination, await mode);
        for(const item of items) {
            const itemPath = {
                src: resolve(source, item),
                dest: resolve(destination, item)
            }
            jobs.push(lstat(itemPath.src).then(async(stats) => {
                if(stats.isDirectory())
                    await copyDirRecursively(itemPath.src, itemPath.dest);
                else {
                    await copyFile(itemPath.src, itemPath.dest);
                }
            }));
        }
        return void await Promise.all(jobs);
    }
    const [{lstat, copyFile}, {existsSync}] = await Promise.all([import("fs/promises"), import("fs")]);
    const stats = lstat(source);
    const resolvedDestination = destination.endsWith("/") || existsSync(destination) ?
        import("path").then(path => path.resolve(destination, path.basename(source))) :
        destination
    if((await stats).isDirectory()) {
        return copyDirRecursively(source, await resolvedDestination);
    } else {
        return copyFile(source, await resolvedDestination);
    }
}

/**
 * Raw bindings to `mksquashfs` binary.
 * 
 * @returns An event used to watch for `mksquashfs` changes, including the job
 * progress (in percent – as float number).
 */
function mkSquashFs(...squashfsOptions:string[]) {
    const event:mkSquashFsEvent = new EventEmitter();
    import("child_process").then(child => child.spawn)
        .then(spawn => {
            const mkSquashFS = spawn("mksquashfs", squashfsOptions);
            let lastProgress = 0;
            mkSquashFS.stdout.on("data", (chunk) => {
                if(Buffer.isBuffer(chunk)) {
                    const message = chunk.toString();
                    const progress = message.match(/\] [0-9/]+ ([0-9]+)%/)?.[1];
                    if(progress !== undefined) {
                        const progInt = Number(progress);

                        if(progInt >= 0 && progInt <= 100 &&
                            progInt !== lastProgress && event.emit("progress", progInt/100))
                                lastProgress = progInt;
                    }
                }
            });
            mkSquashFS.on('close', (...args) => event.emit("close",...args));
            mkSquashFS.on('error', (error) => event.emit("error", error));
        });
    return event;
}

/**
 * Concatenates files and/or buffers into single buffer.
 */
async function joinFiles(...filesAndBuffers:(string|Buffer)[]) {
    const {readFile} = await import("fs/promises");
    const bufferArray: Promise<Buffer>[] = [];
    for(const path of filesAndBuffers)
        if(Buffer.isBuffer(path))
            bufferArray.push(Promise.resolve(path));
        else
            bufferArray.push(readFile(path));
    return Promise.all(bufferArray).then(array => Buffer.concat(array))
}

/**
 * Maps Node.js architecture to the AppImage-friendly format.
 */
function mapArch(arch:ForgeArch):AppImageArch {
    switch(arch) {
    /*________________________________________________________________________*/
    /*    [Forge]    :                       [AppImage]                       */
        case "x64"   : return "x86_64";
        case "ia32"  : return "i686";
        case "arm64" : return "aarch64";
        case "armv7l": return "armhf";
        default      : throw new Error("Unsupported architecture: '"+arch+"'.");
    /*________________________________________________________________________*/
    /*                                                                        */
    }
}

/** 
 * Maps files to their MD5 hashes.
 * 
 * **Note:** Checksums are valid only for the assets of AppImageKit `13`.
 */
function mapHash(source:'runtime'|'AppRun', arch:AppImageArch) {
    switch(source) {
        case "runtime":
            switch(arch) {
                case "x86_64":
                    return "37d6f0bc41f143c8c0376e874769e20a";
                case "i686":
                    return "498c198765ebb914e43713af4f85c5a9";
                case "aarch64":
                    return "d41d8cd98f00b204e9800998ecf8427e";
                case "armhf":
                    return "85b929e78dc59098928df1655b4b7963";
            }
        case "AppRun":
            switch(arch) {
                case "x86_64":
                    return "91b81afc501f78761adbf3bab49b0590";
                case "i686":
                    return "a16e8b7d1052a388bb9fd1e42d790434";
                case "aarch64":
                    return "e991d36711f99097e5c46deabb0c84a9";
                case "armhf":
                    return "4e7401fd36d3d4afa4963bf0a8e08221";
            }            
    }
}

const remote = 'https://github.com/AppImage/AppImageKit/releases/download/'

module.exports = MakerAppImage;