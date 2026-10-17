#!/usr/bin/env bash
set -e

# Automatically detect Android SDK location
if [ -z "$ANDROID_HOME" ]; then
  if [ -f "android/local.properties" ]; then
    SDK_DIR=$(grep -E '^sdk\.dir=' android/local.properties | cut -d'=' -f2 | tr -d '\r')
    if [ -n "$SDK_DIR" ]; then
      export ANDROID_HOME="$SDK_DIR"
    fi
  fi
fi

if [ -z "$ANDROID_HOME" ]; then
  if [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
  elif [ -d "/home/$USER/Android/Sdk" ]; then
    export ANDROID_HOME="/home/$USER/Android/Sdk"
  fi
fi

if [ -n "$ANDROID_HOME" ]; then
  export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
fi

echo "============================================="
echo "   Radical Engineering - Android Builder    "
echo "============================================="
echo "Android SDK: ${ANDROID_HOME:-Not Found}"
echo ""

CHOICE=$1

if [ -z "$CHOICE" ]; then
  echo "Select build type:"
  echo "  1) Play Store Bundle (.aab) - Local"
  echo "  2) Test APK (.apk) - Local"
  echo "  3) Play Store Bundle (.aab) - EAS Cloud"
  echo "  4) Exit"
  echo ""
  read -p "Enter choice [1-4]: " CHOICE
fi

case "$CHOICE" in
  1|aab|production)
    echo ""
    echo "▶ Building Play Store Bundle (.aab) locally..."
    eas build --platform android --profile production --local
    ;;
  2|apk|preview)
    echo ""
    echo "▶ Building Installable APK (.apk) locally..."
    eas build --platform android --profile preview --local
    ;;
  3|cloud)
    echo ""
    echo "▶ Building on EAS Cloud..."
    eas build --platform android --profile production
    ;;
  4|q|exit)
    echo "Build canceled."
    exit 0
    ;;
  *)
    echo "Invalid option. Use: 1 (AAB), 2 (APK), or 3 (Cloud)"
    exit 1
    ;;
esac
