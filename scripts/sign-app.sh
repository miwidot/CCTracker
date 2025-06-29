#!/bin/bash

# Post-build script to apply ad-hoc signing to macOS app
# This helps reduce "damaged" errors without requiring Apple Developer certificates

set -e

APP_PATH="dist/mac/CCTracker.app"

if [ -d "$APP_PATH" ]; then
    echo "Applying ad-hoc signature to $APP_PATH"
    
    # Apply ad-hoc signing (development only)
    codesign --force --deep --sign - "$APP_PATH"
    
    echo "Ad-hoc signing completed"
    
    # Verify signature
    codesign -dv --verbose=4 "$APP_PATH"
else
    echo "App bundle not found at $APP_PATH"
    exit 1
fi