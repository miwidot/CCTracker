# GitHub Actions Workflows

This repository includes comprehensive GitHub Actions workflows for automated building, testing, and releasing of CCTracker.

## 🔄 Workflows Overview

### 1. Build & Release (`build.yml`)
**Triggers:**
- Push to `main` branch (build only)
- Pull requests to `main` (build only)
- Scheduled nightly builds (2:00 AM UTC, main branch only)
- Manual dispatch with configurable options

**Features:**
- ✅ Multi-platform builds (macOS x64/ARM64, Linux x64)
- ✅ Automated testing and quality checks
- ✅ Nightly releases with automatic cleanup (keeps latest 7)
- ✅ Manual release triggers with version control
- ✅ Uses package.json version as base

### 2. Manual Build & Package (`manual-build.yml`)
**Purpose:** On-demand building with full control over targets and release options

**Triggers:**
- Manual dispatch only

**Options:**
- **Build Target:** Choose specific platforms or build all
- **Version Suffix:** Add custom suffix to version
- **Create Release:** Optionally create GitHub release
- **Draft Release:** Create as draft for review

## 🚀 How to Use

### Automatic Builds
1. **Push to main:** Automatic build without release
2. **Nightly:** Automatic build and release every night at 2:00 AM UTC
3. **Pull Request:** Build validation on PRs

### Manual Builds
1. Go to **Actions** tab in GitHub
2. Select **Build & Release** or **Manual Build & Package**
3. Click **Run workflow**
4. Configure options:
   - Release type (nightly, manual, patch, minor, major)
   - Build targets (all, mac-only, linux-only)
   - Version settings
   - Release preferences

### Release Types

#### Automatic Nightly (main branch only)
```
Version: 1.0.0-nightly.20240615
Trigger: Schedule (2:00 AM UTC)
Platforms: macOS (x64, ARM64), Linux (x64)
Release: Yes (prerelease)
Cleanup: Keeps latest 7 nightly releases
```

#### Manual Release
```
Version: 1.0.0-manual.202406151430
Trigger: Manual dispatch
Platforms: Configurable
Release: Optional
```

#### Semantic Release
```
Version: 1.0.0 (from package.json)
Trigger: Manual dispatch with patch/minor/major
Platforms: Configurable
Release: Yes (full release)
```

## 📦 Build Artifacts

Each successful build produces:

### macOS
- **DMG files:** `CCTracker-mac-{arch}.dmg`
- **ZIP archives:** `CCTracker-mac-{arch}.zip`
- **Architectures:** x64 (Intel), arm64 (Apple Silicon)

### Linux
- **AppImage:** `CCTracker-linux-x64.AppImage` (portable)
- **DEB packages:** `CCTracker-linux-x64.deb` (Debian/Ubuntu)
- **RPM packages:** `CCTracker-linux-x64.rpm` (RedHat/Fedora)
- **TAR.GZ archives:** `CCTracker-linux-x64.tar.gz`
- **Architecture:** x64 (Intel/AMD)

## 🔧 Configuration

### Package.json Scripts
The workflows use these npm scripts from package.json:
```json
{
  "scripts": {
    "build": "npm run build:main && npm run build:renderer",
    "package:mac:x64": "electron-builder --mac --x64",
    "package:mac:arm64": "electron-builder --mac --arm64", 
    "package:linux:x64": "electron-builder --linux --x64",
    "package:linux:arm64": "electron-builder --linux --arm64",
    "test": "jest",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "type-check": "tsc --noEmit"
  }
}
```

### Environment Variables
Required for full functionality:
- `GITHUB_TOKEN`: Automatically provided
- `APPLE_ID`: For macOS code signing (optional)
- `APPLE_APP_SPECIFIC_PASSWORD`: For notarization (optional)
- `APPLE_TEAM_ID`: Apple Developer Team ID (optional)

### Electron Builder Configuration
The `build` section in package.json defines:
- Output directories
- Platform-specific settings
- Code signing configuration
- Package formats and targets

## 🔒 Security & Code Signing

### macOS
- **Hardened Runtime:** Enabled for security
- **Entitlements:** Configured for necessary permissions
- **Notarization:** Disabled by default (can be enabled with Apple credentials)
- **Gatekeeper:** Assessment disabled for development builds

### Linux
- **No code signing required**
- **AppImage:** Self-contained portable format
- **Package formats:** Standard DEB/RPM with dependencies

## 📊 Workflow Status

### Quality Checks
Each build includes:
- ✅ TypeScript compilation (`tsc --noEmit`)
- ✅ Unit tests (`npm test`)
- ✅ Code linting (`npm run lint`)
- ✅ Dependency installation
- ✅ Application build process

### Build Matrix
Parallel builds for efficiency:
- **macOS:** Intel (x64) + Apple Silicon (arm64)
- **Linux:** Intel/AMD (x64)

## 🗂️ File Structure
```
.github/workflows/
├── build.yml           # Main build & release workflow
├── manual-build.yml    # Manual build workflow  
└── README.md          # This documentation

build/
└── entitlements.mac.plist  # macOS entitlements

package.json           # Build scripts and electron-builder config
```

## 🚨 Troubleshooting

### Common Issues
1. **Build fails on dependencies:** Ensure all devDependencies are properly listed
2. **macOS signing errors:** Check Apple Developer credentials in secrets
3. **Linux missing libraries:** Workflow installs required system dependencies
4. **Version conflicts:** Manual builds append timestamps to avoid conflicts

### Debug Information
Workflows provide detailed logs including:
- Build configuration
- Version information  
- Quality check results
- Artifact locations
- Release URLs (when created)

## 📝 Notes

- **Nightly builds:** Only run on main branch to prevent spam
- **Artifact retention:** 30 days for regular builds, 90 days for manual builds
- **Release cleanup:** Automatically removes old nightly releases (keeps 7)
- **Version control:** Uses package.json version as base, appends suffixes for builds
- **Platform support:** Currently Mac and Linux only (Windows can be added if needed)