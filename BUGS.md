In .github/workflows/dependency-update.yml at line 61, the GitHub Action version
for peter-evans/create-pull-request is outdated and unsupported. Update the
version tag from v5 to the latest supported stable version by checking the
official repository or marketplace for the current recommended version and
replace the version string accordingly.

In .github/workflows/ci.yml at line 181, the GitHub action
softprops/action-gh-release is pinned to an outdated version v1. Update the
version to the latest stable release by changing the version tag from v1 to the
most recent version available on the action's repository to ensure compatibility
with newer GitHub runners.

In src/main/services/FileSystemPermissionService.ts at the top (lines 1-6) and
also around lines 88-89 and 162-163, replace all instances of require('os') with
an ES module import statement like "import os from 'os';" at the top of the
file. Then update all usages of the os module accordingly to use the imported
"os" object instead of the require call. This will ensure consistent ES module
style imports throughout the file.

In src/main/services/SettingsService.ts around lines 109 to 113, remove the
unnecessary 'as any' type cast on this.settings.theme in the includes check.
Instead, ensure that this.settings.theme is properly typed or use a type-safe
comparison without casting to maintain TypeScript's type safety.

In src/main/services/BackupService.ts around lines 326 to 344, the current use
of an async callback inside setInterval can cause overlapping backup executions
and unhandled promise rejections. Replace setInterval with a self-scheduling
pattern using setTimeout that waits for the backup operation to complete before
scheduling the next one. Implement a method that performs the backup inside a
try-catch block, logs errors properly, and then calls itself recursively with
setTimeout to ensure sequential execution without overlap.

In src/main/services/BackupService.ts at lines 149, 250, 424, and 438, replace
all uses of the deprecated fs.rmdir method with the recursive option by using
fs.rm instead. Update each call from fs.rmdir(path, { recursive: true }) to
fs.rm(path, { recursive: true, force: true }) to ensure proper removal of
directories without deprecation warnings.

In src/main/services/BackupService.ts at line 91, replace the logical OR
operator (||) with the nullish coalescing operator (??) when assigning the
default value to description. This change ensures that only null or undefined
values trigger the default 'Manual backup', allowing empty strings to be used as
valid descriptions.

In src/main/services/BackupService.ts at lines 1 to 3, the fs module is imported
twice using different syntaxes. Remove the duplicate import by keeping only one
consistent import statement for fs, preferably the one using 'promises as fs' if
asynchronous file operations are needed, and remove the other import to avoid
redundancy.

/Users/runner/work/CCTracker/CCTracker/src/main/services/BackupService.ts
Error:     3:1   error    'fs' import is duplicated                                                                                  no-duplicate-imports
Error:    47:3   error    Type string trivially inferred from a string literal, remove type annotation                               @typescript-eslint/no-inferrable-types
Error:    48:3   error    Type string trivially inferred from a string literal, remove type annotation                               @typescript-eslint/no-inferrable-types
Warning:    91:22  warning  Unexpected nullable string value in conditional. Please handle the nullish/empty cases explicitly          @typescript-eslint/strict-boolean-expressions
Error:    91:42  error    Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator  @typescript-eslint/prefer-nullish-coalescing
Error:   291:27  error    Type number trivially inferred from a number literal, remove type annotation                               @typescript-eslint/no-inferrable-types
Error:   321:20  error    Type number trivially inferred from a number literal, remove type annotation                               @typescript-eslint/no-inferrable-types
Error:   326:43  error    Promise returned in function argument where a void return was expected                                     @typescript-eslint/no-misused-promises
Error:   374:14  error    'error' is defined but never used. Allowed unused caught errors must match /^_/u                           @typescript-eslint/no-unused-vars
Error:   387:14  error    'error' is defined but never used. Allowed unused caught errors must match /^_/u                           @typescript-eslint/no-unused-vars
Error:   400:14  error    'error' is defined but never used. Allowed unused caught errors must match /^_/u                           @typescript-eslint/no-unused-vars

please run local lint so we can fix the build
