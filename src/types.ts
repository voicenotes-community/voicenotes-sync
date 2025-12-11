/* -------------------------------------------------------------------------- */
/*                                    MAIN                                    */
/* -------------------------------------------------------------------------- */

export interface VoiceNotesPluginSettings {
  token?: string;
  automaticSync: boolean;
  syncTimeout?: number;
  downloadAudio?: boolean;
  downloadAttachment?: boolean;
  syncDirectory: string;
  deleteSynced: boolean;
  reallyDeleteSynced: boolean;
  todoTag: string;
  filenameDateFormat: string;
  frontmatterTemplate: string;
  noteTemplate: string;
  filenameTemplate: string;
  excludeTags: string[];
  dateFormat: string;
  useCustomChangedAtProperty: boolean;
  customChangedAtProperty: string;
  lastSyncedNoteUpdatedAt?: string;
}

export interface User {
  name: string;
  email: string;
  photo_url: string | null;
}

/* -------------------------------------------------------------------------- */
/*                               VOICENOTES API                               */
/* -------------------------------------------------------------------------- */

export interface VoiceNoteSignedUrl {
  url: string;
}

export interface VoiceNoteAttachment {
  id: string;
  type: number;
  description: string;
  url: string;
  created_at: string;
}

export interface VoiceNoteCreation {
  id: string;
  type: string;
  content: { data: string[] };
  markdown_content: string;
}

export interface VoiceNote {
  id: string;
  recording_id: string;
  title: string;
  duration: number;
  transcript: string;
  related_notes: VoiceNote[];
  tags: { name: string }[];
  creations: VoiceNoteCreation[];
  subnotes: VoiceNote[];
  attachments: VoiceNoteAttachment[];
  created_at: string;
  updated_at: string;
}

export interface VoiceNoteRecordings {
  data: VoiceNote[];
  links: {
    next?: string;
  };
}
