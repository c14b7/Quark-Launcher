import { Client, Databases, Query, ID } from 'node-appwrite';
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
import { validateFriendCode, normalizeFriendCode, validatePresence, validateCustomStatus } from './lib/validators';
import { sortUserIds } from './lib/friend-code';
import { toPublicProfile, getProfileByUserId } from './auth-api';
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
    Query.limit(50),
  ]);
  return docs.documents.some((d) => {
    const ids = d.userIds as string[];
    return ids.includes(a) && ids.includes(b);
  });
}

async function hasPendingRequest(databases: Databases, fromId: string, toId: string): Promise<boolean> {
  const docs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.friendRequests, [
    Query.equal('fromUserId', fromId),
    Query.equal('toUserId', toId),
    Query.equal('status', 'pending'),
    Query.limit(1),
  ]);
  return docs.documents.length > 0;
}

export async function handleFriendsApiRequest(
  req: FunctionRequest,
  res: FunctionResponse,
  logger: Logger = noopLogger
) {
  const method = (req.method || 'POST').toUpperCase();
  let rawBody: Record<string, unknown> = {};
  try {
    rawBody = method === 'GET' ? {} : parseBody(req);
  } catch (err) {
    logger.error(`parseBody failed: ${err}`);
    rawBody = {};
  }
  const path = resolveRoutePath(req, rawBody);
  const body = stripRouteMeta(rawBody);
  const userId = await verifyAuth(req);
  const databases = getDatabases();

  logger.log(`Friends ${method} ${path} user=${userId || 'none'}`);

  if (!requireAuth(res, userId)) return;

  try {
    // POST /friends/lookup
    if (path === '/friends/lookup' && method === 'POST') {
      const rate = await checkRateLimit('friends/lookup', userId);
      if (!rate.allowed) return errorResponse(res, rate.code || 'RATE_LIMITED', 'Too many lookups', 429);

      const code = normalizeFriendCode(String(body.code || ''));
      const err = validateFriendCode(code);
      if (err) return errorResponse(res, err, 'Invalid friend code');

      const docs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.userProfiles, [
        Query.equal('friendCode', code),
        Query.limit(1),
      ]);

      if (docs.documents.length === 0) {
        return errorResponse(res, 'USER_NOT_FOUND', 'No user found with this code', 404);
      }

      const target = docs.documents[0] as Record<string, unknown>;
      if (target.userId === userId) {
        return errorResponse(res, 'CANNOT_ADD_SELF', 'Cannot add yourself');
      }

      return jsonResponse(res, {
        success: true,
        profile: toPublicProfile(target),
      });
    }

    // POST /friends/request
    if (path === '/friends/request' && method === 'POST') {
      const code = normalizeFriendCode(String(body.code || ''));
      const err = validateFriendCode(code);
      if (err) return errorResponse(res, err, 'Invalid friend code');

      const myProfile = await getProfileByUserId(databases, userId);
      if (myProfile && myProfile.emailVerified === false) {
        return errorResponse(res, 'EMAIL_NOT_VERIFIED', 'Verify your email before adding friends', 403);
      }

      const docs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.userProfiles, [
        Query.equal('friendCode', code),
        Query.limit(1),
      ]);
      if (docs.documents.length === 0) {
        return errorResponse(res, 'USER_NOT_FOUND', 'No user found with this code', 404);
      }

      const target = docs.documents[0] as Record<string, unknown>;
      const toUserId = target.userId as string;

      if (toUserId === userId) return errorResponse(res, 'CANNOT_ADD_SELF', 'Cannot add yourself');
      if (await areFriends(databases, userId, toUserId)) {
        return errorResponse(res, 'ALREADY_FRIENDS', 'Already friends');
      }
      if (await hasPendingRequest(databases, userId, toUserId)) {
        return errorResponse(res, 'REQUEST_EXISTS', 'Request already sent');
      }

      const reversePending = await databases.listDocuments(DATABASE_ID, COLLECTIONS.friendRequests, [
        Query.equal('fromUserId', toUserId),
        Query.equal('toUserId', userId),
        Query.equal('status', 'pending'),
        Query.limit(1),
      ]);

      if (reversePending.documents.length > 0) {
        const reqDoc = reversePending.documents[0];
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.friendRequests, reqDoc.$id, {
          status: 'accepted',
          respondedAt: new Date().toISOString(),
        });
        const [a, b] = sortUserIds(userId, toUserId);
        await databases.createDocument(DATABASE_ID, COLLECTIONS.friendships, ID.unique(), {
          userIds: [a, b],
          createdAt: new Date().toISOString(),
        });
        return jsonResponse(res, { success: true, autoAccepted: true });
      }

      const request = await databases.createDocument(DATABASE_ID, COLLECTIONS.friendRequests, ID.unique(), {
        fromUserId: userId,
        toUserId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      return jsonResponse(res, { success: true, requestId: request.$id });
    }

    // GET /friends/requests
    if (path === '/friends/requests' && method === 'GET') {
      const [incoming, outgoing] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.friendRequests, [
          Query.equal('toUserId', userId),
          Query.equal('status', 'pending'),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.friendRequests, [
          Query.equal('fromUserId', userId),
          Query.equal('status', 'pending'),
        ]),
      ]);

      const enrich = async (docs: typeof incoming.documents, type: 'incoming' | 'outgoing') => {
        return Promise.all(
          docs.map(async (doc) => {
            const otherId = type === 'incoming' ? doc.fromUserId : doc.toUserId;
            const profile = await getProfileByUserId(databases, otherId as string);
            return {
              id: doc.$id,
              fromUserId: doc.fromUserId,
              toUserId: doc.toUserId,
              status: doc.status,
              createdAt: doc.createdAt,
              profile: profile ? toPublicProfile(profile as Record<string, unknown>) : null,
            };
          })
        );
      };

      return jsonResponse(res, {
        success: true,
        incoming: await enrich(incoming.documents, 'incoming'),
        outgoing: await enrich(outgoing.documents, 'outgoing'),
      });
    }

    // POST /friends/requests/:id/accept
    const acceptMatch = path.match(/^\/friends\/requests\/([^/]+)\/accept$/);
    if (acceptMatch && method === 'POST') {
      const requestId = acceptMatch[1];
      const request = await databases.getDocument(DATABASE_ID, COLLECTIONS.friendRequests, requestId);
      if (request.toUserId !== userId) return errorResponse(res, 'FORBIDDEN', 'Not your request', 403);
      if (request.status !== 'pending') return errorResponse(res, 'INVALID_STATUS', 'Request not pending');

      await databases.updateDocument(DATABASE_ID, COLLECTIONS.friendRequests, requestId, {
        status: 'accepted',
        respondedAt: new Date().toISOString(),
      });

      const [a, b] = sortUserIds(request.fromUserId as string, request.toUserId as string);
      await databases.createDocument(DATABASE_ID, COLLECTIONS.friendships, ID.unique(), {
        userIds: [a, b],
        createdAt: new Date().toISOString(),
      });

      return jsonResponse(res, { success: true });
    }

    // POST /friends/requests/:id/decline
    const declineMatch = path.match(/^\/friends\/requests\/([^/]+)\/decline$/);
    if (declineMatch && method === 'POST') {
      const requestId = declineMatch[1];
      const request = await databases.getDocument(DATABASE_ID, COLLECTIONS.friendRequests, requestId);
      if (request.toUserId !== userId) return errorResponse(res, 'FORBIDDEN', 'Not your request', 403);

      await databases.updateDocument(DATABASE_ID, COLLECTIONS.friendRequests, requestId, {
        status: 'declined',
        respondedAt: new Date().toISOString(),
      });
      return jsonResponse(res, { success: true });
    }

    // DELETE /friends/requests/:id
    const cancelMatch = path.match(/^\/friends\/requests\/([^/]+)$/);
    if (cancelMatch && method === 'DELETE') {
      const requestId = cancelMatch[1];
      const request = await databases.getDocument(DATABASE_ID, COLLECTIONS.friendRequests, requestId);
      if (request.fromUserId !== userId) return errorResponse(res, 'FORBIDDEN', 'Not your request', 403);

      await databases.updateDocument(DATABASE_ID, COLLECTIONS.friendRequests, requestId, {
        status: 'cancelled',
        respondedAt: new Date().toISOString(),
      });
      return jsonResponse(res, { success: true });
    }

    // GET /friends
    if (path === '/friends' && method === 'GET') {
      const friendships = await databases.listDocuments(DATABASE_ID, COLLECTIONS.friendships, [
        Query.contains('userIds', [userId]),
      ]);

      const friendIds = friendships.documents
        .map((f) => (f.userIds as string[]).find((id) => id !== userId))
        .filter(Boolean) as string[];

      const friends = await Promise.all(
        friendIds.map(async (fid) => {
          const profile = await getProfileByUserId(databases, fid);
          return profile ? toPublicProfile(profile as Record<string, unknown>) : null;
        })
      );

      return jsonResponse(res, {
        success: true,
        friends: friends.filter(Boolean),
      });
    }

    // DELETE /friends/:userId
    const unfriendMatch = path.match(/^\/friends\/([^/]+)$/);
    if (unfriendMatch && method === 'DELETE') {
      const friendUserId = unfriendMatch[1];
      const friendships = await databases.listDocuments(DATABASE_ID, COLLECTIONS.friendships, [
        Query.contains('userIds', [userId]),
      ]);

      const friendship = friendships.documents.find((f) => {
        const ids = f.userIds as string[];
        return ids.includes(userId) && ids.includes(friendUserId);
      });

      if (!friendship) return errorResponse(res, 'NOT_FOUND', 'Friendship not found', 404);
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.friendships, friendship.$id);
      return jsonResponse(res, { success: true });
    }

    // POST /friends/presence
    if (path === '/friends/presence' && method === 'POST') {
      const presence = String(body.presence || 'online');
      const err = validatePresence(presence);
      if (err) return errorResponse(res, err, 'Invalid presence');

      const updates: Record<string, unknown> = {
        presence,
        lastSeen: new Date().toISOString(),
      };

      if (body.customStatus !== undefined) {
        const statusErr = validateCustomStatus(String(body.customStatus));
        if (statusErr) return errorResponse(res, statusErr, 'Invalid custom status');
        updates.customStatus = body.customStatus;
      }

      await databases.updateDocument(DATABASE_ID, COLLECTIONS.userProfiles, userId, updates);
      return jsonResponse(res, { success: true });
    }

    return errorResponse(res, 'NOT_FOUND', 'Friends endpoint not found', 404);
  } catch (error) {
    logger.error(`Friends API error: ${formatError(error)}`);
    return errorResponse(res, 'INTERNAL_ERROR', 'Request failed', 500);
  }
}
