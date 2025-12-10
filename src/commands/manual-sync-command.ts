import VoiceNotesPlugin from '../main';

export function registerManualSyncCommand(plugin: VoiceNotesPlugin) {
  plugin.addCommand({
    id: 'manual-sync-voicenotes',
    name: 'Manual Sync Voicenotes',
    callback: async () => await plugin.sync(),
  });
}
