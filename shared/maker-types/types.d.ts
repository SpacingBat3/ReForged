/** Common ReForged maker config structure */
interface MakerConfig<T extends MakerOptions> {
  /**
   * Maker configuration options.
   */
  options?: T
}

interface MakerOptions {
  /**
   * Name of the package (lowercase & hypens only). Makers sanitize this value
   * with a chance of encountering a failure for unsanitizable strings.
   *
   * Defaults to sanitized `packageJSON.name`.
   */
  name?: string,
  /**
   * Human-friendly name of the application.
   *
   * Defaults to `packageJSON.productName`.
   */
  productName?: string,
  /**
   * Name of the executable to put into the `Exec` field of generated
   * `.desktop` file.
   *
   * Defaults to `options.name`.
   */
  bin?: string,
  /**
   * Path to icon to use for the application (shortcut, launchers etc.).
   */
  icon?: string,
}

interface MakerUnixOptions extends MakerOptions {
  /**
   * Generic name of the application used in `.desktop` file.
   */
  genericName?: string,
  /**
   * List of desktop file categories to append.
   */
  categories?: (
    FreeDesktopCategories["main"] | FreeDesktopCategories["additional"]
  )[],
  /**
   * Actions to be used within a generated desktop file.
   */
  actions?: Record<string, FreeDesktopAction & Partial<Record<string,string|null>>>,
  /**
   * Path to desktop file to be used instead of generating a new one.
   */
  desktopFile?: string
}

interface FreeDesktopAction {
  /** Action's user-friendly name */
  Name: string,
  /** A path to action icon */
  Icon?: string|null,
  /** A command to execute on a desktop file action */
  Exec?: string|null
}

/**
 * FreeDesktop software categories, grouped as in FreeDesktop specification.
 *
 * @privateRemarks
 *
 * Generated using DevTools with:
 * ```js
 * const out = [];
 * for(const td of document.querySelectorAll("table.informaltable>tbody>tr>td:first-child"))
 *     out.push('"'+td.innerText+'"');
 * console.log(out.join(' | '));
 * ```
 */
interface FreeDesktopCategories {
  /** Categories that every desktop confirming environment **must** support. */
  main: (
      `Audio${"Video"|""}` | "Video" | "Development" | "Education" | "Game" |
      "Graphics" | "Network" | "Office" | "Science" | "Settings" | "System" |
      "Utility"
  );
  /**
   * Categories that provide more fine grained information about the
   * application.
   */
  additional: (
      "Building" | "Debugger" | "IDE" | "GUIDesigner" | "Profiling" |
      "RevisionControl" | "Translation" | "Calendar" | "Database" |
      "Dictionary" | "Email" | "Finance" | `${"Flow"|""}Chart` | "PDA" |
      "Presentation" | "Spreadsheet" | "WordProcessor" | "Scanning" | "OCR" |
      "Photography" | `${"Contact"|"Project"}Management` |
      `${"2D"|"3D"|"Vector"|"Raster"}Graphics` | "Publishing" | "Viewer" |
      `Text${"Tools"|"Editor"}` | "DesktopSettings" | "HardwareSettings" |
      "Printing" | "PackageManager" | "Dialup" | "InstantMessaging" | "Chat" |
      "IRCClient" | "Feed" | "FileTransfer" | "HamRadio" | "News" | "P2P" |
      "RemoteAccess" | `Telephony${""|"Tools"}` | "VideoConference" |
      `Web${"Browser"|"Development"}` | "Midi" | "Mixer" | "Sequencer" |
      "Tuner" | "TV" | "AudioVideoEditing" | "Player" | "Recorder" |
      "DiscBurning"  | "RolePlaying" | "Shooter" | `${"Action" | "Adventure" |
      "Arcade" | "Board" | "Blocs" | "Card" | "Kids" | "Logic" | "Sports" |
      "Strategy"}Game` | "Simulation" | "Art" | "Construction" | "Music" |
      "Languages" | "ArtificialIntelligence" | "Astronomy" | "Biology" |
      "Chemistry" | "ComputerScience" | "DataVisualization" | "Economy" |
      "Electricity" | `Geo${"graphy"|"logy"|"science"}` | "History" |
      "Humanities" | "ImageProcessing" | "Literature" | "Maps" | "Math" |
      "NumericalAnalysis" | "MedicalSoftware" | "Physics" | "Robotics" |
      "Spirituality" |"Sports" |"ParallelComputing" | "Amusement" |
      "Archiving" | "Compression" | "Electronics" | "Engineering" |
      `File${"Tools"|"Manager"|"system"}` | "Monitor" | "Security" |
      `${""|"Terminal"}Emulator` | "Accessibility" | "Calculator" | "Clock" |
      "Documentation" | "Adult" | "Core" | "KDE" | "GNOME" | "XFCE" | "GTK" |
      "Qt" | "Motif" | "Java" | "ConsoleOnly"
  );
}

export {
  MakerConfig,
  MakerOptions,
  MakerUnixOptions,
  FreeDesktopCategories,
  FreeDesktopAction
}