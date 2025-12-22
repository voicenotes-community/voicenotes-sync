export class AppHelper {
  static autoResizeTextArea(textarea: HTMLTextAreaElement): void {
    requestAnimationFrame(() => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
  }
}
