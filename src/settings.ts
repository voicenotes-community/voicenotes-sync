import { App, Notice, PluginSettingTab, setIcon, Setting, TextAreaComponent } from 'obsidian';
import VoiceNotesPlugin from './main';
import { autoResizeTextArea } from './utils';
import VoiceNotesApi from './api/voicenotes';
import { User, VoiceNotesPluginSettings } from './types';

export class VoiceNotesSettingTab extends PluginSettingTab {
  plugin: VoiceNotesPlugin;
  vnApi: VoiceNotesApi;

  constructor(app: App, plugin: VoiceNotesPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.vnApi = new VoiceNotesApi({});
  }

  async display(): Promise<void> {
    const { containerEl } = this;
    containerEl.empty();

    this.renderHeader(containerEl);

    if (!this.plugin.settings.token) {
      await this.renderLoginSection(containerEl);
    } else {
      this.vnApi.setToken(this.plugin.settings.token);
      const userInfo = await this.vnApi.getUserInfo();
      await this.renderUserSection(containerEl, userInfo);
      await this.renderSyncSettings(containerEl);
      await this.renderContentSettings(containerEl);
      await this.renderTemplateSettings(containerEl);
      await this.renderAdvancedSettings(containerEl);
    }
  }

  private renderHeader(containerEl: HTMLElement): void {
    const header = containerEl.createDiv({
      attr: { style: 'display:flex; align-items:center; gap:8px; margin-bottom:10px' },
    });

    header.createEl('h1', { text: 'Voicenotes Settings' });
    header.createSpan({
      text: `v${this.plugin.manifest.version}`,
      cls: 'txt-muted',
    });
  }

  private async renderLoginSection(containerEl: HTMLElement): Promise<void> {
    const wrapper = containerEl.createDiv();

    wrapper.createEl('h2', {
      text: 'Connect your account',
      attr: { style: 'margin-bottom: 4px;' },
    });

    wrapper.createEl('p', {
      text: 'Start syncing your voice notes by connecting your account using an authentication token.',
      cls: 'txt-muted',
      attr: { style: 'margin-bottom: 13px; margin-top: 0;' },
    });

    const inputEl = wrapper.createEl('input', {
      type: 'password',
      placeholder: 'Enter your Voicenotes Auth Token',
      cls: 'auth-input',
    });

    inputEl.addEventListener('input', async (event: Event) => {
      const target = event.target as HTMLInputElement;
      this.plugin.settings.token = target.value;
      await this.plugin.saveSettings();
    });

    const btnWrapper = wrapper.createDiv({ cls: 'btn-wrapper' });

    const button = btnWrapper.createEl('button', {
      text: 'Connect',
      cls: 'mod-cta auth-btn',
    });

    button.addEventListener('click', async () => await this.handleLogin());

    const extButton = btnWrapper.createEl('button', {
      cls: 'btn-secondary auth-btn external-btn',
      text: 'Get your token',
    });

    extButton.addEventListener('click', () => {
      window.open('https://voicenotes.com/app?obsidian=true#settings', '_blank');
    });

    const externalIcon = extButton.createDiv();
    setIcon(externalIcon, 'external-link');
  }

  private async renderUserSection(containerEl: HTMLElement, userInfo: User): Promise<void> {
    const userRow = containerEl.createDiv({
      cls: 'user-row',
    });

    const userInline = userRow.createDiv({ attr: { style: 'display:flex;align-items:center;gap:10px' } });

    const initials =
      (userInfo.name || '')
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '?';

    userInline.createDiv({
      text: initials,
      cls: 'user-initials',
    });

    const txt = userInline.createDiv({ attr: { style: 'line-height:1' } });
    txt.createEl('div', { text: `Signed in as ${userInfo.name}`, attr: { style: 'font-weight:600' } });
    txt.createEl('div', {
      text: `${userInfo.email}`,
      cls: 'txt-muted',
    });

    const userActions = userRow.createDiv({ attr: { style: 'display:flex;align-items:center;gap:10px' } });

    const syncBtn = userActions.createEl('button', {
      cls: 'mod-cta sync-btn',
      attr: {
        title: 'Manually sync your voice notes now',
      },
    });

    syncBtn.createEl('span', {
      text: 'Sync Now',
      cls: 'sync-btn-label',
    });

    const dotsContainer = syncBtn.createEl('span', {
      cls: 'sync-dots',
      attr: { style: 'display:none' },
    });

    dotsContainer.createEl('span', { cls: 'dot' });
    dotsContainer.createEl('span', { cls: 'dot' });
    dotsContainer.createEl('span', { cls: 'dot' });

    syncBtn.addEventListener('click', async () => await this.handleSync());

    const btn = userActions.createEl('button', {
      text: 'Logout',
      cls: 'btn-bordered',
      attr: {
        title: 'Logout from VoiceNotes',
      },
    });

    btn.addEventListener('click', async () => await this.handleLogout());
  }

