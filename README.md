## Voicenotes Sync
ANNOUNCEMENT: I am excited to announce that the Voicenotes Sync plugin will be folded into the official Voicenotes Community organization. We'll have some exciting updates and improvements that we'll be working on together with the Voicenotes core team (hint: including a long awaited fix for the logout issues many of you have experienced).

This plugin offers the ability to sync down your thoughts and ideas from Voicenotes web & mobile apps.

Through the plugin settings you can customize the sync directory and frequency, download the audio file used in the transcript and any AI generated summaries or actions become sections in the note text.

### Features
- Automatically sync data based on configurable minutes from VoiceNotes
  - Includes any AI generated summaries or actions
  - Includes TODOs which are turned into markdown todos (can append a tag to every TODO as well)
- Customize the sync directory and frequency
- Downloads the audio file (default is off)
- Prepend the date to the title / filename
- Optional mode to delete synced notes from the Voicenotes server
  - Destructive action which requires double opt-in toggles

### Template variables
The note and frontmatter templates support Jinja-style variables and conditionals.

Available variables:
`recording_id`, `title`, `date`, `duration`, `created_at`, `updated_at`, `tags`, `tag_names`, `topics`, `transcript`,
`embedded_audio_link`, `audio_filename`, `summary`, `tidy`, `points`, `todo`, `email`, `tweet`, `blog`, `custom`,
`parent_note`, `related_notes`, `subnotes`, `attachments`.

Notes:
- `tags` is a space-delimited string of Obsidian-style hashtags (spaces replaced by `-`).
- `tag_names` and `topics` are raw arrays of tag/topic names from Voicenotes (no `#`, no formatting). Use these when you
  want frontmatter lists instead of Obsidian tags.

Example: frontmatter template to store topics as a YAML list
```jinja2
{% if topics %}
voicenotes_topics:
{% for sujet in topics %}
  - "{{ sujet }}"
{% endfor %}
{% endif %}
```

### Installation
The VoiceNotes Sync Plugin is available in the Obsidian Community Plugins area.

1. Turn off restricted mode if it's on
2. Click 'Browse' under Community pllugins and search for "Voicenotes"
3. Install and enable the plugin

### Connect your account
Steps to find the access token.

1. Log into your account in voicenotes.com in a browser.
2. Go to Profile > Integrations & Automations > [Obsidian](https://voicenotes.com/app#settings)
3. Copy the token
4. Paste it in Obsidian > Settings > Voicenotes sync and tap on Connect

## Credits & Acknowledgments
This project was originally conceived, created, and maintained by [Andrew Lombardi](https://mysticcoders.com). We are grateful to Andrew for his work in building the foundations of this tool and for his generosity in transferring the project to the official Voicenotes team to ensure its continued growth.
