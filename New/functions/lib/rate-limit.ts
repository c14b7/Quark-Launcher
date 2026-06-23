import { Client, Databases, ID, Query } from 'node-appwrite';
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, DATABASE_ID, COLLECTIONS } from './config';

interface RateLimitConfig {
  max: number;
  windowMs: number;
}

const LIMITS: Record<string, RateLimitConfig> = {
  register: { max: 3, windowMs: 60 * 60 * 1000 },
  login: { max: 10, windowMs: 15 * 60 * 1000 },
  'friends/lookup': { max: 20, windowMs: 60 * 60 * 1000 },
  'friend-code/regenerate': { max: 1, windowMs: 24 * 60 * 60 * 1000 },
  'profile/patch': { max: 30, windowMs: 60 * 60 * 1000 },
};

function getDatabases(): Databases {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  return new Databases(client);
}

export async function checkRateLimit(action: string, key: string): Promise<{ allowed: boolean; code?: string }> {
  const config = LIMITS[action];
  if (!config) return { allowed: true };

  const databases = getDatabases();
  const rateKey = `${action}:${key}`;
  const now = Date.now();

  try {
    const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.rateLimits, [
      Query.equal('key', rateKey),
      Query.limit(1),
    ]);

    if (existing.documents.length === 0) {
      await databases.createDocument(DATABASE_ID, COLLECTIONS.rateLimits, ID.unique(), {
        key: rateKey,
        count: 1,
        windowStart: new Date(now).toISOString(),
      });
      return { allowed: true };
    }

    const doc = existing.documents[0];
    const windowStart = new Date(doc.windowStart as string).getTime();
    const count = doc.count as number;

    if (now - windowStart > config.windowMs) {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.rateLimits, doc.$id, {
        count: 1,
        windowStart: new Date(now).toISOString(),
      });
      return { allowed: true };
    }

    if (count >= config.max) {
      return { allowed: false, code: 'RATE_LIMITED' };
    }

    await databases.updateDocument(DATABASE_ID, COLLECTIONS.rateLimits, doc.$id, {
      count: count + 1,
    });
    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return { allowed: true };
  }
}

export function getClientIp(req: { headers?: Record<string, string> }): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers?.['x-appwrite-client-ip'] || 'unknown';
}
