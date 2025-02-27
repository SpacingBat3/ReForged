import EventEmitter from "events";
import { Mode, existsSync } from "fs";
import { readFile } from "fs/promises";
import { execFileSync, execFile } from "child_process";

import { coerce } from "semver";

import type { MakerOptions } from "@electron-forge/maker-base"
import type { SemVer } from "semver"

type AppImageArch = "x86_64"|"aarch64"|"armhf"|"i686";
export type ForgeArch = "x64" | "arm64" | "armv7l" | "ia32" | "mips64el" | "universal";
type ModeFunction = (source:string,destination:string) => Mode|Promise<Mode>;

export interface MakerMeta extends MakerOptions {
  targetArch: ForgeArch;
}

interface ImageMetadata {
  type: "PNG"|"SVG"|"XPM3"|"XPM2";
  width: number|null;
  height: number|null;
}

/** Function argument definitions for {@linkcode mkSqFsEvt}. */
interface mkSqFSListenerArgs {
  close: [
    /** A returned code when process normally exits. */
    code: number|null,
    /** A signal which closed the process. */
    signal:NodeJS.Signals|null,
    /** A message printed to STDERR, if available. */
    msg?:string
  ];
  progress: [
    /** A number from range 0-100 indicating the current progress made on creating the image. */
    percent: number
  ];
  error: [
    error: Error
  ];
};

type mkSqFSEvtListen<T extends keyof mkSqFSListenerArgs> = [
  eventName: T,
  listener: (..._:mkSqFSListenerArgs[T]) => void
];

type mkSqFSEvtEmit<T extends keyof mkSqFSListenerArgs> = [
  event: T,
  ..._:mkSqFSListenerArgs[T]
];

/** An `EventListener` interface with parsed events from mksquashfs child process. */
interface mkSqFsEvt extends EventEmitter {
  /**
   * Emitted when `mksquashfs` process has been closed.
   */
  on(..._:mkSqFSEvtListen<"close">): this;
  /**
   * Emitted once `mksquashfs` process has been closed.
   */
  once(..._:mkSqFSEvtListen<"close">): this;
  /**
   * Emitted when `mksquashfs` process has been closed.
   */
  addListener(..._:mkSqFSEvtListen<"close">): this;
  /**
   * Emitted when `mksquashfs` process has been closed.
   */
  removeListener(..._:mkSqFSEvtListen<"close">): this;

  /**
   * Emitted whenever a progress has been made on SquashFS image generation.
   */
  on(..._:mkSqFSEvtListen<"progress">): this;
  /**
   * Emitted whenever a progress has been made on SquashFS image generation.
   */
  once(..._:mkSqFSEvtListen<"progress">): this;
  /**
   * Emitted whenever a progress has been made on SquashFS image generation.
   */
  addListener(..._:mkSqFSEvtListen<"progress">): this;
  /**
   * Emitted whenever a progress has been made on SquashFS image generation.
   */
  removeListener(..._:mkSqFSEvtListen<"progress">): this;

  /** Emitted whenever process has threw an error. */
  on(..._:mkSqFSEvtListen<"error">): this;
  /** Emitted whenever process has threw an error. */
  once(..._:mkSqFSEvtListen<"error">): this;
  /** Emitted whenever process has threw an error. */
  addListener(..._:mkSqFSEvtListen<"error">): this;
  /** Emitted whenever process has threw an error. */
  removeListener(..._:mkSqFSEvtListen<"error">): this;

  /** @internal */
  emit(..._:mkSqFSEvtEmit<"close">): boolean;
  /** @internal */
  emit(..._:mkSqFSEvtEmit<"progress">): boolean;
  /** @internal */
  emit(..._:mkSqFSEvtEmit<"error">): boolean;
}