  private async renderSyncSettings(containerEl: HTMLElement): Promise<void> {
    new Setting(containerEl).setName('Sync Settings').setHeading();

    new Setting(containerEl)
      .setName('Automatic sync')
      .setDesc('Enable automatic syncing of voice notes at regular intervals')
      .addDropdown((dropdown) => {
        const options: Record<string, string> = {
          '60': 'Every 1 hours',
          '360': 'Every 3 hours',
          '720': 'Every 6 hours',
          '1440': 'Every 12 hours',
          '2880': 'Every 24 hours',
        };

        const current = String(this.plugin.settings.syncTimeout ?? 30);
        if (!options[current]) {
          options[current] = `${current} minutes`;
        }

        dropdown
          .addOptions(options)
          .setValue(current)
          .onChange(async (value: string) => {
            this.plugin.settings.syncTimeout = Number(value);
            await this.plugin.saveSettings();
          });

        dropdown.setDisabled(!this.plugin.settings.automaticSync);

        return dropdown;
      })
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.automaticSync).onChange(
          this.createToggleHandler('automaticSync', async () => {
            if (this.plugin.settings.automaticSync) {
              await this.plugin.sync();
            }
            await this.display();
          })
        )
      );

    new Setting(containerEl)
      .setName('Sync directory')
      .setDesc('Directory within your vault where notes will be synced')
      .addText((text) =>
        text
          .setPlaceholder('voicenotes')
          .setValue(this.plugin.settings.syncDirectory)
          .onChange(this.createTextInputHandler('syncDirectory'))
      );

    new Setting(containerEl)
      .setName('Exclude Tags')
      .setDesc('Comma-separated list of tags to exclude from syncing')
      .addText((text) =>
        text
          .setPlaceholder('archive, trash')
          .setValue(this.plugin.settings.excludeTags.join(', '))
          .onChange(async (value) => {
            this.plugin.settings.excludeTags = value.split(',').map((folder) => folder.trim());
            await this.plugin.saveSettings();
          })
      );
  }

  private async renderContentSettings(containerEl: HTMLElement): Promise<void> {
    new Setting(containerEl).setName('Notes Settings').setHeading();

    new Setting(containerEl)
      .setName('Add a tag to todos')
      .setDesc('When syncing a note add an optional tag to the todo')
      .addText((text) =>
        text
          .setPlaceholder('TODO')
          .setValue(this.plugin.settings.todoTag)
          .onChange(this.createTextInputHandler('todoTag'))
      );

    new Setting(containerEl)
      .setName('Download audio')
      .setDesc('Store and download the audio associated with the transcript')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.downloadAudio || false).onChange(this.createToggleHandler('downloadAudio'))
      );

    new Setting(containerEl)
      .setName('Date Format')
      .setDesc('Format of the date used in the templates below (moment.js format)')
      .addText((text) =>
        text
          .setPlaceholder('YYYY-MM-DD')
          .setValue(this.plugin.settings.dateFormat || '')
          .onChange(this.createTextInputHandler('dateFormat'))
      );

    new Setting(containerEl)
      .setName('Filename Date Format')
      .setDesc('Format of the date used to replace {{date}} if in Filename Template below (moment.js format)')
      .addText((text) =>
        text
          .setPlaceholder('YYYY-MM-DD')
          .setValue(this.plugin.settings.filenameDateFormat)
          .onChange(this.createTextInputHandler('filenameDateFormat'))
      );

    new Setting(containerEl)
      .setName('Filename Template')
      .setDesc('Template for the filename of synced notes. Available variables: {{date}}, {{title}}')
      .addText((text) =>
        text
          .setPlaceholder('{{date}} {{title}}')
          .setValue(this.plugin.settings.filenameTemplate || '')
          .onChange(this.createTextInputHandler('filenameTemplate'))
      );
  }

  private async renderTemplateSettings(containerEl: HTMLElement): Promise<void> {
    new Setting(containerEl).setName('Notes Formatting').setHeading();

    new Setting(containerEl)
      .setName('Frontmatter Template')
      .setDesc(
        'Frontmatter / properties template for notes. recording_id and the three dashes before and after properties automatically added'
      )
      .addTextArea((text) => this.createTextAreaWithAutoresize(text, 'frontmatterTemplate', containerEl));

    new Setting(containerEl)
      .setName('Note Template')
      .setDesc(
        'Template for synced notes. Available variables: {{recording_id}}, {{title}}, {{date}}, {{duration}}, {{created_at}}, {{updated_at}}, {{tags}}, {{transcript}}, {{embedded_audio_link}}, {{audio_filename}}, {{summary}}, {{tidy}}, {{points}}, {{todo}}, {{email}}, {{tweet}}, {{blog}}, {{custom}}, {{parent_note}} and {{related_notes}}'
      )
      .addTextArea((text) => this.createTextAreaWithAutoresize(text, 'noteTemplate', containerEl));
  }

  private async renderAdvancedSettings(containerEl: HTMLElement): Promise<void> {
    new Setting(containerEl)
      .setName('Use custom frontmatter property for date sorting')
      .setDesc(
        'If you have changed the frontmatter template above, you can specify here which property should be used, e.g. to include todays notes.'
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.useCustomChangedAtProperty || false).onChange(
          this.createToggleHandler('useCustomChangedAtProperty', async () => {
            await this.display();
          })
        )
      )
      .addText((text) => {
        text
          .setPlaceholder('Custom setting value')
          .setValue(this.plugin.settings.customChangedAtProperty || '')
          .setDisabled(!this.plugin.settings.useCustomChangedAtProperty)
          .onChange(this.createTextInputHandler('customChangedAtProperty'));
        return text;
      });
  }

  private createTextInputHandler(settingKey: keyof VoiceNotesPluginSettings) {
    return async (value: string) => {
      (this.plugin.settings as any)[settingKey] = value;
      await this.plugin.saveSettings();
    };
  }

  private createToggleHandler(settingKey: keyof VoiceNotesPluginSettings, afterChange?: () => Promise<void>) {
    return async (value: boolean) => {
      (this.plugin.settings as any)[settingKey] = value;
      await this.plugin.saveSettings();
      if (afterChange) {
        await afterChange();
      }
    };
  }

  /**
   * Creates a textarea with autoresize functionality
   */
  private createTextAreaWithAutoresize(
    text: TextAreaComponent,
    settingKey: keyof VoiceNotesPluginSettings,
    containerEl: HTMLElement
  ): TextAreaComponent {
    text
      .setPlaceholder((this.plugin.settings as any)[settingKey])
      .setValue((this.plugin.settings as any)[settingKey])
      .onChange(this.createTextInputHandler(settingKey));

    text.inputEl.classList.add('autoresize');
    autoResizeTextArea(text.inputEl);
    text.inputEl.addEventListener('input', () => autoResizeTextArea(text.inputEl));
    containerEl.appendChild(text.inputEl);

    return text;
  }

  private async handleLogin(): Promise<void> {
    this.vnApi.setToken(this.plugin.settings.token);
    const response = await this.vnApi.getUserInfo();

    if (response) {
      await this.plugin.saveSettings();
      await this.display();
      this.plugin.setupAutoSync();
      new Notice('Logged in successfully');
    } else {
      new Notice('Failed to log in with provided token. Please check and try again.');
    }
  }

  private async handleLogout(): Promise<void> {
    new Notice('Successfully logged out.');
    this.plugin.settings.token = null;
    await this.plugin.saveSettings();
    await this.display();
  }

  private async handleSync(): Promise<void> {
    this.plugin.syncedRecordingIds = [];
    this.toggleSyncingState(true);
    await this.plugin.sync();
    setTimeout(() => {
      this.toggleSyncingState(false);
    }, 500);
  }

  private async toggleSyncingState(isSyncing: boolean = false): Promise<void> {
    document.querySelector('.sync-btn-label')!.textContent = isSyncing ? 'Syncing' : 'Sync Now';
    document.querySelector('.sync-dots').setAttribute('style', isSyncing ? 'display: inline-flex' : 'display:none');
  }
}
