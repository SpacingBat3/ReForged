export interface MakerAppImageConfigOptions {
    /**
     * Name of the package (used as folder name, `X-AppImage-Name` etc).
     * It should contain only lowercase letters and hyphens. It should also start
     * from a letter and contain at least one character.
     *
     * If above requirements aren't met, maker will approach to sanitize the
     * string to match the required format. This process might fail if
     * the string is nowhere close to match the requirements, so the one
     * shouldn't depend on the sanitizer when setting the `name` property on
     * their own.
     *
     * Defaults to sanitized `packageJSON.name`.
     *
     * @since v1.0.0
     *
     */
    name?: string,
    /**
     * Name of the executable to put into the `Exec` field of generated
     * `.desktop` file.
     *
     * Defaults to `options.name`.
     */
    bin?: string,
    /**
     * Human-friendly name of the application.
     *
     * Defaults to `packageJSON.productName`.
     *
     * @since v1.0.0
     */
    productName?: string,
    /**
     * Generic name of the application used in `.desktop` file.
     *
     * @since v1.0.0
     */
    genericName?: string,
    /**
     * Path to icon to use for the AppImage.
     *
     * @since v1.0.0
     */
    icon?: string,
    /**
     * List of desktop file categories to append.
     *
     * @since v1.0.0
     */
    categories?: (
        FreeDesktopCategories["main"] | FreeDesktopCategories["additional"]
    )[],
    /**
     * Actions to be used within a generated desktop file.
     *
     * @since v2.1.0
     */
    actions?: Record<string, Partial<Record<string,string|null>> & {
        /** Action's user-friendly name */
        Name: string,
        /** A path to action icon */
        Icon?: string|null,
        /** A command to execute on a desktop file action */
        Exec?: string|null
    }>
    /**
     * Path to desktop file to be used instead of generating a new one.
     *
     * @since v2.1.0
     */
    desktopFile?: string,
    /**
     * Whenever calculate and embed MD5 digest in the runtime.
     *
     * Currently functions as a placeholder for future API – **NO-OP**.
     *
     * @internal
     * @experimental
     */
    digestMd5?: boolean,
    /**
     * Use given compressor for SquashFS filesystem.
     *
     * Defaults to `mksquashfs` binary defaults (usually `gzip`).
     *
     * @since v2.1.0
     */
    compressor?: "xz"|"gzip"|"lz4"|"lzo"|"zstd"|"lzma"
    /**
     * GitHub Release of `AppImage/AppImageKit` from which this maker should
     * get the runtime and AppRun executable.
     *
     * Defaults to `13`.
     *
     * @since v1.1.0
     */
    AppImageKitRelease?: number | `${number}` | "continuous",
    /**
     * Whenever to emulate support for Arch Linux `{name}-flags.conf` file,
     * which contains additional flags prepended to ARGV when executing
     * Electron binary by the shell script. This should be compatible with the
     * file format described in [this Arch Wiki section][wiki].
     *
     * [wiki]: https://wiki.archlinux.org/index.php?title=Chromium&oldid=776126#Making_flags_persistent
     */
    flagsFile?: boolean,
    /**
     * Whenever to use the new experimental statically-linked runtime executable.
     * This implies {@linkcode AppImageKitRelease} is set to `"continuous"`.
     *
     * **This option is highly experimental and might break after changes in
     * `AppImage/type2-runtime` repo will be deleted or merged to
     * `AppImage/AppImageKit`!**
     *
     * Default is `false`.
     *
     * @experimental
     */
    type2runtime?: boolean
}

export interface MakerAppImageConfig {
    /**
     * AppImage maker configuration options.
     *
     * @since v1.0.0
     */
    options?: MakerAppImageConfigOptions
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
 export interface FreeDesktopCategories {
    /** Categories that every desktop confirming environment **must** support. */
    main: (
        "AudioVideo" | "Audio" | "Video" | "Development" | "Education" |
        "Game" | "Graphics" | "Network" | "Office" | "Science" | "Settings" |
        "System" | "Utility"
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

export default MakerAppImageConfig;