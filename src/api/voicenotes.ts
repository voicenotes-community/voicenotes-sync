import { DataAdapter, Notice, requestUrl, RequestUrlResponse } from 'obsidian';
import { User, VoiceNote, VoiceNoteRecordings, VoiceNoteSignedUrl } from '../types';
import { API_ROUTES, BASE_API_URL } from '@/constants';

type VoiceNotesApiOptions = {
  token?: string;
  lastSyncedNoteUpdatedAt?: string;
  deletedLocalRecordings?: Pick<VoiceNote, 'recording_id' | 'updated_at'>[];
};

export default class VoiceNotesApi {
  private token?: string;

  /**
   * Optional timestamp of the last synced note's updated_at property
   */
  private lastSyncedNoteUpdatedAt?: string;

  private deletedLocalRecordings: Pick<VoiceNote, 'recording_id' | 'updated_at'>[] = [];

  constructor(options: VoiceNotesApiOptions = {}) {
    if (options.token) {
      this.token = options.token;
    }

    if (options.lastSyncedNoteUpdatedAt) {
      this.lastSyncedNoteUpdatedAt = options.lastSyncedNoteUpdatedAt;
    }

    if (options.deletedLocalRecordings) {
      this.deletedLocalRecordings = options.deletedLocalRecordings;
    }
  }

  setToken(token: string | undefined | null): void {
    this.token = token || undefined;
  }

  /**
   * Validates if a token exists and is non-empty
   */
  private hasValidToken(): boolean {
    return !!(this.token && this.token.trim().length > 0);
  }

  /**
   * Builds the full API URL from an endpoint
   */
  private buildUrl(endpoint: string): string {
    // Handle full URLs (for pagination links that come back from API)
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    // Ensure endpoint starts with /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${BASE_API_URL}${cleanEndpoint}`;
  }

  /**
   * Makes an authenticated request with consistent error handling
   */
  private async makeAuthenticatedRequest(endpoint: string, options: Partial<RequestInit> = {}): Promise<any> {
    if (!this.hasValidToken()) {
      throw new Error('No valid authentication token');
    }

    const url = this.buildUrl(endpoint);
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${this.token}`,
      'X-API-KEY': `${this.token}`,
    };

    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers,
    };

    const res = await fetch(url, fetchOptions);

    if (res.ok) {
      return await res.json();
    }

    if (res.status === 401) {
      this.token = undefined;
      throw {
        status: res.status,
        message: 'Authentication failed - token invalid or expired',
      };
    }

    if (res.status === 404) {
      throw {
        status: res.status,
        message: 'Resource not found, Please try again later',
      };
    }

    if (res.status === 400) {
      const errorData = await res.json();
      const message = errorData.message || 'Bad Request';
      new Notice(message || 'Bad Request');

      throw {
        status: res.status,
        message: message || 'Bad Request',
      };
    }

    throw {
      status: res.status,
      message: 'Something went wrong, Please try again later',
    };
  }

  async getSignedUrl(recordingId: string): Promise<VoiceNoteSignedUrl | null> {
    if (!this.hasValidToken()) {
      return null;
    }

    try {
      const data = await this.makeAuthenticatedRequest(API_ROUTES.GET_SIGNED_URL.replace(':recordingId', recordingId));

      return data as VoiceNoteSignedUrl;
    } catch (error) {
      console.error('Failed to get signed URL:', error);
      throw error;
    }
  }

  async downloadFile(fs: DataAdapter, url: string, outputLocationPath: string): Promise<void> {
    try {
      const response = await requestUrl({ url });
      const buffer = Buffer.from(response.arrayBuffer);
      await fs.writeBinary(outputLocationPath, buffer);
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  }

  async deleteRecording(recordingId: string): Promise<RequestUrlResponse | boolean> {
    if (!this.hasValidToken()) {
      return false;
    }

    const response = await this.makeAuthenticatedRequest(
      API_ROUTES.DELETE_RECORDING.replace(':recordingId', recordingId),
      {
        method: 'DELETE',
      }
    );

    return response;
  }

  async getRecordingsFromLink(link: string): Promise<VoiceNoteRecordings | null> {
    if (!this.hasValidToken()) {
      return null;
    }

    try {
      const options: Partial<RequestInit> = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      };
      // This uses the full link URL (for pagination)
      const data = await this.makeAuthenticatedRequest(link, options);
      return data as VoiceNoteRecordings;
    } catch (error) {
      console.error('Failed to get recordings from link:', error);
      throw error;
    }
  }

  async getRecordings(): Promise<VoiceNoteRecordings | null> {
    if (!this.hasValidToken()) {
      return null;
    }

    try {
      const options: Partial<RequestInit> = {
        body: JSON.stringify({
          obsidian_deleted_recording_ids: this.deletedLocalRecordings.map((r) => r.recording_id),
          last_synced_note_updated_at: this.lastSyncedNoteUpdatedAt,
        }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const data = await this.makeAuthenticatedRequest(API_ROUTES.GET_RECORDINGS, options);

      return data as VoiceNoteRecordings;
    } catch (error) {
      console.error('Failed to get recordings:', error);
      throw error;
    }
  }

  async getUserInfo(): Promise<User | null> {
    if (!this.hasValidToken()) {
      return null;
    }

    try {
      const data = await this.makeAuthenticatedRequest(API_ROUTES.GET_USER);
      return data as User;
    } catch (error) {
      console.error('Failed to get user info:', error);
      // Don't throw here as this is used to check if token is valid
      return null;
    }
  }
}
