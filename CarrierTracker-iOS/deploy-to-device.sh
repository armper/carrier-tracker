#!/bin/bash

echo "📱 CarrierTracker iOS - Device Deployment Script"
echo "==============================================="

# Check for connected devices
echo "1️⃣ Checking for connected devices..."
DEVICES=$(xcrun devicectl list devices 2>/dev/null | grep -v "No devices found")

if [ -z "$DEVICES" ]; then
    echo "❌ No iPhone connected!"
    echo "Please connect your iPhone and trust this computer."
    echo ""
    echo "Steps:"
    echo "1. Connect iPhone via USB"
    echo "2. Trust computer on iPhone"
    echo "3. Enable Developer Mode in Settings"
    exit 1
fi

echo "✅ Found connected devices:"
echo "$DEVICES"
echo ""

# Get device ID (first connected device)
DEVICE_ID=$(echo "$DEVICES" | head -1 | awk '{print $1}')
echo "📱 Using device: $DEVICE_ID"
echo ""

# Build for device
echo "2️⃣ Building for device..."
if xcodebuild build -scheme CarrierTracker -destination "id=$DEVICE_ID" -configuration Debug; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    echo "Check Xcode for signing/configuration issues."
    exit 1
fi

# Install on device
echo ""
echo "3️⃣ Installing on device..."
APP_PATH="/Users/nikaperea/Library/Developer/Xcode/DerivedData/CarrierTracker-dmwhjycxvevtlbabordaiivvcwkz/Build/Products/Debug-iphoneos/CarrierTracker.app"

if [ -f "$APP_PATH/CarrierTracker" ]; then
    echo "📦 Installing app..."
    if xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"; then
        echo "✅ App installed successfully!"
        echo "📱 Check your iPhone for the CarrierTracker app!"
    else
        echo "❌ Installation failed!"
        echo "Check device trust and signing settings."
    fi
else
    echo "❌ App not found at expected path."
    echo "Build may have failed or path changed."
fi

echo ""
echo "🎉 Deployment complete!"
echo "The CarrierTracker app should now be on your iPhone." 