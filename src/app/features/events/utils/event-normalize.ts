/**
 * El backend puede variar el casing/nombre de estos campos entre microservicios y endpoints
 * (idEvent/IdEvent, ownerId/OwnerId/organizerId/OrganizerId/userId/UserId) y el pipeline de
 * identidad no usa `number` de forma consistente (JWT decodificado, JSON del backend, caché en
 * localStorage). Estas funciones normalizan la lectura para que las comparaciones de propietario
 * no dependan de un casing o tipo exactos. Mismo criterio ya aplicado en
 * features/streaming/pages/my-streams/my-streams.ts para el mismo DTO.
 */
type RawRecord = Record<string, unknown>;

export function resolveEventId(event: unknown): number | null {
  const raw = event as RawRecord;
  const value = raw?.['idEvent'] ?? raw?.['IdEvent'];
  return value != null ? Number(value) : null;
}

export function resolveEventOwnerId(event: unknown): number | null {
  const raw = event as RawRecord;
  const value =
    raw?.['ownerId'] ?? raw?.['OwnerId'] ??
    raw?.['organizerId'] ?? raw?.['OrganizerId'] ??
    raw?.['userId'] ?? raw?.['UserId'];
  return value != null ? Number(value) : null;
}

export function isSameUser(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  const numA = Number(a);
  const numB = Number(b);
  return !isNaN(numA) && !isNaN(numB) && numA === numB;
}
