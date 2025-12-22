import { VoiceNotesPluginSettings } from '@/types';

export class AppConfig {
  static get DEFAULT_SETTINGS(): VoiceNotesPluginSettings {
    return {
      automaticSync: true,
      syncTimeout: 180,
      downloadAudio: false,
      syncDirectory: 'voicenotes',
      deleteSynced: false,
      reallyDeleteSynced: false,
      todoTag: '',
      filenameDateFormat: 'YYYY-MM-DD',
      frontmatterTemplate: `duration: {{duration}}
created_at: {{created_at}}
updated_at: {{updated_at}}
{{tags}}`,
      noteTemplate: `# {{ title }}
        
        Date: {{ date }}
        
        {% if summary %}
        ## Summary
        
        {{ summary }}
        {% endif %}
        
        {% if points %}
        ## Main points
        
        {{ points }}
        {% endif %}
        
        {% if attachments %}
        ## Attachments
        
        {{ attachments }}
        {% endif %}
        
        {% if tidy %}
        ## Tidy Transcript
        
        {{ tidy }}
        
        {% else %}
        ## Transcript
        
        {{ transcript }}
        {% endif %}
        
        {% if embedded_audio_link %}
        {{ embedded_audio_link }}
        {% endif %}
        
        {% if audio_filename %}
        [[{{ audio_filename }}|Audio]]
        {% endif %}
        
        {% if todo %}
        ## Todos
        
        {{ todo }}
        {% endif %}
        
        {% if email %}
        ## Email
        
        {{ email }}
        {% endif %}
        
        {% if blog %}
        ## Blog
        
        {{ blog }}
        {% endif %}
        
        {% if tweet %}
        ## Tweet
        
        {{ tweet }}
        {% endif %}
        
        {% if custom %}
        ## Others
        
        {{ custom }}
        {% endif %}
        
        {% if tags %}
        ## Tags
        
        {{ tags }}
        {% endif %}
        
        {% if related_notes %}
        # Related Notes
        
        {{ related_notes }}
        {% endif %}
        
        {% if parent_note %}
        ## Parent Note
        
        - {{ parent_note }}
        {% endif %}
        
        {% if subnotes %}
        ## Subnotes
        
        {{ subnotes }}
        {% endif %}`,

      filenameTemplate: `
        {{date}} {{title}}
        `,
      excludeTags: [],
      dateFormat: 'YYYY-MM-DD',
      useCustomChangedAtProperty: false,
      customChangedAtProperty: 'created_at',
    };
  }
}
