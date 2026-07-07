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
import { buildDmKey, MESSAGE_TYPES } from './lib/chat-schema';
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

function readPermissionsForMembers(memberIds: string[]) {
  return memberIds.flatMap((id) => [Permission.read(Role.user(id))]);
}

async function getMemberRecord(databases: Databases, conversationId: string, userId: string) {
  const docs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.conversationMembers, [
    Query.equal('conversationId', conversationId),
    Query.equal('userId', userId),
    Query.limit(1),
  ]);
  return docs.documents[0] as Record<string, unknown> | undefined;
}

async function requireMembership(
  databases: Databases,
  conversationId: string,
  userId: string
): Promise<Record<string, unknown> | null> {
  const member = await getMemberRecord(databases, conversationId, userId);
  return member || null;
}

async function createMemberRecords(
  databases: Databases,
  conversationId: string,
  memberIds: string[],
  ownerId: string
) {
  const now = new Date().toISOString();
  for (const memberId of memberIds) {
    const role = memberId === ownerId ? 'owner' : 'member';
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.conversationMembers,
      ID.unique(),
      {
        conversationId,
        userId: memberId,
        role,
        joinedAt: now,
        notifications: 'all',
        pinned: false,
      }
    );
  }
}

function formatConversation(
  conv: Record<string, unknown>,
  member: Record<string, unknown> | undefined,
  otherProfiles: Record<string, unknown>[]
) {
  const memberIds = (conv.memberIds as string[]) || [];
  const type = conv.type as string;
  let title = (conv.name as string) || '';
  if (type === 'dm' && otherProfiles.length > 0) {
    title = (otherProfiles[0].displayName as string) || 'Znajomy';
  }
  return {
    id: conv.$id,
    type,
    name: title,
    avatarFileId: conv.avatarFileId || null,
    ownerId: conv.ownerId || null,
    memberIds,
    members: otherProfiles.map((p) => toPublicProfile(p)),
    lastMessageAt: conv.lastMessageAt || null,
    lastMessagePreview: conv.lastMessagePreview || '',
    lastMessageSenderId: conv.lastMessageSenderId || null,
    settings: conv.settings ? JSON.parse(String(conv.settings)) : {},
    pinnedMessageIds: conv.pinnedMessageIds || [],
    createdAt: conv.createdAt,
    unread: member ? computeUnread(conv, member) : false,
    lastReadAt: member?.lastReadAt || null,
    notifications: member?.notifications || 'all',
    pinned: member?.pinned || false,
  };
}

function computeUnread(conv: Record<string, unknown>, member: Record<string, unknown>): boolean {
  const lastAt = conv.lastMessageAt as string | undefined;
  const readAt = member.lastReadAt as string | undefined;
  if (!lastAt) return false;
  if (!readAt) return true;
  return new Date(lastAt).getTime() > new Date(readAt).getTime();
}

function formatMessage(doc: Record<string, unknown>) {
  return {
    id: doc.$id,
    conversationId: doc.conversationId,
    senderId: doc.senderId,
    type: doc.type,
    body: doc.deletedAt ? '' : doc.body,
    attachments: doc.attachments ? JSON.parse(String(doc.attachments)) : null,
    replyToId: doc.replyToId || null,
    editedAt: doc.editedAt || null,
    deletedAt: doc.deletedAt || null,
    createdAt: doc.createdAt,
  };
}

function previewForMessage(type: string, body: string, attachments?: string): string {
  if (type === 'text') return body.slice(0, 200);
  if (type === 'game_share') return '🎮 Udostępniono grę';
  if (type === 'achievement_share') return '🏆 Udostępniono osiągnięcie';
  if (type === 'store_deal') return '💰 Udostępniono okazję';
  if (type === 'party_invite') return '🎉 Zaproszenie do gry';
  if (type === 'lfg') return '🔍 Szukam grupy (LFG)';
  if (type === 'system') return body.slice(0, 200);
  try {
    const att = attachments ? JSON.parse(attachments) : null;
    if (att?.name) return String(att.name).slice(0, 200);
  } catch {
    /* ignore */
  }
  return 'Wiadomość';
}

