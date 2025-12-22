import { requestUrl, DataAdapter } from 'obsidian';
import VoiceNotesApi from '../../src/api/voicenotes';
import { User, VoiceNoteRecordings, VoiceNoteSignedUrl } from '../../src/types';
import { BASE_API_URL, API_ROUTES } from '../../src/constants/api-routes';

// Mock obsidian module
jest.mock('obsidian');

// Mock global fetch
global.fetch = jest.fn();

describe('VoiceNotesApi', () => {
  let api: VoiceNotesApi;
  const mockRequestUrl = requestUrl as jest.MockedFunction<typeof requestUrl>;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    api = new VoiceNotesApi();
  });

  describe('constructor and token management', () => {
    it('should initialize without a token', () => {
      const api = new VoiceNotesApi();
      expect(api['token']).toBeUndefined();
    });

    it('should initialize with a token', () => {
      const api = new VoiceNotesApi({ token: 'test-token' });
      expect(api['token']).toBe('test-token');
    });

    it('should initialize with lastSyncedNoteUpdatedAt', () => {
      const api = new VoiceNotesApi({ token: 'test-token', lastSyncedNoteUpdatedAt: '2025-01-01T00:00:00Z' });
      expect(api['token']).toBe('test-token');
      expect(api['lastSyncedNoteUpdatedAt']).toBe('2025-01-01T00:00:00Z');
    });

    it('should set token via setToken method', () => {
      api.setToken('new-token');
      expect(api['token']).toBe('new-token');
    });

    it('should clear token when null is passed', () => {
      api.setToken('token');
      api.setToken(null);
      expect(api['token']).toBeUndefined();
    });

    it('should validate token correctly', () => {
      expect(api['hasValidToken']()).toBe(false);

      api.setToken('valid-token');
      expect(api['hasValidToken']()).toBe(true);

      api.setToken('   ');
      expect(api['hasValidToken']()).toBe(false);
    });
  });

  describe('buildUrl', () => {
    it('should build correct URL for relative endpoints', () => {
      expect(api['buildUrl']('/recordings')).toBe(`${BASE_API_URL}/recordings`);
      expect(api['buildUrl']('recordings')).toBe(`${BASE_API_URL}/recordings`);
    });

    it('should preserve full URLs', () => {
      const fullUrl = `${BASE_API_URL}/recordings?page=2`;
      expect(api['buildUrl'](fullUrl)).toBe(fullUrl);
    });

    it('should handle http URLs', () => {
      const httpUrl = `${BASE_API_URL}/recordings`;
      expect(api['buildUrl'](httpUrl)).toBe(httpUrl);
    });
  });

  describe('makeAuthenticatedRequest', () => {
    beforeEach(() => {
      api.setToken('valid-token');
    });

    it('should add authorization header to requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as Response);

      await api['makeAuthenticatedRequest']('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_API_URL}/test`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer valid-token`,
            'X-API-KEY': 'valid-token',
          }),
        })
      );
    });

    it('should throw error when no token is present', async () => {
      api.setToken(null);

      await expect(api['makeAuthenticatedRequest']('/user/info')).rejects.toThrow('No valid authentication token');
    });

    it('should clear token on 401 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      } as Response);

      await expect(api['makeAuthenticatedRequest']('/user/info')).rejects.toMatchObject({
        status: 401,
        message: 'Authentication failed - token invalid or expired',
      });

      expect(api['token']).toBeUndefined();
    });

    it('should handle 404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(api['makeAuthenticatedRequest']('/test')).rejects.toMatchObject({
        status: 404,
        message: 'Resource not found, Please try again later',
      });
    });

    it('should handle 400 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid request' }),
      } as Response);

      await expect(api['makeAuthenticatedRequest']('/test')).rejects.toMatchObject({
        status: 400,
        message: 'Invalid request',
      });
    });

    it('should handle other errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(api['makeAuthenticatedRequest']('/test')).rejects.toMatchObject({
        status: 500,
        message: 'Something went wrong, Please try again later',
      });

      expect(api['token']).toBe('valid-token'); // Token should not be cleared
    });
  });

  describe('getRecordings', () => {
    it('should fetch recordings successfully', async () => {
      api.setToken('valid-token');
      const mockRecordings: VoiceNoteRecordings = {
        data: [
          {
            id: 'unique-id',
            title: 'Test Recording',
            recording_id: '',
            duration: 0,
            transcript: '',
            related_notes: [],
            tags: [],
            creations: [],
            subnotes: [],
            attachments: [],
            created_at: '',
            updated_at: '',
          },
        ],
        links: { next: null },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRecordings,
      } as Response);

      const result = await api.getRecordings();

      expect(result).toEqual(mockRecordings);
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_API_URL}${API_ROUTES.GET_RECORDINGS}`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer valid-token`,
            'X-API-KEY': 'valid-token',
          }),
        })
      );
    });

    it('should include lastSyncedNoteUpdatedAt in query params when set', async () => {
      const timestamp = '2025-01-01T00:00:00Z';
      api = new VoiceNotesApi({ token: 'valid-token', lastSyncedNoteUpdatedAt: timestamp });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [], links: { next: null } }),
      } as Response);

      await api.getRecordings();

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_API_URL}${API_ROUTES.GET_RECORDINGS}?last_synced_note_updated_at=${encodeURIComponent(timestamp)}`,
        expect.any(Object)
      );
    });

    it('should return null when no token', async () => {
      const result = await api.getRecordings();
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle errors and throw', async () => {
      api.setToken('valid-token');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(api.getRecordings()).rejects.toMatchObject({
        status: 500,
      });
    });
  });

  describe('getSignedUrl', () => {
    it('should fetch signed URL successfully', async () => {
      api.setToken('valid-token');
      const mockSignedUrl: VoiceNoteSignedUrl = {
        url: 'https://signed-url.example.com',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSignedUrl,
      } as Response);

      const result = await api.getSignedUrl('123');

      expect(result).toEqual(mockSignedUrl);
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_API_URL}/recordings/123/signed-url`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer valid-token`,
            'X-API-KEY': 'valid-token',
          }),
        })
      );
    });

    it('should return null when no token', async () => {
      const result = await api.getSignedUrl('123');
      expect(result).toBeNull();
    });
  });

  describe('deleteRecording', () => {
    it('should delete recording successfully', async () => {
      api.setToken('valid-token');
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await api.deleteRecording('123');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_API_URL}/recordings/123`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: `Bearer valid-token`,
            'X-API-KEY': 'valid-token',
          }),
        })
      );
    });

    it('should return false when no token', async () => {
      const result = await api.deleteRecording('123');
      expect(result).toBe(false);
    });
  });

  describe('getUserInfo', () => {
    it('should fetch user info successfully', async () => {
      api.setToken('valid-token');
      const mockUser: User = {
        name: 'Test User',
        email: 'test@example.com',
        photo_url: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockUser,
      } as Response);

      const result = await api.getUserInfo();

      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_API_URL}${API_ROUTES.GET_USER}`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer valid-token`,
            'X-API-KEY': 'valid-token',
          }),
        })
      );
    });

    it('should return null on error (used for token validation)', async () => {
      api.setToken('invalid-token');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      } as Response);

      const result = await api.getUserInfo();

      expect(result).toBeNull();
    });

    it('should return null when no token', async () => {
      const result = await api.getUserInfo();
      expect(result).toBeNull();
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      const mockFs = {
        writeBinary: jest.fn().mockResolvedValue(undefined),
      } as unknown as DataAdapter;
      const mockArrayBuffer = new ArrayBuffer(8);

      mockRequestUrl.mockResolvedValueOnce({
        status: 200,
        json: {},
        headers: {},
        arrayBuffer: mockArrayBuffer,
        text: '',
      });

      await api.downloadFile(mockFs, 'https://example.com/file.mp3', '/path/to/output.mp3');

      expect(mockRequestUrl).toHaveBeenCalledWith({
        url: 'https://example.com/file.mp3',
      });
      expect(mockFs.writeBinary).toHaveBeenCalledWith('/path/to/output.mp3', expect.any(Buffer));
    });

    it('should throw error on download failure', async () => {
      const mockFs = {
        writeBinary: jest.fn(),
      } as unknown as DataAdapter;
      mockRequestUrl.mockRejectedValueOnce(new Error('Download failed'));

      await expect(api.downloadFile(mockFs, 'https://example.com/file.mp3', '/path/to/output.mp3')).rejects.toThrow(
        'Download failed'
      );
    });
  });

  describe('getRecordingsFromLink', () => {
    it('should fetch recordings from pagination link', async () => {
      api.setToken('valid-token');
      const paginationUrl = `${BASE_API_URL}/recordings?page=2`;
      const mockRecordings: VoiceNoteRecordings = {
        data: [],
        links: { next: null },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRecordings,
      } as Response);

      const result = await api.getRecordingsFromLink(paginationUrl);

      expect(result).toEqual(mockRecordings);
      expect(mockFetch).toHaveBeenCalledWith(
        paginationUrl,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer valid-token`,
            'X-API-KEY': 'valid-token',
          }),
        })
      );
    });

    it('should return null when no token', async () => {
      const result = await api.getRecordingsFromLink(`${BASE_API_URL}/recordings?page=2`);
      expect(result).toBeNull();
    });
  });
});
