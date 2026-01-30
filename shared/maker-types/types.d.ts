import { FreeDesktopCategories, OfficialMimeTypes } from "./db.d.ts";

/** Type representing one of official MIME groups. */
type MimeGroups =
  | "application" | "audio" | "font"
  | "haptics" | "image" | "message" | "model"
  | "multpart" | "text" | "video"

/** Common ReForged maker config structure */
interface MakerConfig<T extends MakerOptions> {
  /**
   * Maker configuration options.
   */
  options?: T;
}

/**
 * An `IconSet` is a type that is based upon `Record`-alike type
 * supported by many official Electron Forge makers, yet not documented
 * well in official API docs.
 *
 * @remarks
 *
 * ReForged implementation adds additional properties in order to
 * guarantee much more fine-grained configuration that makes sense
 * for ReForged makers.
 *
 * @todo
 *
 * A separate set of utilities and/or types might come in the future as
 * maker-agnostic implementation for parsing and populating icons in
 * specific paths. All makers, at least Linux ones, will depend on it
 * to provide icons system-wide.
 */
interface IconSet {
  /**
   * Whether icon set objects should also undergo additional dimensions
   * verification, to ensure there are no differences between real and
   * configuration icon dimensions.
   *
   * Default is `false`.
   */
  strict?: boolean;
  /**
   * Which icon should be set as default. It is maker-dependent whenever
   * "default" icon means anything and if it will be treated differently
   * at all.
   *
   * @remarks
   *
   * Currently, this is only used by AppImage maker for selecting which
   * icon should be symlinked as `.DirIcon` and `<name>.<ext>` files.
   *
   * By default, `scalable` will be picked or icon that has largest
   * dimensions (compared by their pixel count).
   */
  default?: `${number}x${number}` | "scalable";
  /** Scalable icon representation. */
  scalable?: string;
  /** Fixed-dimensions icon representation. */
  [fixed: `${number}x${number}`]: string;
}

interface MakerOptions {
  /**
   * Name of the package (lowercase & hypens only). Makers sanitize this value
   * with a chance of encountering a failure for unsanitizable strings.
   *
   * Defaults to sanitized `packageJSON.name`.
   */
  name?: string;
  /**
   * Human-friendly name of the application.
   *
   * Defaults to `packageJSON.productName`.
   */
  productName?: string;
  /**
   * Name of the executable to put into the `Exec` field of generated
   * `.desktop` file.
   *
   * Defaults to `options.name`.
   */
  bin?: string;
  /**
   * Path to icon to use for the application (shortcut, launchers etc.).
   */
  icon?: string | IconSet;
}

interface MakerUnixOptions extends MakerOptions {
  /**
   * Generic name of the application used in `.desktop` file.
   */
  genericName?: string;
  /**
   * List of desktop file categories to append.
   */
  categories?: (
    | FreeDesktopCategories["main"]
    | FreeDesktopCategories["additional"]
  )[];
  /**
   * Actions to be used within a generated desktop file.
   */
  actions?: Record<
    string,
    FreeDesktopAction & Partial<Record<string, string | null>>
  >;
  /**
   * Path to desktop file to be used instead of generating a new one.
   */
  desktopFile?: string;
  /**
   * MIME types to associate with given desktop file.
   *
   * @remarks
   * Can be used to associate custom protocols with `x-scheme-handler/[protocol]`.
   */
  mimeType?: (
    | OfficialMimeTypes
    | `${MimeGroups}/${"vnd." | "x-"}${string}`
    | `${"x-" | "vnd."}${string}/${string}`
  )[];
  /**
   * Additional keywords that improve application searchability.
   */
  keywords?: string[]
}

interface FreeDesktopAction {
  /** Action's user-friendly name */
  Name: string;
  /** A path to action icon */
  Icon?: string | null;
  /** A command to execute on a desktop file action */
  Exec?: string | null;
}

export {
  IconSet,
  MakerConfig,
  MakerOptions,
  MakerUnixOptions,
  FreeDesktopCategories,
  FreeDesktopAction
}