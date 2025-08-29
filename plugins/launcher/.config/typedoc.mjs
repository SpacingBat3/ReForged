
import { OptionDefaults } from "typedoc"
/** @type {import("typedoc").TypeDocOptions}*/
export default {
  entryPoints: ["../src/main.ts"],
  blockTags: ["@platform", ...OptionDefaults.blockTags]
}