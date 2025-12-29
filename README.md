## Voicenotes Sync
ANNOUNCEMENT: I am excited to announce that the Voicenotes Sync plugin will be folded into the official Voicenotes Community organization. We'll have some exciting updates and improvements that we'll be working on together with the Voicenotes core team (hint: including a long awaited fix for the logout issues many of you have experienced).

Plugin offers the ability to sync down your thoughts an ideas from the voicenotes.com online service. The service
uses an API key which the plugin can grab post login (if using email and password or use the Login via Apple, Google,
Twitter (X) instructions below) and we do not save anything but the username in the settings file.

Through the plugin settings one can customize the sync directory and frequency, download the audio file used in the
transcript and any AI generated summaries or actions become sections in the note text.

### Features
- Automatically sync data based on configurable minutes from VoiceNotes.com
  - Includes any AI generated summaries or actions
  - Includes TODOs which are turned into markdown todos (can append a tag to every TODO as well)
- Customize the sync directory and frequency
- Downloads the audio file (default is off)
- Prepend the date to the title / filename
- Optional mode to delete synced notes from the voicenotes.com server
  - Destructive action which requires double opt-in toggles

### Installation
The VoiceNotes.com Sync Plugin is available in the Obsidian Community Plugins area.

1. Turn off restricted mode if it's on
2. Click 'Browse' under Community pllugins and search for "Voicenotes"
3. Install and enable the plugin

### Login via Apple, Google, Twitter (X)
Steps to find the access token.

1. Open up https://voicenotes.com in a web browser
2. After logging in navigate to Profile
3. Click on Integrations & Automations
4. Select Obsidian
5. Copy the generated token

You can also directly access the settings page here:
https://voicenotes.com/app#settings

## Back in Obsidian
1. Enter the token into the "Auth Token" field in the plugin
2. Click Connect

## Credits & Acknowledgments
This project was originally conceived, created, and maintained by [Andrew Lombardi](https://mysticcoders.com). We are grateful to Andrew for his work in building the foundations of this tool and for his generosity in transferring the project to the official Voicenotes team to ensure its continued growth.