export function generateDesktop(desktopEntry: Partial<Record<string,string|null>>, actions?: Record<string,Partial<Record<string,string|null>>&{ Name: string }>) {
  function toEscapeSeq<T>(string:T): T extends string ? string : T {
    if(typeof string === "string")
      return string
        .replaceAll(/\\(?!["`trn])/g,"\\\\")
        .replaceAll("`","\\`")
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
 * Asynchronously copy path from `source` to `destination`, with similar logic
 * to Unix `cp -R` command.
 */
export async function copyPath(source:string, destination:string, dirmode: Mode|ModeFunction = 0o644) {
  const fs = Promise.all([import("fs"), import("fs/promises")])
    .then(([sync,async]) => ({...sync, ...async}));
  const path = import("path");
  async function copyDirRecursively(source:string, destination:string) {
    const jobs: Array<Promise<void>> = [];
    const items = await (await fs).readdir(source);
    const mode = typeof dirmode === "function" ? dirmode(source,destination) : dirmode;
    await (await fs).mkdir(destination, await mode);
    for(const item of items) {
      const itemPath = {
        src: (await path).resolve(source, item),
        dest: (await path).resolve(destination, item)
      }
      jobs.push((await fs).lstat(itemPath.src).then(async(stats) => {
        if(stats.isDirectory())
          await copyDirRecursively(itemPath.src, itemPath.dest);
        else if(stats.isFile())
          await (await fs).copyFile(itemPath.src, itemPath.dest);
        else if((await stats).isSymbolicLink()) {
          const target = (await path)
            .resolve(itemPath.src, await (await fs).readlink(itemPath.src));
          if((await fs).existsSync(target))
            return (await fs).symlink(
              (await path).relative(itemPath.dest, target),
              await itemPath.dest
            )
        }
      }));
    }
    return void await Promise.all(jobs);
  }
  const stats = (await fs).lstat(source);
  const resolvedDestination = destination.endsWith("/") || (await fs).existsSync(destination) ?
    import("path").then(path => path.resolve(destination, path.basename(source))) :
    destination
  if((await stats).isDirectory())
    return copyDirRecursively(source, await resolvedDestination);
  else
    return (await fs).copyFile(source, await resolvedDestination);
}

/**
 * A wrapper for `mksquashfs` binary.
 *
 * @returns An event used to watch for `mksquashfs` changes, including the job progress (in percent – as float number).
 */
export function mkSquashFs(...argv:string[]) {
  let lastProgress = 0, stderrCollector = "";
  const event:mkSqFsEvt = new EventEmitter(), {PATH,SOURCE_DATE_EPOCH} = process.env, {
    stderr,stdout
  } = execFile("mksquashfs", argv, {
    encoding: "utf-8",
    windowsHide: true,
    env: { PATH, SOURCE_DATE_EPOCH }
  }).once("close", (...args) => event.emit(
    "close",
    ...args,
    stderrCollector ? undefined : stderrCollector
  )).on("error", (error) => event.emit("error", error));
  stderr?.on("data", (chunk:string|object) => {switch(chunk.constructor){
    case String:
      stderrCollector+=chunk; break;
    default:
      throw new TypeError(`Unresolved chunk of type '${chunk?.constructor.name ?? typeof chunk}'.`);
  }})
  stdout?.on("data", (chunk:string|object) => {
    if(chunk.constructor !== String) return;
    const progress = chunk.match(/\] [0-9/]+ ([0-9]+)%/)?.[1];
    if(progress === undefined) return;
    const progInt = parseInt(progress,10);
    if(progInt >= 0 && progInt <= 100 && progInt !== lastProgress
        && event.emit("progress", progInt/100))
      lastProgress = progInt;
  });
  return event;
}

/**
 * Returns the version of `mksquashfs` binary, as `SemVer` value.
 *
 * Under the hood, it executes `mksquashfs` with `-version`, parses
 * the `stdout` and tries to coerce it to `SemVer`.
 */
export function getSquashFsVer() {
  let output:string|SemVer|undefined|null = execFileSync("mksquashfs",["-version"],{
    encoding: "utf8",
    timeout: 3000,
    maxBuffer: 768,
    windowsHide: true,
    env: { PATH: process.env["PATH"] }
  }).split('\n')[0];
  if(output === undefined)
    throw new TypeError("Unable to parse '-version': first line read error.");
  output = /(?<=version )[0-9.]+/.exec(output)?.[0];
  if(output === undefined)
    throw new TypeError("Unable to parse '-version': number not found.");
  output = coerce(output);
  if(output === null)
    throw new Error(`Unable to coerce string '${output}' to SemVer.`);
  return output;
};

/**
 * Concatenates files and/or buffers into a new buffer.
 */
export async function joinFiles(...filesAndBuffers:readonly(string|ArrayBufferLike|Uint8Array)[]) {
  const buffArr = <Promise<Uint8Array>[]>[];
  for(const path of filesAndBuffers)
    // Convert anything to Uint8Array as buffer representation
    if(path instanceof <Uint8ArrayConstructor>Object.getPrototypeOf(Uint8Array))
      buffArr.push(Promise.resolve(new Uint8Array(path.buffer)));
    else if(path instanceof ArrayBuffer || path instanceof SharedArrayBuffer)
      buffArr.push(Promise.resolve(new Uint8Array(path)));
    else if(existsSync(path))
      buffArr.push(readFile(path));
    else
      throw new Error(`Unable to concat '${path}': Invalid path.`);
  return Promise.all(buffArr)
    .then(buffArr => {
      // Concat all buffers into the new ones.
      const length = buffArr.reduce((p,c)=>p+c.length,0);
      const result = new Uint8Array(length);
      let preBuffLen = 0;
      for(const buff of buffArr)
        result.set(buff,preBuffLen),
        preBuffLen=buff.length;
      return result;
    });
}
/**
 * Maps Node.js architecture to the AppImage-friendly format.
 */
export const mapArch:Readonly<Partial<Record<ForgeArch,AppImageArch>>> = Object.freeze({
  x64:    "x86_64",
  ia32:   "i686",
  arm64:  "aarch64",
  armv7l: "armhf"
});

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

const enum FileHeader {
  PNG = 0x89504e47,
  XPM2 = 0x58504d32,
  XPM3 = 0x58504D20
}

/**
 * A function to fetch metadata from buffer in PNG or SVG format.
 *
 * @remarks
 *
 * For PNGs, it gets required information (like image width or height)
 * from IHDR header (if it is correct according to spec), otherwise it sets
 * dimension values to `null`.
 *
 * For SVGs, it gets information about the dimensions from `<svg>` tag. If it is
 * missing, this function will return `null` for `width` and/or `height`.
 *
 * This function will also recognize file formats based on *MAGIC* headers – for
 * SVGs, it looks for existence of `<svg>` tag, for PNGs it looks if file starts
 * from the specific bytes.
 *
 * @param image PNG/SVG/XPM image buffer.
 */
export function getImageMetadata(image:Buffer):ImageMetadata {
  const svgMagic = {
    file:   /<svg ?[^>]*>/,
    width:  /<svg (?!width).*.width=["']?(\d+)(?:px)?["']?[^>]*>/,
    height: /<svg (?!height).*.height=["']?(\d+)(?:px)?["']?[^>]*>/
  };
  const partialMeta: Partial<ImageMetadata> = {};
  if(image.readUInt32BE() === FileHeader.PNG)
    partialMeta["type"] = "PNG";
  else if(image.readUInt32BE(2) === FileHeader.XPM2)
    partialMeta["type"] = "XPM2";
  else if(image.readUInt32BE(3) === FileHeader.XPM3)
    partialMeta["type"] = "XPM3";
  else if(svgMagic.file.test(image.toString("utf8")))
    partialMeta["type"] = "SVG";
  else
    throw Error("Unsupported image format (FreeDesktop spec expects images only of following MIME type: PNG, SVG and XPM).");
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
        height: parseInt(svgImage.match(svgMagic.height)?.[1]??""),
      }
      partialMeta["width"] = isNaN(rawMeta["width"]) ? null : rawMeta["width"];
      partialMeta["height"] = isNaN(rawMeta["height"]) ? null : rawMeta["height"];
      break;
    }
    default:
      if(typeof partialMeta["type"] === "string")
        throw new Error(`Not yet supported image format: '${partialMeta["type"]}'.`);
      else
        throw new TypeError(`Invalid type of 'partialMeta.type': '${typeof partialMeta["type"]}' (should be 'string')`);
  }
  if(validateImageMetadata(partialMeta))
    return partialMeta;
  throw new TypeError("Malformed function return type! ("+JSON.stringify(partialMeta)+").");
}