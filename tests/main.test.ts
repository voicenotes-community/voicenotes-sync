import { App, PluginManifest } from 'obsidian';
import { mockDeep } from 'jest-mock-extended';
import VoiceNotesPlugin from '../src/main';
import { AppConfig } from '../src/config/app';
import { DateTimeHelper } from '../src/helpers';
import { VoiceNote } from '../src/types';

describe('frontmatter tags', () => {
  const app = mockDeep<App>();
  let plugin: VoiceNotesPlugin;
  const recording: VoiceNote = {
    id: 'note-1',
    recording_id: 'recording-1',
    title: 'Test note',
    duration: 0,
    transcript: 'Test transcript',
    related_notes: [],
    tags: [{ name: 'tag1' }, { name: 'tag2' }],
    creations: [],
    subnotes: [],
    attachments: [],
    recording_signed_url: null,
    created_at: '2026-10-27T10:00:00Z',
    updated_at: '2026-10-27T10:00:00Z',
  };

  beforeEach(() => {
    plugin = new VoiceNotesPlugin(app, mockDeep<PluginManifest>());
    plugin.settings = AppConfig.DEFAULT_SETTINGS;
    app.vault.adapter.exists.mockResolvedValue(false);
    app.vault.getFileByPath.mockReturnValue(null);
    jest.spyOn(DateTimeHelper, 'formatDate').mockImplementation((date) => date);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['default template', undefined],
    ['custom template', 'tags: {{tags}}'],
    ['legacy default template', 'duration: {{duration}}\n{{tags}}'],
  ])('writes a tag array with the %s', async (_name, frontmatterTemplate) => {
    if (frontmatterTemplate !== undefined) {
      plugin.settings.frontmatterTemplate = frontmatterTemplate;
    }
    await plugin.processNote(recording, 'voicenotes', false, '', { count: 0 });

    const note = app.vault.create.mock.calls[0][1];
    const frontmatter = note.split('---\n')[1];
    expect(frontmatter).toContain('tags: ["tag1","tag2"]\n');
    expect(note).toContain('## Tags\n\n#tag1 #tag2');
  });

  it.each([
    { names: [], expected: '[]' },
    { names: [' ', ''], expected: '[]' },
    { names: ['  multi word  ', 'project/topic'], expected: '["multi-word","project/topic"]' },
    { names: ['true', '123', 'a"b', 'a\\b'], expected: '["true","123","a\\"b","a\\\\b"]' },
  ])('serializes tag names safely: $names', async ({ names, expected }) => {
    plugin.settings.frontmatterTemplate = 'tags: {{ tags }}';
    await plugin.processNote({ ...recording, tags: names.map((name) => ({ name })) }, 'voicenotes', false, '', {
      count: 0,
    });

    const frontmatter = app.vault.create.mock.calls[0][1].split('---\n')[1];
    expect(frontmatter).toContain(`tags: ${expected}\n`);
  });
});
