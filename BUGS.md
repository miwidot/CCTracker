In config/settings.json at line 6, the refresh_interval is set to 1000ms, which
may be too frequent for production and could impact performance. Increase the
refresh_interval value to a higher number, such as 5000ms or more, to reduce the
frequency of file system monitoring and API calls, balancing timely updates with
better system performance.

In src/main/services/__tests__/UsageService.test.ts between lines 62 and 91, the
test directly calls the private method parseJSONLLine using type assertion,
which breaks encapsulation. To fix this, either change parseJSONLLine to be a
public method if it requires direct testing, or remove these direct tests and
instead test the functionality through the public methods that internally use
parseJSONLLine, ensuring encapsulation is maintained.

In src/main/services/__tests__/UsageService.test.ts around lines 11 to 17, the
current test setup lacks teardown logic and has limited coverage. Add an
afterEach block to perform any necessary cleanup or reset after each test.
Expand the test suite by adding tests for other UsageService methods such as
caching, analytics, and cleanup to ensure comprehensive coverage of the
service's functionality.

In src/renderer/hooks/useCurrency.ts between lines 4 and 11, remove the
duplicate definition of the CurrencyRates interface and instead import
CurrencyRates from src/shared/types.ts. This eliminates redundancy and ensures
consistency by using the shared type definition.

In src/renderer/hooks/useCurrency.ts between lines 34 and 49, the convertFromUSD
function does not check if the exchange rate for the target currency exists,
which can cause a NaN result when multiplying. Add a check to verify that the
rate is defined before using it; if undefined, return the original usdAmount or
handle the case gracefully to avoid runtime errors.

In src/renderer/App.tsx at line 76, replace the unsafe type assertion 'page as
CurrentPage' with a validation function that checks if 'page' is a valid
CurrentPage value before calling setCurrentPage. Implement a type guard or
validation logic to ensure only valid pages are accepted, and handle invalid
cases appropriately to prevent runtime errors.

In src/renderer/hooks/useTimeFormat.ts around lines 8 to 13, 29 to 34, and 47 to
52, the date conversion and validation logic is duplicated across three
formatting functions. Extract this common logic into a separate helper function
that takes a date input and returns a valid Date object or handles invalid dates
consistently. Replace the duplicated code in each formatting function by calling
this new helper to adhere to the DRY principle and reduce maintenance overhead.

In src/main/main.ts around lines 99 to 101, the cleanup operation on
'before-quit' event lacks error handling, which may cause the app to hang if
stopping file monitoring fails. Wrap the await call to
this.fileMonitorService.stopMonitoring() in a try-catch block and handle any
errors gracefully, such as logging the error, to ensure the app can quit cleanly
even if the cleanup encounters issues.

In src/main/main.ts between lines 64 and 80, the async service initialization
lacks error handling, which could cause the entire app to crash if any service
fails. Wrap each await call for service initialization and the
fileMonitorService start in individual try-catch blocks to catch and log errors
without stopping the setup process. This ensures that one service failure does
not prevent others from initializing and improves overall robustness.

In src/renderer/styles/globals.css between lines 28 and 47, improve
accessibility for macOS window controls by adding focus styles and ensuring
keyboard navigability. Add visible focus indicators for the window control
elements and ensure that draggable and non-draggable areas are properly labeled
or have appropriate ARIA attributes if applicable. This will help users with
different motor abilities interact with the window controls more easily.

In src/renderer/components/SettingsModal.tsx at line 19, replace the
useState<any> declaration for currencyStatus with a properly defined TypeScript
interface that accurately represents the shape and properties of the currency
status data. Define this interface above or near the component and use it as the
generic type parameter in useState to improve type safety and IntelliSense
support.

In src/main/ipc/ipcHandlers.ts around lines 106 to 108, the code uses unsafe
type casting with 'as any' for currency codes, which bypasses TypeScript's type
safety. To fix this, add validation logic to check that the 'from' and 'to'
currency codes are valid before calling currencyService.convertCurrency. Only
pass the validated and correctly typed currency codes to the service, removing
the 'as any' casts.

