import { Notice } from 'obsidian';
import VoiceNotesPlugin from '../main';

export function registerDeleteRemoteNoteCommand(plugin: VoiceNotesPlugin) {
  plugin.addCommand({
    id: 'delete-remote-voicenote',
    name: 'Delete Remote Voicenote',
    callback: async () => {
      if (!plugin.settings.token) {
        new Notice('No access available, please login in plugin settings');
        return;
      }
      const activeFile = plugin.app.workspace.getActiveFile();
      if (activeFile) {
        const cache = plugin.app.metadataCache.getFileCache(activeFile);

        if (cache && cache.frontmatter) {
          const frontmatter = cache.frontmatter;

          const confirmDelete = confirm(`Are you sure you want to delete this note from Voicenotes?`);
          if (confirmDelete) {
            try {
              await plugin.vnApi.deleteRecording(frontmatter.recording_id);

              // Successfully deleted, now remove recording_id from frontmatter using Obsidian API
              await plugin.app.fileManager.processFrontMatter(activeFile, (fm) => {
                delete fm.recording_id;
              });

              new Notice('Recording deleted successfully and recording_id removed from note');
            } catch (error) {
              new Notice('Failed to delete recording from remote');
              console.error('Error deleting recording:', error);
            }
          }
        }
      }
    },
  });
}
