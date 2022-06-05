interface MakerAppImageConfigOptions {
    /**
     * Name of the executable, prefferably in lowercase letters. Should not have
     * spaces or any special characters.
     */
    name?: string,
    /** Human-friendly name of the application. */
    productName?: string,
    /** Generic name of the application used in `.desktop` file. */
    genericName?: string,
    /** Path to icon to use for AppImage */
    icon?: string,
    /** List of dekstop file categories to append. */
    categories?: (
        FreeDesktopCategories["main"] | FreeDesktopCategories["additional"]
    )[]
}

/** AppImage maker configuration options */
export interface MakerAppImageConfig {
    options?: MakerAppImageConfigOptions
}

/**
 * FreeDesktop software categories, grouped as in FreeDesktop specification.
 * 
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
    /** Categories that every desktop confirming enviroment **must** support. */
    main: (
        "AudioVideo" | "Audio" | "Video" | "Development" | "Education" |
        "Game" | "Graphics" | "Network" | "Office" | "Science" | "Settings" |
        "System" | "Utility"
    );
    /**
     * Categories that provide more fine grained information about the
     * application
     */
    additional: (
        "Building" | "Debugger" | "IDE" | "GUIDesigner" | "Profiling" |
        "RevisionControl" | "Translation" | "Calendar" | "ContactManagement" |
        "Database" | "Dictionary" | "Chart" | "Email" | "Finance" |
        "FlowChart" | "PDA" | "ProjectManagement" | "Presentation" |
        "Spreadsheet" | "WordProcessor" | "2DGraphics" | "VectorGraphics" |
        "RasterGraphics" | "3DGraphics" | "Scanning" | "OCR" | "Photography" |
        "Publishing" | "Viewer" | "TextTools" | "DesktopSettings" |
        "HardwareSettings" | "Printing" | "PackageManager" | "Dialup" |
        "InstantMessaging" | "Chat" | "IRCClient" | "Feed" | "FileTransfer" |
        "HamRadio" | "News" | "P2P" | "RemoteAccess" | "Telephony" |
        "TelephonyTools" | "VideoConference" | "WebBrowser" | "WebDevelopment" |
        "Midi" | "Mixer" | "Sequencer" | "Tuner" | "TV" | "AudioVideoEditing" |
        "Player" | "Recorder" | "DiscBurning" | "ActionGame" | "AdventureGame" |
        "ArcadeGame" | "BoardGame" | "BlocksGame" | "CardGame" | "KidsGame" |
        "LogicGame" | "RolePlaying" | "Shooter" | "Simulation" | "SportsGame" |
        "StrategyGame" | "Art" | "Construction" | "Music" | "Languages" |
        "ArtificialIntelligence" | "Astronomy" | "Biology" | "Chemistry" |
        "ComputerScience" | "DataVisualization" | "Economy" | "Electricity" |
        "Geography" | "Geology" | "Geoscience" | "History" | "Humanities" |
        "ImageProcessing" | "Literature" | "Maps" | "Math" |
        "NumericalAnalysis" | "MedicalSoftware" | "Physics" | "Robotics" |
        "Spirituality" |"Sports" |"ParallelComputing" | "Amusement" |
        "Archiving" | "Compression" | "Electronics" | "Emulator" |
        "Engineering" | "FileTools" | "FileManager" | "TerminalEmulator" |
        "Filesystem" | "Monitor" | "Security" | "Accessibility" | "Calculator" |
        "Clock" | "TextEditor" | "Documentation" | "Adult" | "Core" | "KDE" |
        "GNOME" | "XFCE" | "GTK" | "Qt" | "Motif" | "Java" | "ConsoleOnly"
    );
}