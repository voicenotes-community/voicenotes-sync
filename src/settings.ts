import { App, Notice, PluginSettingTab, setIcon, Setting, TextAreaComponent } from 'obsidian';
import VoiceNotesPlugin from './main';
import VoiceNotesApi from './api/voicenotes';
import { User, VoiceNotesPluginSettings } from './types';
import { AppHelper } from './helpers';

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

    if (!this.getSetting('token')) {
      await this.renderLoginSection(containerEl);
      return;
    }

    this.vnApi.setToken(this.getSetting('token')!);
    const userInfo = await this.vnApi.getUserInfo();
    await this.renderUserSection(containerEl, userInfo);
    await this.renderSyncSettings(containerEl);
    await this.renderContentSettings(containerEl);
    await this.renderTemplateSettings(containerEl);
    await this.renderAdvancedSettings(containerEl);
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
    }) as HTMLInputElement;

    inputEl.value = String(this.getSetting('token') ?? '');

    inputEl.addEventListener('input', async (event: Event) => {
      const target = event.target as HTMLInputElement;
      await this.setSetting('token', target.value);
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
          '60': 'Every 1 hour',
          '180': 'Every 3 hour',
          '360': 'Every 6 hour',
          '720': 'Every 12 hour',
          '1440': 'Every day',
        };

        const current = String(this.getSetting('syncTimeout') ?? 30);
        if (!options[current]) {
          options[current] = `${current} minutes`;
        }

        dropdown
          .addOptions(options)
          .setValue(current)
          .onChange(async (value: string) => {
            await this.setSetting('syncTimeout', Number(value));
          });

        dropdown.setDisabled(!this.getSetting('automaticSync'));

        return dropdown;
      })
      .addToggle((toggle) =>
        toggle.setValue(this.getSetting('automaticSync') ?? false).onChange(
          this.createToggleHandler('automaticSync', async () => {
            if (this.getSetting('automaticSync')) {
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
          .setValue(this.getSetting('syncDirectory') ?? '')
          .onChange(this.createTextInputHandler('syncDirectory'))
      );

    new Setting(containerEl)
      .setName('Exclude Tags')
      .setDesc('Comma-separated list of tags to exclude from syncing')
      .addText((text) =>
        text
          .setPlaceholder('archive, trash')
          .setValue((this.getSetting('excludeTags') ?? []).join(', '))
          .onChange(async (value) => {
            await this.setSetting(
              'excludeTags',
              value.split(',').map((t) => t.trim())
            );
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
          .setValue(this.getSetting('todoTag') ?? '')
          .onChange(this.createTextInputHandler('todoTag'))
      );

    new Setting(containerEl)
      .setName('Download audio')
      .setDesc('Store and download the audio associated with the transcript')
      .addToggle((toggle) =>
        toggle.setValue(this.getSetting('downloadAudio') ?? false).onChange(this.createToggleHandler('downloadAudio'))
      );

    new Setting(containerEl)
      .setName('Date Format')
      .setDesc('Format of the date used in the templates below (moment.js format)')
      .addText((text) =>
        text
          .setPlaceholder('YYYY-MM-DD')
          .setValue(this.getSetting('dateFormat') ?? '')
          .onChange(this.createTextInputHandler('dateFormat'))
      );

    new Setting(containerEl)
      .setName('Filename Date Format')
      .setDesc('Format of the date used to replace {{date}} if in Filename Template below (moment.js format)')
      .addText((text) =>
        text
          .setPlaceholder('YYYY-MM-DD')
          .setValue(this.getSetting('filenameDateFormat') ?? '')
          .onChange(this.createTextInputHandler('filenameDateFormat'))
      );

    new Setting(containerEl)
      .setName('Filename Template')
      .setDesc('Template for the filename of synced notes. Available variables: {{date}}, {{title}}')
      .addText((text) =>
        text
          .setPlaceholder('{{date}} {{title}}')
          .setValue(this.getSetting('filenameTemplate') ?? '')
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
        toggle.setValue(this.getSetting('useCustomChangedAtProperty') ?? false).onChange(
          this.createToggleHandler('useCustomChangedAtProperty', async () => {
            await this.display();
          })
        )
      )
      .addText((text) => {
        text
          .setPlaceholder('Custom setting value')
          .setValue(this.getSetting('customChangedAtProperty') ?? '')
          .setDisabled(!this.getSetting('useCustomChangedAtProperty'))
          .onChange(this.createTextInputHandler('customChangedAtProperty'));
        return text;
      });
  }

  private createTextInputHandler<K extends keyof VoiceNotesPluginSettings>(settingKey: K) {
    return async (value: VoiceNotesPluginSettings[K]) => {
      await this.setSetting(settingKey, value);
    };
  }

  private createToggleHandler<K extends keyof VoiceNotesPluginSettings>(
    settingKey: K,
    afterChange?: () => Promise<void>
  ) {
    return async (value: VoiceNotesPluginSettings[K]) => {
      await this.setSetting(settingKey, value);
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
    const current = String(this.getSetting(settingKey) ?? '');

    text.setPlaceholder(current).setValue(current).onChange(this.createTextInputHandler(settingKey));
    text.inputEl.classList.add('autoresize');
    AppHelper.autoResizeTextArea(text.inputEl);
    text.inputEl.addEventListener('input', () => AppHelper.autoResizeTextArea(text.inputEl));
    containerEl.appendChild(text.inputEl);

    return text;
  }

  private async handleLogin(): Promise<void> {
    const token = this.getSetting('token');
    if (!token) {
      new Notice('Please provide a token first.');
      return;
    }

    this.vnApi.setToken(token);
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
    await this.setSetting('token', null);
    await this.setSetting('lastSyncedNoteUpdatedAt', null);
    await this.display();
  }

  private async handleSync(): Promise<void> {
    this.plugin.syncedRecording = [];
    await this.toggleSyncingState(true);
    await this.plugin.sync();
    // ensure UI toggled off after sync completes
    await this.toggleSyncingState(false);
  }

  private async toggleSyncingState(isSyncing: boolean = false): Promise<void> {
    const label = this.containerEl.querySelector('.sync-btn-label') as HTMLElement | null;
    if (label) {
      label.textContent = isSyncing ? 'Syncing' : 'Sync Now';
    }

    const syncDotsEl = this.containerEl.querySelector('.sync-dots') as HTMLElement | null;
    if (syncDotsEl) {
      syncDotsEl.style.display = isSyncing ? 'inline-flex' : 'none';
    }
  }

  private getSetting<K extends keyof VoiceNotesPluginSettings>(key: K): VoiceNotesPluginSettings[K] {
    return this.plugin.settings[key];
  }

  private async setSetting<K extends keyof VoiceNotesPluginSettings>(key: K, value: VoiceNotesPluginSettings[K]) {
    this.plugin.settings[key] = value;
    await this.plugin.saveSettings();
  }
}
