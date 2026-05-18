# SideQuest Android APK Install

This folder contains the Android APK for installing SideQuest directly on an Android phone.

## APK

```text
sidequest-preview.apk
```

## Install Directly On Your Phone

1. Download or copy `sidequest-preview.apk` to your Android phone.
2. Open the APK from the phone's Files app or Downloads folder.
3. If Android blocks the install, tap `Settings` and allow installs from that app, such as Chrome, Drive, or Files.
4. Return to the APK and tap `Install`.
5. Open `SideQuest` after installation finishes.

## Install With ADB

Use this if your phone is connected to your computer with USB debugging enabled.

```bash
adb devices
adb install -r sidequest-preview.apk
```

If `adb devices` does not show your phone:

1. Enable Developer Options on Android by tapping `Build number` 7 times in `Settings` -> `About phone` -> `Software information`.
2. Turn on `USB debugging` in `Settings` -> `Developer options`.
3. Unplug and reconnect the phone.
4. Accept the `Allow USB debugging?` prompt on the phone.
5. Run `adb devices` again.

## Updating The App

To replace an older installed copy, install the APK again:

```bash
adb install -r sidequest-preview.apk
```

If Android refuses to update because of a signing mismatch, uninstall the old app first:

```bash
adb uninstall com.armanmohiuddin.sidequest
adb install sidequest-preview.apk
```

Uninstalling removes the app's local data from the device.
