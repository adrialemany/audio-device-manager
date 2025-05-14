# GNOME Shell Audio Device Chooser Extension

## What it does

Adds a convenient indicator to your GNOME Shell panel that displays the currently active input (microphone) and output (speaker/headphones) audio devices. Clicking the indicator opens a menu allowing you to quickly switch between available audio devices. It intelligently simplifies device names in the panel (e.g., showing "Headphones" if your headphones are active on the built-in sound card, even if the full device name is more complex).

## Requirements

To activate this extension, you must have the **Extension** and **Extension Manager** apps installed on your Linux system. You can find them in your distribution's Software app. This extension also relies on `pactl` (PulseAudio Volume Control utility) to be installed and functioning on your system to list and control audio devices.

## Installation

1.  **Download:** Download the latest release of this extension (or clone the repository).
2.  **Identify UUID:** Check the `uuid` field in the `metadata.json` file within the extension's folder. Let's assume it's `audio-device-chooser@yourusername.org`.
3.  **Copy to Extensions Folder:** Copy the entire extension folder into your local GNOME Shell extensions directory, renaming the folder to match the UUID:

    ```bash
    # Example: if you downloaded it to ~/Downloads/audio-chooser-extension-main
    # and the UUID is audio-device-chooser@yourusername.org
    cp -r ~/Downloads/audio-chooser-extension-main ~/.local/share/gnome-shell/extensions/audio-device-chooser@yourusername.org
    ```

4.  **Restart GNOME Shell or Relogin:**
    * For X11 sessions: Press `Alt` + `F2`, type `r`, and press `Enter`.
    * For Wayland sessions (or if the above doesn't work): Log out of your user session and log back in.
5.  **Activate:** Open the **Extensions** app (or Extension Manager app) and activate the "Audio Device Chooser" extension.

### In Extensions App
## Compatibility

✅ Tested on:
* Ubuntu 22.04 LTS (GNOME Shell 42.9)

⚠️ Compatibility with other distributions or GNOME Shell versions is not guaranteed but is likely if PulseAudio and `pactl` are standard. Please report any issues.

## Preview

### Panel Indicator
Shows a simplified view of your current microphone and speaker/headphone.

![Panel Indicator Preview](https://drive.google.com/uc?export=view&id=1136tx_84C7H67j7gh7hJ1J8dNeQYeda2)

### Device Selection Menu
Allows quick switching between all detected input and output audio devices.
![Device Menu Preview](https://drive.google.com/uc?export=view&id=1BlqpzyHx11JoFJLvCSqx2nRxXxMpV1V_)

