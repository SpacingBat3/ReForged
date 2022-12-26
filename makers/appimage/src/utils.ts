import EventEmitter from "events";
import { createHash, getHashes } from "crypto";

import type { Mode } from "fs";
import type { MakerOptions } from "@electron-forge/maker-base"

type AppImageArch = "x86_64"|"aarch64"|"armhf"|"i686";
type ForgeArch = "x64" | "arm64" | "armv7l" | "ia32" | "mips64el" | "universal";
type ModeFunction = (source:string,destination:string) => Mode|Promise<Mode>;

export interface MakerMeta extends MakerOptions {
  targetArch: ForgeArch;
}

interface ImageMetadata {
  type: "PNG"|"SVG"|"XMP";
  width: number|null;
  height: number|null;
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

export function generateDesktop(desktopEntry: Partial<Record<string,string|null>>, actions?: Record<string,Partial<Record<string,string|null>>&{ Name: string }>) {
  function toEscapeSeq<T>(string:T): T extends string ? string : T {
    if(typeof string === "string")
      return string
        .replaceAll("\\","\\\\")
        .replaceAll("\t", "\\t")
        .replaceAll("\r", "\\r")
        .replaceAll("\n","\\n") as T extends string ? string : T
    return string as T extends string ? string : T;
  }
  const template:Record<"desktop"|"actions",string[]> = { desktop:[], actions:[] };
  let actionsKey:string|null = null;
  template.desktop.push('[Desktop Entry]');
  for(const entry of Object.entries(desktopEntry)) if(entry[0] !== "Actions" && entry[1] !== undefined && entry[1] !== null)
    template.desktop.push(entry.map(v => toEscapeSeq(v)).join('='));
  if(actions) for(const [name,record] of Object.entries(actions)) if(/[a-zA-Z]/.test(name)) {
    actionsKey === null ? actionsKey = name : actionsKey += ";"+name;
    template.actions.push('\n[Desktop Action '+name+']');
    for(const entry of Object.entries(record)) if(entry[1] !== undefined && entry[1] !== null)
      template.actions.push(entry.map(v => toEscapeSeq(v)).join('='));
  }
  if(actionsKey) template.desktop.push("Actions="+actions);
  return template.desktop.join('\n')+'\n'+template.actions.join('\n');
}

/**
 * Asynchroniously copy path from `source` to `destination`, with similar logic
 * to Unix `cp -R` command.
 */
export async function copyPath(source:string, destination:string, dirmode: Mode|ModeFunction = 0o644) {
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
export function mkSquashFs(...squashfsOptions:string[]) {
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
export async function joinFiles(...filesAndBuffers:(string|Buffer)[]) {
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
export function mapArch(arch:ForgeArch):AppImageArch {
  switch(arch) {
  /*________________________________________________________________________*/
  /*  [Forge]    :                     [AppImage]                           */
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
export function mapHash(source:'runtime'|'AppRun', arch:AppImageArch) {
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

/**
 * A function to validate if the type of any value is like the one in
 * {@link ImageMetadata} interface.
 * 
 * @param meta Any value to validate the type of.
 * @returns Whenever `meta` is an {@link ImageMetadata}-like object.
 */
function validateImageMetadata(meta: unknown):meta is ImageMetadata {
  if(typeof meta !== "object" || meta === null)
    return false;
  if(!("type" in meta) || ((meta as {type:unknown}).type !== "PNG" && (meta as {type:unknown}).type !== "SVG"))
    return false;
  if(!("width" in meta) || (typeof (meta as {width:unknown}).width !== "number" && (meta as {width:unknown}).width !== null))
    return false;
  if(!("height" in meta) || (typeof (meta as {height:unknown}).height !== "number" && (meta as {height:unknown}).height !== null))
    return false;
  return true;
}

/**
 * A function to fetch metadata from buffer in PNG or SVG format.
 * 
 * For PNGs, it gets required information (like image width or height)
 * from IHDR header (if it is correct according to spec), otherwise it sets
 * dimention values to `null`.
 * 
 * For SVGs, it gets information about the dimensions from `<svg>` tag. If it is
 * missing, this function will return `null` for `width` and/or `height`.
 * 
 * This function will also recognize file formats based on *MAGIC* headers – for
 * SVGs, it looks for existance of `<svg>` tag, for PNGs it looks if file starts
 * from the specific bytes.
 * 
 * @param image PNG/SVG image buffer.
 */
export function getImageMetadata(image:Buffer):ImageMetadata {
  const svgMagic = {
    file:   /<svg ?[^>]*>/,
    width:  /<svg (?!width).*.width=["']?(\d+)(?:px)?["']?[^>]*>/,
    height: /<svg (?!height).*.height=["']?(\d+)(?:px)?["']?[^>]*>/
  };
  const partialMeta: Partial<ImageMetadata> = {};
  if(image.toString("hex").startsWith("89504e47"))
    partialMeta["type"] = "PNG";
  else if(svgMagic.file.test(image.toString("utf8")))
    partialMeta["type"] = "SVG";
  else
    throw Error("Unsupported image format (FreeDesktop spec expects images only of following MIME type: PNG, SVG and XMP).");
  switch(partialMeta.type) {
    // Based on specification by W3C: https://www.w3.org/TR/PNG/
    case "PNG": {
      const prefixIHDR = 4+image.indexOf("IHDR")
      const rawMeta = {
        width: prefixIHDR === 3 ? null : image.readInt32BE(prefixIHDR),
        height: prefixIHDR === 3 ? null : image.readInt32BE(prefixIHDR+4)
      }
      partialMeta["width"] = (rawMeta.width??0) === 0 ? null : rawMeta.width;
      partialMeta["height"] = (rawMeta.height??0) === 0 ? null : rawMeta.height;
      break;
    }
    case "SVG": {
      const svgImage = image.toString("utf8");
      const rawMeta = {
        width: parseInt(svgImage.match(svgMagic.width)?.[1]??""),
        heigth: parseInt(svgImage.match(svgMagic.height)?.[1]??""),
      }
      partialMeta["width"] = isNaN(rawMeta["width"]) ? null : rawMeta["width"];
      partialMeta["height"] = isNaN(rawMeta["heigth"]) ? null : rawMeta["heigth"];
      break;
    }
  }
  if(validateImageMetadata(partialMeta))
    return partialMeta;
  throw new TypeError("Malformed function return type! ("+JSON.stringify(partialMeta)+").");
}

export function setChecksum(runtime:ArrayBuffer|Buffer,squashfs:Buffer): Buffer {
  if(!getHashes().includes("md5"))
    throw new Error("Current Node.js binary doesn't support \"md5\" digest algorithm.")
  const hashHeader = ".digest_md5";
  const buffer = runtime instanceof Buffer ? runtime : Buffer.from(runtime);
  const hashOffset = buffer.indexOf(hashHeader)+hashHeader.length;
  const [pre,post] = [buffer.subarray(0,hashOffset),buffer.subarray(hashOffset)];
  return Buffer.concat([
    pre,
    createHash("md5").update(squashfs).digest(),
    post
  ]);
}

export function sanitizeName(name:string) {
  if(typeof name !== "string")
    name = String(name);
  if(/^[^a-z0-9-]*$/.test(name))
    name = name
      .toLowerCase()
      .slice(name.search(/[a-z0-9]/))
      .replaceAll(/[^a-z0-9-]/g,"-")
  if(name.length === 0)
    throw new Error("Parameter 'name' is not sanitizable!");
  return name;
}