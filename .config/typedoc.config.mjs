import {footnote} from "@mdit/plugin-footnote"
import {tasklist} from "@mdit/plugin-tasklist";
import typedoc from "typedoc/package.json" with { type: "json" }

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
  customFooterHtml: [
    'Copyright © 2025 Dawid Papiewski "<a href="https://github.com/SpacingBat3">SpacingBat3</a>"',
    [
      'Made with <span title="love">❤️</span> in <a href="https://www.openstreetmap.org/relation/49715" title="Poland">🇵🇱️</a>',
      `with a help of <a href="${typedoc.homepage}">Typedoc</a> <code>v${typedoc.version}</code>`
    ].join(', ')
  ].map(str => `<p align="center">${str}</p>`).join(""),
  /** @param {import("markdown-it").default} parser  */
  markdownItLoader(parser) {
    parser
      .use(footnote)
      .use(tasklist);
  }
}