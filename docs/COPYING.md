# Software licenses in ReForged

This document describes the software licenses of ReForged, their
placement (paths in project / filesystem) and guidelines on bundling
software licenses. **It is not a software license by itself**, but it
acts as an additional explanatory document to help understand the
current project structure around bundling software licenses and act
as a guidelines when extending the project. Therefore, it is expected
that **it will also be distributed** with the entire project's source
code.

## 1. *Preferred* software license

The ReForged project is provided under terms of ISC license, distributed
as a file: [**`LICENSES/@reforged/ISC`**](../LICENSES/@reforged/ISC).

For each of subprojects a different software licenses might also apply.
Within a root directory of each subproject, there should be distributed
one or more files containing:

1. any information about the license in one of the metadata files, such
   as `package.json` file (see `license` key) or `Readme.md`;

2. a *link* (either a symlink, hyperlink or any file format that
   includes the information about current software license location) or
   file acting as a software license.

In cases where information about software licenses in `package.json`
is in conflict with the software licenses distributed within the scope
of the subprojects defined by placement of `package.json` files,
only such software licenses are taken into the account.

## 2. License bundling, placement of licenses in filesystem / project

Subprojects of Reforged must provide their own license in order to
distribute it after packaging and publishing them and each
`package.json` file must provide an information about the
[SPDX license identifiers][spdx], include the `UNLICENSED` value for
subprojects distributed without any software license or point to the
file containing a software license using a `license` key, as
standardized for Node.js packages.

Additionally, all of used software licenses should be included in the
`LICENSES` directory and categorised by their scope. For software
licenses used for entire project or between multiple subprojects, a name
`@reforged` should be used both as a scope and a parent directory name.
Each of software licenses file names should include one of the
[SPDX license identifiers][spdx] if such identifier is available.

[spdx]: https://spdx.github.io/spdx-spec/latest/SPDX-license-list/
