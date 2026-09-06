// SPDX-FileCopyrightText: 2025-2026 Dawid Papiewski "SpacingBat3" <spacingbat3@gmail.com>
//
// SPDX-License-Identifier: ISC

import { OptionDefaults } from "typedoc"
/** @type {import("typedoc").TypeDocOptions}*/
export default {
  entryPoints: ["../src/main.ts"],
  blockTags: ["@platform", ...OptionDefaults.blockTags]
}