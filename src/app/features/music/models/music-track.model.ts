export interface HttpGlobalResponse<T> {
  data: T;
  message: string;
}

/** Refleja MusicTrackResponseDto de ms-music-media. */
export interface MusicTrackResponseDto {
  id: string;
  enrollmentId: number;
  filename: string;
  format: string;
  sizeKb: number;
  durationSeconds: number;
  isActive: boolean;
  uploadedAt: string;
}

/** Refleja la validación de MusicTrackServiceImpl.validateAudioFile (backend). */
export const ALLOWED_AUDIO_EXTENSIONS = ['mp3', 'mpeg', 'mp4', 'm4a', 'wav', 'aac', 'ogg'];

/** Refleja spring.servlet.multipart.max-file-size de ms-music-media. */
export const MAX_AUDIO_FILE_SIZE_BYTES = 50 * 1024 * 1024;
