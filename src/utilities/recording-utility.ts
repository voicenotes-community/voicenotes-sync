import { DateTimeHelper } from '@/helpers';
import VoiceNotesPlugin from '@/main';
import { VoiceNote } from '@/types';
import { sanitize } from 'sanitize-filename-ts';

export class RecordingUtility {
  constructor(private plugin: VoiceNotesPlugin) {}

  static getLatestNote<T extends Pick<VoiceNote, 'updated_at'>>(recordings: T[]): T {
    return recordings.reduce((latest, current) => {
      return new Date(current.updated_at) > new Date(latest.updated_at) ? current : latest;
    });
  }

  sanitizedTitle(title: string, created_at: string): string {
    const date = DateTimeHelper.formatDate(created_at, this.plugin.settings.filenameDateFormat);
    const generatedTitle = this.plugin.settings.filenameTemplate.replace('{{date}}', date).replace('{{title}}', title);
    return sanitize(generatedTitle);
  }
}
