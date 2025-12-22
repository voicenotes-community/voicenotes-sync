import VoiceNotesPlugin from '../main';
import { registerManualSyncCommand } from './manual-sync-command';
import { registerInsertTodayNotesCommand } from './insert-today-notes-command';
import { registerDeleteRemoteNoteCommand } from './delete-remote-note-command';

export function registerCommands(plugin: VoiceNotesPlugin) {
  registerManualSyncCommand(plugin);
  registerInsertTodayNotesCommand(plugin);
  registerDeleteRemoteNoteCommand(plugin);
}
