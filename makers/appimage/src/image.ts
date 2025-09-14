import type {IconSet, MakerUnixOptions} from "@reforged/maker-types"
import { copyFile, mkdir, readFile, symlink } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const getFixedDims = (icon:IconSet) => Object.keys(icon)
  // Pick NxN
  .filter(key => key.includes("x",1))
  // Convert types
  .map(key => key.split("x",2).map(n => Number(n)) as [number,number])
  // Verify
  .filter(key => key.every(n => !isNaN(n)));

export default async function storeIcons(conf: MakerUnixOptions["icon"], out: string, work:string, app:string) {
  const icons = await normalizeIcon(conf);
  const sizes = getFixedDims(icons)
    .map(dim =>`${dim[0]}x${dim[1]}` as `${number}x${number}`|"scalable");
  if(icons.scalable) sizes.push("scalable");
  const jobs = [];
  for(const imgKey of sizes) if(imgKey in icons && icons[imgKey]) {
    const iconDir = join(out,imgKey,"apps");
    const iconFile = icons[imgKey];
    // Create icon + icon path.
    jobs.push(
      mkdir(iconDir,{mode:0o755,recursive:true}).then(() => copyFile(
        iconFile,
        join(iconDir,app+extname(iconFile))
      ))
    );
  }
  await Promise.all(jobs);
  if(icons.default && icons[icons.default]) {
    const iconFile = app+extname(icons[icons.default] as string);
    const iconOut = relative(work,join(out,icons.default,"apps",iconFile));
    await Promise.all([
      symlink(
        iconOut,
        join(work,".DirIcon")
      ),
      symlink(
        iconOut,
        join(work,iconFile)
      )
    ]);
  }
}

/**
 * Normalizes icon property, i.e. converts it to {@linkcode IconSet} and
 * ensures all necessary fallback logic has been applied.
 *
 * @param conf raw icon property from options
 * @returns A {@linkcode IconSet} that has been normalized.
 */
async function normalizeIcon(conf: MakerUnixOptions["icon"]): Promise<IconSet> {
  switch(typeof conf) {
    // 1. Unset parameters are empty icon sets
    case "undefined": return {};
    // 2. Strings depend on automatic discovery of metadata.
    //@ts-expect-error(TS7029) fallthrough
    case "string": {
      const meta = await readFile(conf).then(getImageMetadata)
      const result:IconSet = { strict:false };
      if(meta.width && meta.height)
        result[result.default = `${meta.width}x${meta.height}`] = conf;
      if(meta.type === "SVG")
        result[result.default = "scalable"] = conf;
      conf = result;
    }
    // 3. Icon sets have validated structure if necessary
    default: if((!conf.default && !conf.scalable) || conf.strict) {
      const dim = getFixedDims(conf);
      // Set default for non-present scalable
      if(!conf.default) {
        const predicate = dim.sort((x,y) => (y[0]*y[1])-(x[0]*x[1]))[0]?.join('x') as `${number}x${number}`|undefined;
        if(predicate) conf.default = predicate;
      }
      // Additional (optional) validation step
      if(conf.strict) for(const img of dim.map(dim => dim.join('x') as `${number}x${number}`))
        if(img in conf && conf[img]) {
          const meta = readFile(conf[img]).then(getImageMetadata)
          if(img !== `${(await meta).width}x${(await meta).height}`)
            throw Error("Object icon validation failed");
        }
    } else if(!conf.default) conf.default = "scalable";
  }
  return conf;
}

interface ImageMetadata {
  type: "PNG"|"SVG"|"XPM3"|"XPM2";
  width: number|null;
  height: number|null;
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
  if(!("type" in meta))
    return false;
  else switch(meta.type) {
    case "PNG": case "SVG": case "XPM3": case "XPM2": break;
    default: return false;
  }
  if(!("width" in meta) || (typeof meta.width !== "number" && meta.width !== null))
    return false;
  if(!("height" in meta) || (typeof meta.height !== "number" && meta.height !== null))
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
function getImageMetadata(image:Buffer):ImageMetadata {
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
    throw Error("Unsupported file format")
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
      // Not yet supported assignment
      partialMeta["width"] = null;
      partialMeta["height"] = null;
  }
  if(validateImageMetadata(partialMeta)) return partialMeta;
  throw TypeError("Malformed function return type! ("+JSON.stringify(partialMeta)+").");
}