In src/main/ipc/ipcHandlers.ts from lines 20 to 87, the IPC handlers lack error
handling, which can cause unhandled promise rejections and crash the main
process. Wrap the async handler functions in try-catch blocks, returning or
throwing the caught error appropriately to ensure errors are propagated back to
the renderer process without crashing the main process. Apply this pattern
consistently to all IPC handlers in this section.

In src/renderer/components/BusinessIntelligenceDashboard.tsx around lines 241 to
251, replace the console.log and console.error calls inside the
exportBusinessReport function with user-visible toast notifications. Use the
existing toast notification system or integrate one if missing, to show success
messages when the report exports successfully and error messages if the export
fails, ensuring users receive clear feedback on the export status.

In src/main/services/FileMonitorService.ts at line 401, replace the CommonJS
require statement for 'os' with an ES6 import at the top of the file. Remove the
line "const os = require('os');" and add "import os from 'os';" among the other
import statements to maintain consistent import style throughout the file.

In src/renderer/components/UsageDashboard.tsx around lines 325-328, 386-388,
436-437, and 568-572, remove all console.log debug statements to clean up
production code. Replace them with a proper logging library if logging is
necessary, ensuring logs have configurable levels and can be disabled in
production. This will keep the component free of verbose debug output.

In src/renderer/components/UsageDashboard.tsx between lines 128 and 143, remove
all console.log statements used for debugging purposes to clean up the
production code. Specifically, delete the console.log calls that output button
clicks and date ranges before calling onDateRangeChange.

In src/renderer/components/SimpleUsageAnalytics.tsx around lines 281 to 284, the
Tooltip formatter function currently uses 'any' types for its parameters, which
goes against the codebase's goal of removing all 'any' types. Replace the 'any'
types with more specific types that accurately represent the expected value and
name parameters, such as string or number for value and string for name, or use
the appropriate type definitions from the Tooltip component's typings to ensure
type safety and clarity.

In src/shared/utils.ts lines 28 to 40, the extractProjectName function
duplicates logic found in src/main/services/UsageService.ts lines 1028 to 1050,
which is more robust and handles additional fallbacks. To fix this, consolidate
the logic by either replacing this function with a call to the UsageService
implementation if it covers all needed cases, or refactor UsageService to use
this simpler function if appropriate. Alternatively, clearly document the
differences between the two methods to avoid confusion and maintain consistency.

In src/renderer/contexts/ThemeContext.tsx around lines 34 to 51, the code uses
repeated type assertions on settings.theme without validation, which can cause
runtime errors if the theme value is invalid. Add a validation step or a type
guard to check if settings.theme is a valid key of COLOR_PALETTES before using
it in type assertions. Refactor the code to safely handle invalid theme values,
possibly by providing a default theme or returning early.

In src/renderer/hooks/useChartTheme.ts around lines 79 to 83, the
getContrastColor function duplicates the logic of determining if the theme is
dark. To fix this, import the isDarkTheme utility from design-tokens and replace
the existing dark theme check with a call to isDarkTheme(theme). This ensures
consistency and avoids code duplication.

In src/renderer/hooks/useChartTheme.ts around lines 88 to 92, the code uses the
deprecated substr method to extract color components from a hex string. Replace
all instances of substr with substring to extract the correct portions of the
string for red, green, and blue values, ensuring the same start and end indices
are used to maintain functionality.

In src/renderer/components/UsageDashboard.tsx at lines 643 and 649, the code
uses unsafe type assertions with 'as any' to access cache token properties,
bypassing TypeScript's type checking. To fix this, update the UsageEntry type
definition in @shared/types to include optional properties
'cache_creation_tokens' and 'cache_read_tokens' as numbers. Then remove the 'as
any' assertions and access these properties directly on the typed objects.

In src/main/services/ExportService.ts around lines 572 to 588, the CSV
formatting has extra spaces inside the join operations which can cause
formatting issues. Remove any spaces inside the join calls for headers and row
arrays to ensure the CSV output is correctly formatted without unintended
spaces.

