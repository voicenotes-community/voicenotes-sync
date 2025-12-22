import { Editor, Notice, TFile } from 'obsidian';
import VoiceNotesPlugin from '../main';
import { DateTimeHelper } from '@/helpers';

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

    const markdownFiles = vault
      .getMarkdownFiles()
      .filter((file) => file.path.startsWith(plugin.settings.syncDirectory));

    return (
      await Promise.all(
        markdownFiles.map(async (file) => ((await isRecordingFromToday(file)) ? file.basename : undefined))
      )
    ).filter((filename) => filename !== undefined) as string[];
  };

  const isRecordingFromToday = async (file: TFile): Promise<boolean> => {
    return DateTimeHelper.isToday(
      await plugin.app.metadataCache.getFileCache(file)?.frontmatter?.[
        plugin.settings.useCustomChangedAtProperty ? plugin.settings.customChangedAtProperty : 'created_at'
      ]
    );
  };
}
