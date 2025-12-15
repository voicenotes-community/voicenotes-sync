import { moment } from 'obsidian';

export class DateTimeHelper {
  static isToday(date: string): boolean {
    // @ts-expect-error" - moment is callable despite TypeScript thinking otherwise
    return moment(date).isSame(moment(), 'day');
  }

  static formatDate(date: string, dateFormat: string): string {
    try {
      // @ts-expect-error" - moment is callable despite TypeScript thinking otherwise
      return moment(date).format(dateFormat);
    } catch (error) {
      console.error('Error formatting date:', error);
      return date;
    }
  }

  static formatDuration(durationMs: number): string {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m${seconds.toString().padStart(2, '0')}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
