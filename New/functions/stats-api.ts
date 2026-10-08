import { Client, Databases, Query, ID, Permission, Role } from 'node-appwrite';
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, DATABASE_ID, COLLECTIONS } from './lib/config';
import {
  parseBody,
  verifyAuth,
  jsonResponse,
  errorResponse,
  requireAuth,
  resolveRoutePath,
  stripRouteMeta,
} from './lib/middleware';
import { checkRateLimit } from './lib/rate-limit';
import { sortUserIds } from './lib/friend-code';
import { formatError } from './lib/runtime';
import type { FunctionRequest, FunctionResponse } from './lib/runtime';

type Logger = { log: (msg: string) => void; error: (msg: string) => void };
const noopLogger: Logger = { log: () => {}, error: console.error };

function getDatabases(): Databases {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  return new Databases(client);
}

async function areFriends(databases: Databases, userId: string, otherId: string): Promise<boolean> {
  const [a, b] = sortUserIds(userId, otherId);
  const docs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.friendships, [
    Query.contains('userIds', [a]),
    Query.limit(80),
  ]);
  return docs.documents.some((d) => {
    const ids = d.userIds as string[];
    return ids.includes(a) && ids.includes(b);
  });
}

function parseSummary(raw: unknown): string {
  if (typeof raw === 'string') {
    if (raw.length > 8000) throw new Error('SUMMARY_TOO_LARGE');
    JSON.parse(raw);
    return raw;
  }
  const str = JSON.stringify(raw ?? {});
  if (str.length > 8000) throw new Error('SUMMARY_TOO_LARGE');
  return str;
}

export async function handleStatsApiRequest(
  req: FunctionRequest,
  res: FunctionResponse,
  log: Logger = noopLogger
) {
  const databases = getDatabases();
  const method = (req.method || 'GET').toUpperCase();
  const path = resolveRoutePath(req);
  const body = parseBody(req);
  stripRouteMeta(body);

  try {
    const auth = await verifyAuth(req);
    const userId = auth.userId;

    // PUT /stats/summary
    if (path === '/stats/summary' && method === 'PUT') {
      if (!requireAuth(res, userId)) return;
      const rate = await checkRateLimit('stats/summary', userId!);
      if (!rate.allowed) return errorResponse(res, rate.code || 'RATE_LIMITED', 'Too many syncs', 429);

      const visibility = String(body.visibility || 'friends') === 'private' ? 'private' : 'friends';
      let summaryJson: string;
      try {
        summaryJson = parseSummary(body.summary);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'INVALID_SUMMARY';
        return errorResponse(res, msg === 'SUMMARY_TOO_LARGE' ? 'SUMMARY_TOO_LARGE' : 'INVALID_SUMMARY', 'Invalid summary');
      }

      const now = new Date().toISOString();
      try {
        await databases.getDocument(DATABASE_ID, COLLECTIONS.userPlayStats, userId!);
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.userPlayStats, userId!, {
          userId,
          visibility,
          summaryJson,
          updatedAt: now,
        });
      } catch {
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.userPlayStats,
          userId!,
          {
            userId,
            visibility,
            summaryJson,
            updatedAt: now,
          },
          [
            Permission.read(Role.users()),
            Permission.update(Role.user(userId!)),
            Permission.delete(Role.user(userId!)),
          ]
        );
      }

      return jsonResponse(res, { success: true, visibility, updatedAt: now });
    }

    // GET /stats/me
    if (path === '/stats/me' && method === 'GET') {
      if (!requireAuth(res, userId)) return;
      try {
        const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.userPlayStats, userId!);
        let summary = null;
        try {
          summary = JSON.parse(String(doc.summaryJson || '{}'));
        } catch {
          summary = null;
        }
        return jsonResponse(res, {
          success: true,
          visibility: doc.visibility || 'friends',
          summary,
          updatedAt: doc.updatedAt || null,
        });
      } catch {
        return jsonResponse(res, { success: true, visibility: 'friends', summary: null });
      }
    }

    // PATCH /stats/visibility
    if (path === '/stats/visibility' && method === 'PATCH') {
      if (!requireAuth(res, userId)) return;
      const visibility = String(body.visibility || 'friends') === 'private' ? 'private' : 'friends';
      const now = new Date().toISOString();
      try {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.userPlayStats, userId!, {
          visibility,
          updatedAt: now,
        });
      } catch {
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.userPlayStats,
          userId!,
          {
            userId,
            visibility,
            summaryJson: '{}',
            updatedAt: now,
          },
          [
            Permission.read(Role.users()),
            Permission.update(Role.user(userId!)),
            Permission.delete(Role.user(userId!)),
          ]
        );
      }
      return jsonResponse(res, { success: true, visibility });
    }

    // GET /stats/:userId
    const match = path.match(/^\/stats\/([^/]+)$/);
    if (match && method === 'GET') {
      if (!requireAuth(res, userId)) return;
      const targetId = decodeURIComponent(match[1]);
      if (targetId === userId) {
        // redirect semantics to /me
        try {
          const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.userPlayStats, userId!);
          return jsonResponse(res, {
            success: true,
            visibility: doc.visibility || 'friends',
            summary: JSON.parse(String(doc.summaryJson || '{}')),
          });
        } catch {
          return jsonResponse(res, { success: true, visibility: 'friends', summary: null });
        }
      }

      const friends = await areFriends(databases, userId!, targetId);
      if (!friends) return errorResponse(res, 'NOT_FRIENDS', 'Not friends', 403);

      try {
        const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.userPlayStats, targetId);
        if (String(doc.visibility || 'friends') === 'private') {
          return errorResponse(res, 'STATS_PRIVATE', 'Stats are private', 403);
        }
        let summary = null;
        try {
          summary = JSON.parse(String(doc.summaryJson || '{}'));
        } catch {
          summary = null;
        }
        return jsonResponse(res, { success: true, summary, updatedAt: doc.updatedAt || null });
      } catch {
        return jsonResponse(res, { success: true, summary: null });
      }
    }

    return errorResponse(res, 'NOT_FOUND', `Unknown stats route: ${path}`, 404);
  } catch (err) {
    log.error(`stats-api error: ${formatError(err)}`);
    return errorResponse(res, 'INTERNAL_ERROR', 'Stats API failed', 500);
  }
}
