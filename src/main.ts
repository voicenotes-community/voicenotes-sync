import { App, DataAdapter, normalizePath, Notice, Plugin, PluginManifest, TFile } from 'obsidian';
import VoiceNotesApi from './api/voicenotes';
import { VoiceNote, VoiceNoteAttachment, VoiceNotesPluginSettings } from './types';
import { VoiceNotesSettingTab } from './settings';
// @ts-expect-error - jinja-js has no TypeScript declarations.
import * as jinja from 'jinja-js';
import { AppConfig } from './config/app';
import { registerCommands } from './commands';
import { AttachmentType } from './enums';
import { RecordingUtility } from './utilities';
import { DateTimeHelper, FileHelper } from './helpers';

export default class VoiceNotesPlugin extends Plugin {
  settings: VoiceNotesPluginSettings;
  vnApi: VoiceNotesApi;
  fs: DataAdapter;
  syncedRecording: Pick<VoiceNote, 'recording_id' | 'updated_at'>[] = [];
  deletedLocalRecordings: Pick<VoiceNote, 'recording_id' | 'updated_at'>[] = [];
  syncIntervalId: NodeJS.Timeout | null = null;
  recordingUtility: RecordingUtility;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    this.fs = app.vault.adapter;
    this.recordingUtility = new RecordingUtility(this);
  }

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new VoiceNotesSettingTab(this.app, this));

    if (this.settings.token) {
      this.setupAutoSync();
    }

    registerCommands(this);

    this.registerEvent(
      this.app.metadataCache.on('deleted', async (deletedFile, prevCache) => {
        if (prevCache.frontmatter?.recording_id) {
          this.syncedRecording = this.syncedRecording.filter(
            (r) => r.recording_id !== prevCache.frontmatter?.recording_id
          );

          this.deletedLocalRecordings.push({
            recording_id: prevCache.frontmatter?.recording_id,
            updated_at: prevCache.frontmatter?.updated_at,
          });

          this.settings.lastSyncedNoteUpdatedAt = this.syncedRecording.length > 0
            ? RecordingUtility.getLatestNote(this.syncedRecording)?.updated_at
            : null;
          await this.saveSettings();
        }
      })
    );

    // Timeout to give the app time to load
    setTimeout(async () => {
      await this.sync();
    }, 1000);
  }

  onunload() {
    this.syncedRecording = [];
    this.deletedLocalRecordings = [];
    this.settings.lastSyncedNoteUpdatedAt = null;
    this.clearAutoSync();
  }

  async loadSettings() {
    this.settings = Object.assign({}, AppConfig.DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.setupAutoSync();
  }

  setupAutoSync() {
    this.clearAutoSync();
    if (this.settings.automaticSync) {
      this.syncIntervalId = setInterval(
        () => {
          this.sync();
        },
        this.settings.syncTimeout * 60 * 1000
      );
    }
  }

  clearAutoSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  /**
   * Return the recordings that we've already synced
   */
  async getSyncedRecordings(): Promise<Pick<VoiceNote, 'recording_id' | 'updated_at'>[]> {
    const { vault } = this.app;

    const markdownFiles = vault.getMarkdownFiles().filter((file) => file.path.startsWith(this.settings.syncDirectory));

    const recordings = await Promise.all(
      markdownFiles.map(async (file) => {
        const cache = this.app.metadataCache.getFileCache(file);
        const recording_id = cache?.frontmatter?.['recording_id'];
        const updated_at = cache?.frontmatter?.['updated_at'];
        if (recording_id) {
          return { recording_id, updated_at };
        }
        return null;
      })
    );

    return recordings.filter((r): r is Pick<VoiceNote, 'recording_id' | 'updated_at'> => r !== null);
  }

  async processNote(
    recording: VoiceNote,
    voiceNotesDir: string,
    isSubnote: boolean = false,
    parentTitle: string = '',
    unsyncedCount: { count: number }
  ): Promise<void> {
    try {
      if (!recording.title) {
        new Notice(`Unable to grab voice recording with id: ${recording.id}`);
        return;
      }

      const title = this.recordingUtility.sanitizedTitle(recording.title, recording.created_at);
      const recordingPath = normalizePath(`${voiceNotesDir}/${title}.md`);

      // Process sub-notes, whether the note already exists or not
      if (recording.subnotes && recording.subnotes.length > 0) {
        for (const subnote of recording.subnotes) {
          await this.processNote(subnote, voiceNotesDir, true, title, unsyncedCount);
        }
      }

      // Check if the recording contains any excluded tags
      if (
        recording.tags &&
        recording.tags.some((tag: { name: string }) => this.settings.excludeTags.includes(tag.name))
      ) {
        unsyncedCount.count++;
        return;
      }

      // Check if the note already exists
      const noteExists = await this.app.vault.adapter.exists(recordingPath);

      // If the note doesn't exist, or if it's a sub-note, it's treated as follows
      if (!noteExists || isSubnote) {
        // Prepare data for the template
        const creationTypes = ['summary', 'points', 'tidy', 'todo', 'tweet', 'blog', 'email', 'custom'];
        const creations = Object.fromEntries(
          creationTypes.map((type) => [
            type,
            recording.creations.find((creation: { type: string }) => creation.type === type),
          ])
        );

        const { transcript } = recording;

        // Destructure creations object to get individual variables if needed
        const { summary, points, tidy, todo, tweet, blog, email, custom } = creations;

        let embeddedAudioLink = '';
        let audioFilename = '';
        if (this.settings.downloadAudio) {
          const audioPath = normalizePath(`${voiceNotesDir}/audio`);
          if (!(await this.app.vault.adapter.exists(audioPath))) {
            await this.app.vault.createFolder(audioPath);
          }
          const outputLocationPath = normalizePath(`${audioPath}/${recording.recording_id}.mp3`);
          if (!(await this.app.vault.adapter.exists(outputLocationPath))) {
            const signedUrl = await this.vnApi.getSignedUrl(recording.recording_id);
            await this.vnApi.downloadFile(this.fs, signedUrl.url, outputLocationPath);
          }
          embeddedAudioLink = `![[${recording.recording_id}.mp3]]`;
          audioFilename = `${recording.recording_id}.mp3`;
        }

        // Handle attachments
        let attachments = '';
        if (recording.attachments && recording.attachments.length > 0) {
          const attachmentsPath = normalizePath(`${voiceNotesDir}/attachments`);
          if (!(await this.app.vault.adapter.exists(attachmentsPath))) {
            await this.app.vault.createFolder(attachmentsPath);
          }
          attachments = (
            await Promise.all(
              recording.attachments.map(async (data: VoiceNoteAttachment) => {
                if (data.type === AttachmentType.LINK) {
                  return `- ${data.description}`;
                } else if (data.type === AttachmentType.IMAGE) {
                  const filename = FileHelper.getFilenameFromUrl(data.url);
                  const attachmentPath = normalizePath(`${attachmentsPath}/${filename}`);
                  await this.vnApi.downloadFile(this.fs, data.url, attachmentPath);
                  return `- ![[${filename}]]`;
                }
                return ''; // Return empty string for unknown attachment types
              })
            )
          ).join('\n');
        }

        // Prepare context for Jinja template
        const formattedPoints = points ? points.content.data.map((data: string) => `- ${data}`).join('\n') : null;
        const formattedTodos = todo
          ? todo.content.data
              .map((data: string) => `- [ ] ${data}${this.settings.todoTag ? ' #' + this.settings.todoTag : ''}`)
              .join('\n')
          : null;
        // Raw tag/topic names from Voicenotes (no #, no formatting)
        const tagNames =
          recording.tags && recording.tags.length > 0
            ? recording.tags
                .map((tag: { name: string }) => (typeof tag.name === 'string' ? tag.name.trim() : ''))
                .filter((name: string) => name.length > 0)
            : null;
        // Format tags, replacing spaces with hyphens for multi-word tags
        const formattedTags =
          tagNames && tagNames.length > 0 ? tagNames.map((name: string) => `#${name.replace(/\s+/g, '-')}`).join(' ') : null;
        const context = {
          recording_id: recording.recording_id,
          title: recording.title,
          date: DateTimeHelper.formatDate(recording.created_at, this.settings.dateFormat),
          duration: DateTimeHelper.formatDuration(recording.duration),
          created_at: DateTimeHelper.formatDate(recording.created_at, this.settings.dateFormat),
          updated_at: DateTimeHelper.formatDate(recording.updated_at, this.settings.dateFormat),
          transcript: transcript,
          embedded_audio_link: embeddedAudioLink,
          audio_filename: audioFilename,
          summary: summary ? summary.markdown_content : null,
          tidy: tidy ? tidy.markdown_content : null,
          points: formattedPoints,
          todo: formattedTodos,
          tweet: tweet ? tweet.markdown_content : null,
          blog: blog ? blog.markdown_content : null,
          email: email ? email.markdown_content : null,
          custom: custom ? custom.markdown_content : null,
          tags: formattedTags,
          tag_names: tagNames,
          topics: tagNames,
          related_notes:
            recording.related_notes && recording.related_notes.length > 0
              ? recording.related_notes
                  .map(
                    (relatedNote) =>
                      `- [[${this.recordingUtility.sanitizedTitle(relatedNote.title, relatedNote.created_at)}]]`
                  )
                  .join('\n')
              : null,
          subnotes:
            recording.subnotes && recording.subnotes.length > 0
              ? recording.subnotes
                  .map((subnote) => `- [[${this.recordingUtility.sanitizedTitle(subnote.title, subnote.created_at)}]]`)
                  .join('\n')
              : null,
          attachments: attachments,
          parent_note: isSubnote ? `[[${parentTitle}]]` : null,
        };

        // Render the template using Jinja
        let note = jinja.render(this.settings.noteTemplate, context).replace(/\n{3,}/g, '\n\n');
        note = FileHelper.convertHtmlToMarkdown(note);

        // Recording ID is required so we force it
        const recordingIdTemplate = `recording_id: {{recording_id}}\n`;
        const renderedFrontmatter = jinja
          .render(recordingIdTemplate + this.settings.frontmatterTemplate, context)
          .replace(/\n{3,}/g, '\n\n');

        const metadata = `---\n${renderedFrontmatter}\n---\n`;

        note = metadata + note;

        // Create or update note
        if (noteExists) {
          await this.app.vault.modify(this.app.vault.getFileByPath(recordingPath) as TFile, note);
        } else {
          await this.app.vault.create(recordingPath, note);
        }

        // Track synced recording
        const existingIndex = this.syncedRecording.findIndex((r) => r.recording_id === recording.recording_id);
        if (existingIndex !== -1) {
          this.syncedRecording[existingIndex].updated_at = recording.updated_at;
        } else {
          this.syncedRecording.push({
            recording_id: recording.recording_id,
            updated_at: recording.updated_at,
          });
        }

        if (this.settings.deleteSynced && this.settings.reallyDeleteSynced) {
          await this.vnApi.deleteRecording(recording.recording_id);
        }
      }
    } catch (error) {
      console.error(error);
      if (Object.prototype.hasOwnProperty.call(error, 'status')) {
        console.error(error.status);
        if (Object.prototype.hasOwnProperty.call(error, 'text')) {
          console.error(error.text);
        }
        if (Object.prototype.hasOwnProperty.call(error, 'json')) {
          console.error(error.json);
        }
        if (Object.prototype.hasOwnProperty.call(error, 'headers')) {
          console.error(error.headers);
        }

        // Only clear token if it's an authentication error (401)
        if (error.status === 401) {
          this.settings.token = undefined;
          await this.saveSettings();
          new Notice(`Login token was invalid, please try logging in again.`);
        } else {
          new Notice(`Error occurred syncing some notes to this vault.`);
        }
      } else {
        new Notice(`Error occurred syncing some notes to this vault.`);
      }
    }
  }

  async sync() {
    try {
      this.syncedRecording = await this.getSyncedRecordings();

      this.vnApi = new VoiceNotesApi({
        token: this.settings.token,
        lastSyncedNoteUpdatedAt: this.settings.lastSyncedNoteUpdatedAt,
      });

      const voiceNotesDir = normalizePath(this.settings.syncDirectory);
      if (!(await this.app.vault.adapter.exists(voiceNotesDir))) {
        new Notice('Creating sync directory for Voice Notes Sync plugin');
        await this.app.vault.createFolder(voiceNotesDir);
      }

      const recordings = await this.vnApi.getRecordings();
      // This only happens if we aren't actually logged in, fail immediately.
      if (recordings === null) {
        this.settings.token = undefined;
        return;
      }
      const unsyncedCount = { count: 0 };

      if (recordings.links.next) {
        let nextPage = recordings.links.next;

        do {
          const moreRecordings = await this.vnApi.getRecordingsFromLink(nextPage);
          recordings.data.push(...moreRecordings.data);
          nextPage = moreRecordings.links.next;
        } while (nextPage);
      }

      if (recordings?.data?.length > 0) {
        for (const recording of recordings.data) {
          await this.processNote(recording, voiceNotesDir, false, '', unsyncedCount);
        }

        console.log(`Synced ${recordings.data.length} recordings from Voice Notes.`);

        const maxTs = RecordingUtility.getLatestNote(recordings.data)?.updated_at;
        if (maxTs) {
          this.settings.lastSyncedNoteUpdatedAt = new Date(maxTs).toISOString();
        }

        await this.saveSettings();
      }

      new Notice(
        `Voicenotes Sync complete. ${unsyncedCount.count ? unsyncedCount.count + ' recordings were not synced due to excluded tags.' : ''} `
      );
    } catch (error) {
      console.error(error);
      if (Object.prototype.hasOwnProperty.call(error, 'status')) {
        // Only clear token if it's an authentication error (401)
        if (error.status === 401) {
          this.settings.token = undefined;
          await this.saveSettings();
          new Notice(`Login token was invalid, please try logging in again.`);
        } else {
          new Notice(`Error occurred syncing some notes to this vault.`);
        }
      } else {
        new Notice(`Error occurred syncing some notes to this vault.`);
      }
    }
  }
}
