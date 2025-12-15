export const BASE_API_URL = process.env.API_URL || 'https://api.voicenotes.test/api/integrations/obsidian-sync';

export const API_ROUTES = {
  GET_USER: '/user/info',
  GET_VOICE_NOTE_URL: '/voicenotes',
  GET_VOICE_NOTE_SIGNED_URL: '/voicenotes/signed-url',
  GET_RECORDINGS: '/recordings',
  DELETE_RECORDING: '/recordings/:recordingId',
  GET_SIGNED_URL: '/recordings/:recordingId/signed-url',
};
