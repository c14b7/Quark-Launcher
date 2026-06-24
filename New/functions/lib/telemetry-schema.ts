import { Client, Databases } from 'node-appwrite';
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, DATABASE_ID, COLLECTIONS } from './config';

const REQUIRED_ATTRS: Record<string, string[]> = {
  [COLLECTIONS.telemetryEvents]: ['installationId', 'sessionId', 'name', 'category', 'timestamp', 'properties'],
  [COLLECTIONS.telemetryLogs]: ['installationId', 'sessionId', 'level', 'message', 'details', 'timestamp'],
  [COLLECTIONS.telemetrySessions]: ['installationId', 'startedAt'],
  [COLLECTIONS.telemetryInstallations]: ['firstSeenAt', 'lastSeenAt'],
};

export async function getTelemetrySchemaStatus(): Promise<{
  ok: boolean;
  missing: Record<string, string[]>;
}> {
  const missing: Record<string, string[]> = {};

  try {
    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);
    const databases = new Databases(client);

    for (const [collectionId, required] of Object.entries(REQUIRED_ATTRS)) {
      try {
        const col = await databases.getCollection(DATABASE_ID, collectionId);
        const attrs = (col.attributes || []) as unknown as Array<{ key: string; status: string }>;
        const available = new Set(
          attrs.filter((a) => a.status === 'available').map((a) => a.key)
        );
        const notReady = required.filter((k) => !available.has(k));
        if (notReady.length) missing[collectionId] = notReady;
      } catch {
        missing[collectionId] = required;
      }
    }
  } catch {
    return { ok: false, missing: { error: ['database_unreachable'] } };
  }

  return { ok: Object.keys(missing).length === 0, missing };
}

export function isUnknownAttributeError(err: unknown): boolean {
  const e = err as { type?: string; message?: string; code?: number };
  const msg = String(e.message || '').toLowerCase();
  return (
    e.type === 'attribute_unknown' ||
    msg.includes('unknown attribute') ||
    msg.includes('invalid document structure')
  );
}
