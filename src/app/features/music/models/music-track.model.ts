export interface HttpGlobalResponse<T> {
  data: T;
  message: string;
}

/** Refleja MusicTrackResponseDto.HistoryEntryDto de ms-music-media (sin el gridFsId interno). */
export interface MusicTrackHistoryEntry {
  previousFilename: string;
  replacedAt: string;
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
  /** Versiones previas de la pista (la más antigua primero). Vacío o undefined si nunca se reemplazó. */
  history?: MusicTrackHistoryEntry[];
}

/** Refleja la validación de MusicTrackServiceImpl.validateAudioFile (backend). */
export const ALLOWED_AUDIO_EXTENSIONS = ['mp3', 'mpeg', 'mp4', 'm4a', 'wav', 'aac', 'ogg'];

/** Refleja spring.servlet.multipart.max-file-size de ms-music-media. */
export const MAX_AUDIO_FILE_SIZE_BYTES = 50 * 1024 * 1024;
