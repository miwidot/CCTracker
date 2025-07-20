# GitHub Actions Workflows

This repository includes a streamlined GitHub Actions workflow for automated releasing of CCTracker.

## 🔄 Workflow Overview

### Release Workflow (`release.yml`)
**Triggers:**
- Push tags matching `v*` pattern (e.g., `v1.0.0`, `v1.0.1-beta`)

**Features:**
- ✅ Multi-platform builds (macOS DMG/ZIP, Linux DEB/TAR.GZ)
- ✅ Automated GitHub release creation
- ✅ Code signing support for macOS
- ✅ Automatic changelog generation
- ✅ Production-ready artifact generation

## 🚀 How to Create a Release

1. **Update version in package.json:**
   ```bash
   npm version patch  # or minor/major
   ```

2. **Create and push a tag:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **Workflow automatically:**
   - Builds for all platforms
   - Creates GitHub release
   - Uploads artifacts
   - Generates changelog

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

### Required Secrets (Optional)
For macOS code signing and notarization:
- `APPLE_ID`: Apple Developer ID
- `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password
- `APPLE_TEAM_ID`: Developer Team ID
- `CSC_LINK`: Base64 encoded certificate
- `CSC_KEY_PASSWORD`: Certificate password

### Package.json Scripts
The workflow uses these npm scripts:
```json
{
  "scripts": {
    "build": "npm run build:main && npm run build:renderer",
    "package:mac:dmg": "electron-builder --mac dmg",
    "package:mac:zip": "electron-builder --mac zip",
    "package:linux:deb": "electron-builder --linux deb",
    "package:linux:tar": "electron-builder --linux tar.gz"
  }
}
```

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

## 📊 Release Process

1. **Tag Detection:** Workflow triggers on version tags
2. **Version Extraction:** Gets version from tag (removes 'v' prefix)
3. **Parallel Builds:** Builds all platforms simultaneously
4. **Release Creation:** Creates GitHub release with:
   - Auto-generated changelog
   - All platform artifacts
   - Version-specific release notes

## 🚨 Troubleshooting

### Common Issues
1. **Tag format:** Must start with 'v' (e.g., v1.0.0)
2. **Version mismatch:** Ensure package.json version matches tag
3. **Build failures:** Check build logs for dependency issues
4. **Signing errors:** Verify Apple Developer credentials

### Version Guidelines
- **Production:** `v1.0.0`
- **Beta:** `v1.0.0-beta.1`
- **RC:** `v1.0.0-rc.1`

## 📝 Notes

- **No PR/commit builds:** Only releases on tags to save build minutes
- **Artifact retention:** Release artifacts are permanent
- **Changelog:** Generated from commit messages between tags
- **Platform support:** macOS and Linux (Windows can be added if needed)