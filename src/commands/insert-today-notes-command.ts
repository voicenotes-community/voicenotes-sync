import { Editor, Notice } from 'obsidian';
import VoiceNotesPlugin from '../main';

export function registerInsertTodayNotesCommand(plugin: VoiceNotesPlugin) {
  plugin.addCommand({
    id: 'insert-voicenotes-from-today',
    name: "Insert Today's Voicenotes",
    editorCallback: async (editor: Editor) => {
      if (!plugin.settings.token) {
        new Notice('No access available, please login in plugin settings');
        return;
      }

      const todaysRecordings = await getTodaysSyncedRecordings();

      if (todaysRecordings.length === 0) {
        new Notice('No recordings from today found');
        return;
      }

      const listOfToday = todaysRecordings.map((filename) => `- [[${filename}]]`).join('\n');
      editor.replaceSelection(listOfToday);
    },
  });

  const getTodaysSyncedRecordings = async (): Promise<string[]> => {
    const { vault } = plugin.app;

    const markdownFiles = vault.getMarkdownFiles().filter((file) => file.path.startsWith(this.settings.syncDirectory));

    return (
      await Promise.all(
        markdownFiles.map(async (file) => ((await this.isRecordingFromToday(file)) ? file.basename : undefined))
      )
    ).filter((filename) => filename !== undefined) as string[];
  };
}
