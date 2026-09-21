/**
 * El backend del agente IA devuelve texto plano tipo Markdown (líneas con
 * "- Campo: valor | Campo: valor", estados como APPROVED/PENDING, etc.).
 * Este parser lo convierte en un modelo de datos simple para que la plantilla
 * lo pinte como filas con etiqueta/valor y badges de estado —replicando el
 * look de "tarjeta" del mockup de referencia— sin recurrir a innerHTML.
 */

export type BadgeTone = 'success' | 'warning' | 'danger';

export interface MessageField {
  label: string | null;
  value: string;
  badgeTone: BadgeTone | null;
  /** Es el dato identificador de la fila (ej. nombre del participante):
   * se resalta como encabezado en vez de como par etiqueta/valor. */
  isTitle: boolean;
  /** Valores largos (rangos de fecha/hora, etc.) ocupan su propia línea
   * dentro de la tarjeta en vez de competir por espacio con otros campos. */
  wide: boolean;
}

export interface MessageLine {
  kind: 'bullet' | 'stat' | 'text';
  fields: MessageField[];
}

/** Enlace de descarga de un reporte (ver wd_exportar_reporte_pdf/excel en el
 * backend del agente): se extrae del texto de la respuesta para pintarlo
 * como botón en vez de como URL cruda -- ver ChatWidgetComponent.download(). */
export interface DownloadLink {
  url: string;
  format: 'pdf' | 'excel';
  eventId: number | null;
}

export interface ParsedMessage {
  lines: MessageLine[];
  downloads: DownloadLink[];
}

const STATUS_TONES: Record<string, BadgeTone> = {
  approved: 'success',
  aprobado: 'success',
  aprobada: 'success',
  activo: 'success',
  active: 'success',
  pending: 'warning',
  pendiente: 'warning',
  rejected: 'danger',
  rechazado: 'danger',
  rechazada: 'danger',
  cancelled: 'danger',
  cancelado: 'danger',
  cancelada: 'danger'
};

// Etiquetas cuyo valor identifica a la persona/registro (el dato que el
// mockup de referencia destaca en negrita como encabezado de la tarjeta).
const TITLE_LABELS = new Set(['participante', 'nombre', 'bailarín', 'bailarin']);

const WIDE_VALUE_THRESHOLD = 18;

function toneFor(value: string): BadgeTone | null {
  return STATUS_TONES[value.trim().toLowerCase()] ?? null;
}

function parseField(raw: string): MessageField {
  const text = raw.trim();
  const separatorIndex = text.indexOf(':');
  const afterSeparator = text.slice(separatorIndex + 1, separatorIndex + 3);

  // Evita cortar por los ":" de una hora (15:52:52) o de una URL (https://...)
  // tratándolo como si no tuviera etiqueta cuando lo que precede al primer
  // ":" es demasiado largo para ser una etiqueta razonable, o cuando el ":"
  // es el de un esquema de URL.
  if (separatorIndex > 0 && separatorIndex < 40 && afterSeparator !== '//') {
    const label = text.slice(0, separatorIndex).trim();
    const value = text.slice(separatorIndex + 1).trim();
    if (label && value) {
      return { label, value, badgeTone: toneFor(value), isTitle: false, wide: value.length > WIDE_VALUE_THRESHOLD };
    }
  }

  return { label: null, value: text, badgeTone: toneFor(text), isTitle: false, wide: text.length > WIDE_VALUE_THRESHOLD };
}

/** Elige, dentro de una tarjeta, qué campo actúa como su encabezado: el
 * nombre del participante si aparece, o si no el primer valor sin etiqueta
 * ni badge (ej. el nombre de un evento). Muta el campo elegido in place. */
function markTitleField(fields: MessageField[]): void {
  const named = fields.find(f => f.label && TITLE_LABELS.has(f.label.toLowerCase()));
  const title = named ?? fields.find(f => !f.label && !f.badgeTone);
  if (title) {
    title.isTitle = true;
  }
}

// URL de descarga de un reporte devuelta por wd_exportar_reporte_pdf/excel,
// ej. ".../api/v1/reports/events/19/export/pdf". Se corta justo después de
// "pdf"/"excel" para no arrastrar puntuación final de la oración.
const DOWNLOAD_URL_RE = /https?:\/\/[^\s<>()]+\/export\/(pdf|excel)/gi;

/** Saca los enlaces de descarga de una línea de texto y devuelve el texto
 * restante (sin la URL) junto con lo encontrado. */
function extractDownloads(rawLine: string): { text: string; downloads: DownloadLink[] } {
  const downloads: DownloadLink[] = [];

  const text = rawLine
    .replace(DOWNLOAD_URL_RE, (match, format: string) => {
      const idMatch = match.match(/\/events\/(\d+)\//);
      downloads.push({
        url: match,
        format: format.toLowerCase() === 'pdf' ? 'pdf' : 'excel',
        eventId: idMatch ? Number(idMatch[1]) : null
      });
      return '';
    })
    .replace(/\s+/g, ' ')
    .trim();

  return { text, downloads };
}

// Reconoce tanto viñetas ("- ", "* ", "• ") como listas numeradas del backend
// ("1. ", "2) "), que son el otro formato que usa para turnos de cronograma.
const BULLET_PREFIX = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/;

// Si tras quitar la URL solo queda una etiqueta colgando (ej. "Enlace de
// descarga:"), no vale la pena mostrarla como línea de texto: el botón de
// descarga ya comunica lo mismo.
function isDanglingLabel(text: string): boolean {
  return text.length === 0 || /[:\-–—]$/.test(text);
}

function parseLine(rawLine: string): MessageLine | null {
  const bulletMatch = rawLine.match(BULLET_PREFIX);
  const isBullet = !!bulletMatch;
  const content = bulletMatch ? bulletMatch[1] : rawLine;

  if (isDanglingLabel(content)) {
    return null;
  }

  const fields = content
    .split('|')
    .map(part => part.trim())
    .filter(Boolean)
    .map(parseField);

  if (fields.length === 0) {
    return null;
  }

  if (isBullet) {
    markTitleField(fields);
    return { kind: 'bullet', fields };
  }

  // Línea suelta tipo "Total de turnos: 4" (una sola etiqueta, sin viñeta):
  // se destaca como fila de estadística en lugar de párrafo plano.
  if (fields.length === 1 && fields[0].label) {
    return { kind: 'stat', fields };
  }

  return {
    kind: 'text',
    fields: [{ label: null, value: content.trim(), badgeTone: null, isTitle: false, wide: false }]
  };
}

export function parseMessageContent(content: string): ParsedMessage {
  const downloads: DownloadLink[] = [];

  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(rawLine => {
      const extracted = extractDownloads(rawLine);
      downloads.push(...extracted.downloads);
      return extracted.text;
    })
    .filter(line => line.length > 0)
    .map(parseLine)
    .filter((line): line is MessageLine => line !== null);

  return { lines, downloads };
}
