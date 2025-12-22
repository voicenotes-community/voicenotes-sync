export class FileHelper {
  static getFilenameFromUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      const filename = pathname.split('/').pop();

      return filename || '';
    } catch (error) {
      console.error('Invalid URL:', error);
      return '';
    }
  }

  static convertHtmlToMarkdown(text: string): string {
    const htmlEntities: { [key: string]: string } = {
      '&lt;': '<',
      '&gt;': '>',
      '&amp;': '&',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
    };

    // Convert HTML entities
    let markdown = text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => htmlEntities[entity] || entity);

    // Convert <br/> tags to newlines
    markdown = markdown.replace(/<br\s*\/?>/gi, '\n');

    // Remove other HTML tags
    markdown = markdown.replace(/<\/?[^>]+(>|$)/g, '');

    return markdown.trim();
  }
}