export async function handleChatApiRequest(
  req: FunctionRequest,
  res: FunctionResponse,
  logger: Logger = noopLogger
) {
  const method = (req.method || 'POST').toUpperCase();
  let rawBody: Record<string, unknown> = {};
  try {
    rawBody = method === 'GET' ? {} : parseBody(req);
  } catch {
    rawBody = {};
  }
  const path = resolveRoutePath(req, rawBody);
  const body = stripRouteMeta(rawBody);
  const userId = await verifyAuth(req);
  const databases = getDatabases();

  logger.log(`Chat ${method} ${path} user=${userId || 'none'}`);
  if (!requireAuth(res, userId)) return;

  try {
    // GET /chat/conversations
    if (path === '/chat/conversations' && method === 'GET') {
      const memberships = await databases.listDocuments(DATABASE_ID, COLLECTIONS.conversationMembers, [
        Query.equal('userId', userId),
        Query.limit(100),
      ]);

      const conversations = [];
      for (const m of memberships.documents) {
        const convId = m.conversationId as string;
        try {
          const conv = await databases.getDocument(DATABASE_ID, COLLECTIONS.conversations, convId);
          const memberIds = (conv.memberIds as string[]) || [];
          const others = memberIds.filter((id) => id !== userId);
          const profiles = [];
          for (const oid of others.slice(0, 8)) {
            const p = await getProfileByUserId(databases, oid);
            if (p) profiles.push(p);
          }
          conversations.push(formatConversation(conv as Record<string, unknown>, m as Record<string, unknown>, profiles));
        } catch {
          /* skip missing */
        }
      }

      conversations.sort((a, b) => {
        const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return tb - ta;
      });

      return jsonResponse(res, { success: true, conversations });
    }

    // POST /chat/conversations/dm
    if (path === '/chat/conversations/dm' && method === 'POST') {
      const targetUserId = String(body.userId || '');
      if (!targetUserId) return errorResponse(res, 'INVALID_INPUT', 'userId required');
      if (targetUserId === userId) return errorResponse(res, 'INVALID_INPUT', 'Cannot DM yourself');
      if (!(await areFriends(databases, userId, targetUserId))) {
        return errorResponse(res, 'NOT_FRIENDS', 'You can only message friends', 403);
      }

      const dmKey = buildDmKey(userId, targetUserId);
      const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.conversations, [
        Query.equal('dmKey', dmKey),
        Query.limit(1),
      ]);
      if (existing.documents.length > 0) {
        const conv = existing.documents[0] as Record<string, unknown>;
        const profile = await getProfileByUserId(databases, targetUserId);
        const member = await getMemberRecord(databases, conv.$id as string, userId);
        return jsonResponse(res, {
          success: true,
          conversation: formatConversation(conv, member, profile ? [profile] : []),
        });
      }

      const memberIds = sortUserIds(userId, targetUserId);
      const now = new Date().toISOString();
      const conv = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.conversations,
        ID.unique(),
        {
          type: 'dm',
          memberIds,
          dmKey,
          createdAt: now,
          settings: '{}',
        }
      );
      await createMemberRecords(databases, conv.$id, memberIds, userId);
      const profile = await getProfileByUserId(databases, targetUserId);
      const member = await getMemberRecord(databases, conv.$id, userId);
      return jsonResponse(res, {
        success: true,
        conversation: formatConversation(conv as Record<string, unknown>, member, profile ? [profile] : []),
      });
    }

    // POST /chat/conversations/group
    if (path === '/chat/conversations/group' && method === 'POST') {
      const name = String(body.name || '').trim().slice(0, 128);
      const rawMembers = Array.isArray(body.memberIds) ? (body.memberIds as string[]) : [];
      if (!name) return errorResponse(res, 'INVALID_INPUT', 'Group name required');
      const memberSet = new Set([userId, ...rawMembers.filter((id) => typeof id === 'string' && id !== userId)]);
      const memberIds = [...memberSet];
      if (memberIds.length < 2) return errorResponse(res, 'INVALID_INPUT', 'At least 2 members required');
      if (memberIds.length > 20) return errorResponse(res, 'INVALID_INPUT', 'Max 20 members');

      for (const mid of memberIds) {
        if (mid === userId) continue;
        if (!(await areFriends(databases, userId, mid))) {
          return errorResponse(res, 'NOT_FRIENDS', `Not friends with ${mid}`, 403);
        }
      }

      const now = new Date().toISOString();
      const conv = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.conversations,
        ID.unique(),
        {
          type: 'group',
          name,
          ownerId: userId,
          memberIds,
          createdAt: now,
          settings: JSON.stringify({ whoCanInvite: 'admins' }),
        }
      );
      await createMemberRecords(databases, conv.$id, memberIds, userId);

      const profiles = [];
      for (const mid of memberIds.filter((id) => id !== userId).slice(0, 8)) {
        const p = await getProfileByUserId(databases, mid);
        if (p) profiles.push(p);
      }
      const member = await getMemberRecord(databases, conv.$id, userId);
      return jsonResponse(res, {
        success: true,
        conversation: formatConversation(conv as Record<string, unknown>, member, profiles),
      });
    }

    // PATCH /chat/conversations/:id
    const patchConvMatch = path.match(/^\/chat\/conversations\/([^/]+)$/);
    if (patchConvMatch && method === 'PATCH') {
      const convId = patchConvMatch[1];
      const conv = await databases.getDocument(DATABASE_ID, COLLECTIONS.conversations, convId);
      const member = await requireMembership(databases, convId, userId);
      if (!member) return errorResponse(res, 'FORBIDDEN', 'Not a member', 403);
      if (conv.type !== 'group') return errorResponse(res, 'INVALID', 'Only groups can be edited');
      if (member.role !== 'owner' && member.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', 'Admin only', 403);
      }
      const updates: Record<string, unknown> = {};
      if (body.name) updates.name = String(body.name).trim().slice(0, 128);
      if (body.avatarFileId !== undefined) updates.avatarFileId = body.avatarFileId;
      const updated = await databases.updateDocument(DATABASE_ID, COLLECTIONS.conversations, convId, updates);
      return jsonResponse(res, { success: true, conversation: formatConversation(updated as Record<string, unknown>, member, []) });
    }

    // POST /chat/conversations/:id/members
    const addMemberMatch = path.match(/^\/chat\/conversations\/([^/]+)\/members$/);
    if (addMemberMatch && method === 'POST') {
      const convId = addMemberMatch[1];
      const conv = await databases.getDocument(DATABASE_ID, COLLECTIONS.conversations, convId);
      const member = await requireMembership(databases, convId, userId);
      if (!member) return errorResponse(res, 'FORBIDDEN', 'Not a member', 403);
      const newUserId = String(body.userId || '');
      if (!newUserId) return errorResponse(res, 'INVALID_INPUT', 'userId required');
      const memberIds = (conv.memberIds as string[]) || [];
      if (memberIds.includes(newUserId)) return errorResponse(res, 'ALREADY_MEMBER', 'Already in group');
      if (!(await areFriends(databases, userId, newUserId))) {
        return errorResponse(res, 'NOT_FRIENDS', 'Can only add friends', 403);
      }
      const now = new Date().toISOString();
      await databases.createDocument(DATABASE_ID, COLLECTIONS.conversationMembers, ID.unique(), {
        conversationId: convId,
        userId: newUserId,
        role: 'member',
        joinedAt: now,
        notifications: 'all',
        pinned: false,
      });
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.conversations, convId, {
        memberIds: [...memberIds, newUserId],
      });
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.messages,
        ID.unique(),
        {
          conversationId: convId,
          senderId: userId,
          type: 'system',
          body: `Użytkownik dołączył do grupy`,
          createdAt: now,
        },
        readPermissionsForMembers([...memberIds, newUserId])
      );
      return jsonResponse(res, { success: true });
    }

    // DELETE /chat/conversations/:id/members/:userId
    const removeMemberMatch = path.match(/^\/chat\/conversations\/([^/]+)\/members\/([^/]+)$/);
    if (removeMemberMatch && method === 'DELETE') {
      const convId = removeMemberMatch[1];
      const targetId = removeMemberMatch[2];
      const conv = await databases.getDocument(DATABASE_ID, COLLECTIONS.conversations, convId);
      const member = await requireMembership(databases, convId, userId);
      if (!member) return errorResponse(res, 'FORBIDDEN', 'Not a member', 403);
      const memberIds = (conv.memberIds as string[]) || [];
      const isSelf = targetId === userId;
      if (!isSelf && member.role !== 'owner' && member.role !== 'admin') {
        return errorResponse(res, 'FORBIDDEN', 'Cannot remove others', 403);
      }
      const memDocs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.conversationMembers, [
        Query.equal('conversationId', convId),
        Query.equal('userId', targetId),
        Query.limit(1),
      ]);
      if (memDocs.documents.length > 0) {
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.conversationMembers, memDocs.documents[0].$id);
      }
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.conversations, convId, {
        memberIds: memberIds.filter((id) => id !== targetId),
      });
      return jsonResponse(res, { success: true });
    }

    // GET /chat/conversations/:id/messages
    const getMessagesMatch = path.match(/^\/chat\/conversations\/([^/]+)\/messages$/);
    if (getMessagesMatch && method === 'GET') {
      const convId = getMessagesMatch[1];
      if (!(await requireMembership(databases, convId, userId))) {
        return errorResponse(res, 'FORBIDDEN', 'Not a member', 403);
      }
      const cursor = String(body.cursor || rawBody.cursor || '');
      const queries = [
        Query.equal('conversationId', convId),
        Query.orderDesc('createdAt'),
        Query.limit(50),
      ];
      if (cursor) queries.push(Query.cursorAfter(cursor));

      const docs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.messages, queries);
      const messages = docs.documents.map((d) => formatMessage(d as Record<string, unknown>)).reverse();
      return jsonResponse(res, {
        success: true,
        messages,
        nextCursor: docs.documents.length ? docs.documents[docs.documents.length - 1].$id : null,
      });
    }

    // POST /chat/conversations/:id/messages
    const postMessageMatch = path.match(/^\/chat\/conversations\/([^/]+)\/messages$/);
    if (postMessageMatch && method === 'POST') {
      const convId = postMessageMatch[1];
      const rate = await checkRateLimit('chat/send', userId);
      if (!rate.allowed) return errorResponse(res, rate.code || 'RATE_LIMITED', 'Too many messages', 429);

      const conv = await databases.getDocument(DATABASE_ID, COLLECTIONS.conversations, convId);
      const member = await requireMembership(databases, convId, userId);
      if (!member) return errorResponse(res, 'FORBIDDEN', 'Not a member', 403);

      const type = String(body.type || 'text');
      if (!MESSAGE_TYPES.includes(type as (typeof MESSAGE_TYPES)[number])) {
        return errorResponse(res, 'INVALID_TYPE', 'Invalid message type');
      }
      const textBody = String(body.body || '').slice(0, 4000);
      const attachments = body.attachments ? JSON.stringify(body.attachments) : undefined;
      if (type === 'text' && !textBody.trim()) {
        return errorResponse(res, 'INVALID_INPUT', 'Message body required');
      }

      const now = new Date().toISOString();
      const memberIds = (conv.memberIds as string[]) || [];
      const msg = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.messages,
        ID.unique(),
        {
          conversationId: convId,
          senderId: userId,
          type,
          body: textBody || previewForMessage(type, '', attachments),
          attachments,
          replyToId: body.replyToId ? String(body.replyToId) : undefined,
          createdAt: now,
        },
        readPermissionsForMembers(memberIds)
      );

      const preview = previewForMessage(type, textBody, attachments);
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.conversations, convId, {
        lastMessageAt: now,
        lastMessagePreview: preview,
        lastMessageSenderId: userId,
      });

      await databases.updateDocument(DATABASE_ID, COLLECTIONS.conversationMembers, member.$id as string, {
        lastReadAt: now,
        lastReadMessageId: msg.$id,
      });

      return jsonResponse(res, { success: true, message: formatMessage(msg as Record<string, unknown>) });
    }

    // POST /chat/conversations/:id/read
    const readMatch = path.match(/^\/chat\/conversations\/([^/]+)\/read$/);
    if (readMatch && method === 'POST') {
      const convId = readMatch[1];
      const member = await requireMembership(databases, convId, userId);
      if (!member) return errorResponse(res, 'FORBIDDEN', 'Not a member', 403);
      const now = new Date().toISOString();
      const updates: Record<string, unknown> = { lastReadAt: now };
      if (body.messageId) updates.lastReadMessageId = String(body.messageId);
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.conversationMembers, member.$id as string, updates);
      return jsonResponse(res, { success: true });
    }

    // POST /chat/conversations/:id/typing
    const typingMatch = path.match(/^\/chat\/conversations\/([^/]+)\/typing$/);
    if (typingMatch && method === 'POST') {
      const convId = typingMatch[1];
      if (!(await requireMembership(databases, convId, userId))) {
        return errorResponse(res, 'FORBIDDEN', 'Not a member', 403);
      }
      const key = `typing:${convId}:${userId}`;
      const now = new Date().toISOString();
      const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.rateLimits, [
        Query.equal('key', key),
        Query.limit(1),
      ]);
      if (existing.documents.length > 0) {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.rateLimits, existing.documents[0].$id, {
          count: 1,
          windowStart: now,
        });
      } else {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.rateLimits, ID.unique(), {
          key,
          count: 1,
          windowStart: now,
        });
      }
      return jsonResponse(res, { success: true, typing: true, userId, conversationId: convId });
    }

    // GET /chat/conversations/:id/typing
    if (typingMatch && method === 'GET') {
      const convId = typingMatch[1];
      if (!(await requireMembership(databases, convId, userId))) {
        return errorResponse(res, 'FORBIDDEN', 'Not a member', 403);
      }
      const prefix = `typing:${convId}:`;
      const docs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.rateLimits, [
        Query.startsWith('key', prefix),
        Query.limit(20),
      ]);
      const cutoff = Date.now() - 5000;
      const typingUsers = docs.documents
        .filter((d) => {
          const ws = new Date(d.windowStart as string).getTime();
          return ws >= cutoff && !String(d.key).endsWith(userId);
        })
        .map((d) => String(d.key).replace(prefix, ''));
      return jsonResponse(res, { success: true, typingUsers });
    }

    // PATCH /chat/messages/:id
    const patchMsgMatch = path.match(/^\/chat\/messages\/([^/]+)$/);
    if (patchMsgMatch && method === 'PATCH') {
      const msgId = patchMsgMatch[1];
      const msg = await databases.getDocument(DATABASE_ID, COLLECTIONS.messages, msgId);
      if (msg.senderId !== userId) return errorResponse(res, 'FORBIDDEN', 'Not your message', 403);
      if (msg.type !== 'text') return errorResponse(res, 'INVALID', 'Only text messages editable');
      const created = new Date(msg.createdAt as string).getTime();
      if (Date.now() - created > 15 * 60 * 1000) {
        return errorResponse(res, 'EXPIRED', 'Edit window expired', 400);
      }
      const updated = await databases.updateDocument(DATABASE_ID, COLLECTIONS.messages, msgId, {
        body: String(body.body || '').slice(0, 4000),
        editedAt: new Date().toISOString(),
      });
      return jsonResponse(res, { success: true, message: formatMessage(updated as Record<string, unknown>) });
    }

    // DELETE /chat/messages/:id
    const deleteMsgMatch = path.match(/^\/chat\/messages\/([^/]+)$/);
    if (deleteMsgMatch && method === 'DELETE') {
      const msgId = deleteMsgMatch[1];
      const msg = await databases.getDocument(DATABASE_ID, COLLECTIONS.messages, msgId);
      if (msg.senderId !== userId) return errorResponse(res, 'FORBIDDEN', 'Not your message', 403);
      const updated = await databases.updateDocument(DATABASE_ID, COLLECTIONS.messages, msgId, {
        deletedAt: new Date().toISOString(),
        body: '',
      });
      return jsonResponse(res, { success: true, message: formatMessage(updated as Record<string, unknown>) });
    }

    return errorResponse(res, 'NOT_FOUND', `Unknown chat route: ${path}`, 404);
  } catch (err) {
    logger.error(`Chat error: ${formatError(err)}`);
    return errorResponse(res, 'INTERNAL_ERROR', 'Chat request failed', 500);
  }
}
