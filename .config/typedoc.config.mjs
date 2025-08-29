import {footnote} from "@mdit/plugin-footnote"
import {tasklist} from "@mdit/plugin-tasklist";

/** @type {import("typedoc").TypeDocOptions}*/
export default {
  githubPages: true,
  hideGenerator: true,
  entryPointStrategy: "packages",
  entryPoints: [
    "../makers/appimage",
    "../plugins/launcher",
    "../shared/maker-types"
  ],
  commentStyle: "jsdoc",
  visibilityFilters: {},
  lightHighlightTheme: "github-light",
  darkHighlightTheme: "github-dark",
  gitRevision: "master",
  excludeNotDocumented: false,
  excludeInternal: true,
  excludeExternals: false,
  excludePrivate: true,
  readme: "../docs/Readme.md",
  name: "ReForged",
  theme: "default",
  out: "../docs/typedoc",
  /** @param {import("markdown-it").default} parser  */
  markdownItLoader(parser) {
    parser
      .use(footnote)
      .use(tasklist);
  }
}