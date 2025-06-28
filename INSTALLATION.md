# CCTracker Installation Guide

## macOS Installation

Due to Apple's security requirements, you may see a "damaged" error when opening CCTracker. This is normal for apps not signed with an Apple Developer certificate.

### Method 1: Right-click Installation
1. Download the latest release from GitHub
2. Extract the ZIP file
3. **Right-click** on CCTracker.app → **Open**
4. Click **Open** when prompted about unidentified developer

### Method 2: Command Line Fix
1. Download and extract the app
2. Open Terminal
3. Run: `xattr -dr com.apple.quarantine /path/to/CCTracker.app`
4. Double-click to open normally

### Method 3: System Preferences
1. Go to **System Preferences** → **Security & Privacy**
2. Click **Open Anyway** if the app appears there after first attempt

## Windows Installation
- Download the `.exe` installer
- Windows may show SmartScreen warning - click **More Info** → **Run Anyway**

## Linux Installation
- Download `.AppImage` for portable use
- Download `.deb` for Ubuntu/Debian
- Download `.rpm` for Red Hat/Fedora

## Troubleshooting

If you continue to have issues:
1. Make sure you downloaded from the official GitHub releases
2. Verify the file isn't corrupted during download
3. Check your antivirus isn't blocking the app

For support, please open an issue on GitHub.