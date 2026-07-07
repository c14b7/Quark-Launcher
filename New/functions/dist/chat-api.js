"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleChatApiRequest = handleChatApiRequest;
const node_appwrite_1 = require("node-appwrite");
const config_1 = require("./lib/config");
const middleware_1 = require("./lib/middleware");
const rate_limit_1 = require("./lib/rate-limit");
const friend_code_1 = require("./lib/friend-code");
const chat_schema_1 = require("./lib/chat-schema");
const auth_api_1 = require("./auth-api");
const runtime_1 = require("./lib/runtime");
const noopLogger = { log: () => { }, error: console.error };
function getDatabases() {
    const client = new node_appwrite_1.Client()
        .setEndpoint(config_1.APPWRITE_ENDPOINT)
        .setProject(config_1.APPWRITE_PROJECT_ID)
        .setKey(config_1.APPWRITE_API_KEY);
    return new node_appwrite_1.Databases(client);
}
async function areFriends(databases, userId, otherId) {
    const [a, b] = (0, friend_code_1.sortUserIds)(userId, otherId);
    const docs = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.friendships, [
        node_appwrite_1.Query.contains('userIds', [a]),
        node_appwrite_1.Query.limit(50),
    ]);
    return docs.documents.some((d) => {
        const ids = d.userIds;
        return ids.includes(a) && ids.includes(b);
    });
}
function readPermissionsForMembers(memberIds) {
    return memberIds.flatMap((id) => [node_appwrite_1.Permission.read(node_appwrite_1.Role.user(id))]);
}
async function getMemberRecord(databases, conversationId, userId) {
    const docs = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.conversationMembers, [
        node_appwrite_1.Query.equal('conversationId', conversationId),
        node_appwrite_1.Query.equal('userId', userId),
        node_appwrite_1.Query.limit(1),
    ]);
    return docs.documents[0];
}
async function requireMembership(databases, conversationId, userId) {
    const member = await getMemberRecord(databases, conversationId, userId);
    return member || null;
}
async function createMemberRecords(databases, conversationId, memberIds, ownerId) {
    const now = new Date().toISOString();
    for (const memberId of memberIds) {
        const role = memberId === ownerId ? 'owner' : 'member';
        await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.conversationMembers, node_appwrite_1.ID.unique(), {
            conversationId,
            userId: memberId,
            role,
            joinedAt: now,
        });
    }
}
function formatConversation(conv, member, otherProfiles) {
    const memberIds = conv.memberIds || [];
    const type = conv.type;
    let title = conv.name || '';
    if (type === 'dm' && otherProfiles.length > 0) {
        title = otherProfiles[0].displayName || 'Znajomy';
    }
    return {
        id: conv.$id,
        type,
        name: title,
        avatarFileId: conv.avatarFileId || null,
        ownerId: conv.ownerId || null,
        memberIds,
        members: otherProfiles.map((p) => (0, auth_api_1.toPublicProfile)(p)),
        lastMessageAt: conv.lastMessageAt || null,
        lastMessagePreview: conv.lastMessagePreview || '',
        lastMessageSenderId: conv.lastMessageSenderId || null,
        settings: (() => {
            try {
                return conv.settings ? JSON.parse(String(conv.settings)) : {};
            }
            catch {
                return {};
            }
        })(),
        pinnedMessageIds: conv.pinnedMessageIds || [],
        createdAt: conv.createdAt,
        unread: member ? computeUnread(conv, member) : false,
        lastReadAt: member?.lastReadAt || null,
        notifications: member?.notifications || 'all',
        pinned: member?.pinned || false,
    };
}
function computeUnread(conv, member) {
    const lastAt = conv.lastMessageAt;
    const readAt = member.lastReadAt;
    if (!lastAt)
        return false;
    if (!readAt)
        return true;
    return new Date(lastAt).getTime() > new Date(readAt).getTime();
}
function formatMessage(doc) {
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
function previewForMessage(type, body, attachments) {
    if (type === 'text')
        return body.slice(0, 200);
    if (type === 'game_share')
        return '🎮 Udostępniono grę';
    if (type === 'achievement_share')
        return '🏆 Udostępniono osiągnięcie';
    if (type === 'store_deal')
        return '💰 Udostępniono okazję';
    if (type === 'party_invite')
        return '🎉 Zaproszenie do gry';
    if (type === 'lfg')
        return '🔍 Szukam grupy (LFG)';
    if (type === 'system')
        return body.slice(0, 200);
    try {
        const att = attachments ? JSON.parse(attachments) : null;
        if (att?.name)
            return String(att.name).slice(0, 200);
    }
    catch {
        /* ignore */
    }
    return 'Wiadomość';
}
async function handleChatApiRequest(req, res, logger = noopLogger) {
    const method = (req.method || 'POST').toUpperCase();
    let rawBody = {};
    try {
        rawBody = method === 'GET' ? {} : (0, middleware_1.parseBody)(req);
    }
    catch {
        rawBody = {};
    }
    const path = (0, middleware_1.resolveRoutePath)(req, rawBody);
    const body = (0, middleware_1.stripRouteMeta)(rawBody);
    const userId = await (0, middleware_1.verifyAuth)(req);
    const databases = getDatabases();
    logger.log(`Chat ${method} ${path} user=${userId || 'none'}`);
    if (!(0, middleware_1.requireAuth)(res, userId))
        return;
    try {
        // GET /chat/conversations
        if (path === '/chat/conversations' && method === 'GET') {
            const memberships = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.conversationMembers, [
                node_appwrite_1.Query.equal('userId', userId),
                node_appwrite_1.Query.limit(100),
            ]);
            const conversations = [];
            for (const m of memberships.documents) {
                const convId = m.conversationId;
                try {
                    const conv = await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.conversations, convId);
                    const memberIds = conv.memberIds || [];
                    const others = memberIds.filter((id) => id !== userId);
                    const profiles = [];
                    for (const oid of others.slice(0, 8)) {
                        const p = await (0, auth_api_1.getProfileByUserId)(databases, oid);
                        if (p)
                            profiles.push(p);
                    }
                    conversations.push(formatConversation(conv, m, profiles));
                }
                catch {
                    /* skip missing */
                }
            }
            conversations.sort((a, b) => {
                const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
                const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
                return tb - ta;
            });
            return (0, middleware_1.jsonResponse)(res, { success: true, conversations });
        }
        // POST /chat/conversations/dm
        if (path === '/chat/conversations/dm' && method === 'POST') {
            const targetUserId = String(body.userId || '');
            if (!targetUserId)
                return (0, middleware_1.errorResponse)(res, 'INVALID_INPUT', 'userId required');
            if (targetUserId === userId)
                return (0, middleware_1.errorResponse)(res, 'INVALID_INPUT', 'Cannot DM yourself');
            if (!(await areFriends(databases, userId, targetUserId))) {
                return (0, middleware_1.errorResponse)(res, 'NOT_FRIENDS', 'You can only message friends', 403);
            }
            const dmKey = (0, chat_schema_1.buildDmKey)(userId, targetUserId);
            const existing = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.conversations, [
                node_appwrite_1.Query.equal('dmKey', dmKey),
                node_appwrite_1.Query.limit(1),
            ]);
            if (existing.documents.length > 0) {
                const conv = existing.documents[0];
                const profile = await (0, auth_api_1.getProfileByUserId)(databases, targetUserId);
                const member = await getMemberRecord(databases, conv.$id, userId);
                return (0, middleware_1.jsonResponse)(res, {
                    success: true,
                    conversation: formatConversation(conv, member, profile ? [profile] : []),
                });
            }
            const memberIds = (0, friend_code_1.sortUserIds)(userId, targetUserId);
            const now = new Date().toISOString();
            const conv = await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.conversations, node_appwrite_1.ID.unique(), {
                type: 'dm',
                memberIds,
                dmKey,
                createdAt: now,
                settings: '{}',
            });
            await createMemberRecords(databases, conv.$id, memberIds, userId);
            const profile = await (0, auth_api_1.getProfileByUserId)(databases, targetUserId);
            const member = await getMemberRecord(databases, conv.$id, userId);
            return (0, middleware_1.jsonResponse)(res, {
                success: true,
                conversation: formatConversation(conv, member, profile ? [profile] : []),
            });
        }
        // POST /chat/conversations/group
        if (path === '/chat/conversations/group' && method === 'POST') {
            const name = String(body.name || '').trim().slice(0, 128);
            const rawMembers = Array.isArray(body.memberIds) ? body.memberIds : [];
            if (!name)
                return (0, middleware_1.errorResponse)(res, 'INVALID_INPUT', 'Group name required');
            const memberSet = new Set([userId, ...rawMembers.filter((id) => typeof id === 'string' && id !== userId)]);
            const memberIds = [...memberSet];
            if (memberIds.length < 2)
                return (0, middleware_1.errorResponse)(res, 'INVALID_INPUT', 'At least 2 members required');
            if (memberIds.length > 20)
                return (0, middleware_1.errorResponse)(res, 'INVALID_INPUT', 'Max 20 members');
            for (const mid of memberIds) {
                if (mid === userId)
                    continue;
                if (!(await areFriends(databases, userId, mid))) {
                    return (0, middleware_1.errorResponse)(res, 'NOT_FRIENDS', `Not friends with ${mid}`, 403);
                }
            }
            const now = new Date().toISOString();
            const convId = node_appwrite_1.ID.unique();
            const conv = await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.conversations, convId, {
                type: 'group',
                name,
                ownerId: userId,
                memberIds,
                dmKey: `group:${convId}`,
                createdAt: now,
                settings: JSON.stringify({ whoCanInvite: 'admins' }),
            });
            await createMemberRecords(databases, conv.$id, memberIds, userId);
            const profiles = [];
            for (const mid of memberIds.filter((id) => id !== userId).slice(0, 8)) {
                const p = await (0, auth_api_1.getProfileByUserId)(databases, mid);
                if (p)
                    profiles.push(p);
            }
            const member = await getMemberRecord(databases, conv.$id, userId);
            return (0, middleware_1.jsonResponse)(res, {
                success: true,
                conversation: formatConversation(conv, member, profiles),
            });
        }
        // PATCH /chat/conversations/:id
        const patchConvMatch = path.match(/^\/chat\/conversations\/([^/]+)$/);
        if (patchConvMatch && method === 'PATCH') {
            const convId = patchConvMatch[1];
            const conv = await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.conversations, convId);
            const member = await requireMembership(databases, convId, userId);
            if (!member)
                return (0, middleware_1.errorResponse)(res, 'FORBIDDEN', 'Not a member', 403);
            if (conv.type !== 'group')
                return (0, middleware_1.errorResponse)(res, 'INVALID', 'Only groups can be edited');
            if (member.role !== 'owner' && member.role !== 'admin') {
                return (0, middleware_1.errorResponse)(res, 'FORBIDDEN', 'Admin only', 403);
            }
            const updates = {};
            if (body.name)
                updates.name = String(body.name).trim().slice(0, 128);
            if (body.avatarFileId !== undefined)
                updates.avatarFileId = body.avatarFileId;
            const updated = await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.conversations, convId, updates);
            return (0, middleware_1.jsonResponse)(res, { success: true, conversation: formatConversation(updated, member, []) });
        }
        // POST /chat/conversations/:id/members
        const addMemberMatch = path.match(/^\/chat\/conversations\/([^/]+)\/members$/);
        if (addMemberMatch && method === 'POST') {
            const convId = addMemberMatch[1];
            const conv = await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.conversations, convId);
            const member = await requireMembership(databases, convId, userId);
            if (!member)
                return (0, middleware_1.errorResponse)(res, 'FORBIDDEN', 'Not a member', 403);
            const newUserId = String(body.userId || '');
            if (!newUserId)
                return (0, middleware_1.errorResponse)(res, 'INVALID_INPUT', 'userId required');
            const memberIds = conv.memberIds || [];
            if (memberIds.includes(newUserId))
                return (0, middleware_1.errorResponse)(res, 'ALREADY_MEMBER', 'Already in group');
            if (!(await areFriends(databases, userId, newUserId))) {
                return (0, middleware_1.errorResponse)(res, 'NOT_FRIENDS', 'Can only add friends', 403);
            }
            const now = new Date().toISOString();
            await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.conversationMembers, node_appwrite_1.ID.unique(), {
                conversationId: convId,
                userId: newUserId,
                role: 'member',
                joinedAt: now,
            });
            await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.conversations, convId, {
                memberIds: [...memberIds, newUserId],
            });
            await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.messages, node_appwrite_1.ID.unique(), {
                conversationId: convId,
                senderId: userId,
                type: 'system',
                body: `Użytkownik dołączył do grupy`,
                createdAt: now,
            }, readPermissionsForMembers([...memberIds, newUserId]));
            return (0, middleware_1.jsonResponse)(res, { success: true });
        }
        // DELETE /chat/conversations/:id/members/:userId
        const removeMemberMatch = path.match(/^\/chat\/conversations\/([^/]+)\/members\/([^/]+)$/);
        if (removeMemberMatch && method === 'DELETE') {
            const convId = removeMemberMatch[1];
            const targetId = removeMemberMatch[2];
            const conv = await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.conversations, convId);
            const member = await requireMembership(databases, convId, userId);
            if (!member)
                return (0, middleware_1.errorResponse)(res, 'FORBIDDEN', 'Not a member', 403);
            const memberIds = conv.memberIds || [];
            const isSelf = targetId === userId;
            if (!isSelf && member.role !== 'owner' && member.role !== 'admin') {
                return (0, middleware_1.errorResponse)(res, 'FORBIDDEN', 'Cannot remove others', 403);
            }
            const memDocs = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.conversationMembers, [
                node_appwrite_1.Query.equal('conversationId', convId),
                node_appwrite_1.Query.equal('userId', targetId),
                node_appwrite_1.Query.limit(1),
            ]);
            if (memDocs.documents.length > 0) {
                await databases.deleteDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.conversationMembers, memDocs.documents[0].$id);
            }
            await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.conversations, convId, {
                memberIds: memberIds.filter((id) => id !== targetId),
            });
            return (0, middleware_1.jsonResponse)(res, { success: true });
        }
        // GET /chat/conversations/:id/messages
        const getMessagesMatch = path.match(/^\/chat\/conversations\/([^/]+)\/messages$/);
        if (getMessagesMatch && method === 'GET') {
            const convId = getMessagesMatch[1];
            if (!(await requireMembership(databases, convId, userId))) {
                return (0, middleware_1.errorResponse)(res, 'FORBIDDEN', 'Not a member', 403);
            }
            const cursor = String(body.cursor || rawBody.cursor || '');
            const queries = [
                node_appwrite_1.Query.equal('conversationId', convId),
                node_appwrite_1.Query.orderDesc('createdAt'),
                node_appwrite_1.Query.limit(50),
            ];
            if (cursor)
                queries.push(node_appwrite_1.Query.cursorAfter(cursor));
            const docs = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.messages, queries);
            const messages = docs.documents.map((d) => formatMessage(d)).reverse();
            return (0, middleware_1.jsonResponse)(res, {
                success: true,
                messages,
                nextCursor: docs.documents.length ? docs.documents[docs.documents.length - 1].$id : null,
            });
        }
        // POST /chat/conversations/:id/messages
        const postMessageMatch = path.match(/^\/chat\/conversations\/([^/]+)\/messages$/);
        if (postMessageMatch && method === 'POST') {
            const convId = postMessageMatch[1];
            const rate = await (0, rate_limit_1.checkRateLimit)('chat/send', userId);
            if (!rate.allowed)
                return (0, middleware_1.errorResponse)(res, rate.code || 'RATE_LIMITED', 'Too many messages', 429);
            const conv = await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.conversations, convId);
            const member = await requireMembership(databases, convId, userId);
            if (!member)
                return (0, middleware_1.errorResponse)(res, 'FORBIDDEN', 'Not a member', 403);
            const type = String(body.type || 'text');
            if (!chat_schema_1.MESSAGE_TYPES.includes(type)) {
                return (0, middleware_1.errorResponse)(res, 'INVALID_TYPE', 'Invalid message type');
            }
            const textBody = String(body.body || '').slice(0, chat_schema_1.CHAT_BODY_MAX);
            const attachments = body.attachments
                ? JSON.stringify(body.attachments).slice(0, chat_schema_1.CHAT_ATTACHMENTS_MAX)
                : undefined;
            if (type === 'text' && !textBody.trim()) {
                return (0, middleware_1.errorResponse)(res, 'INVALID_INPUT', 'Message body required');
            }
            const now = new Date().toISOString();
            const memberIds = conv.memberIds || [];
            const msg = await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.messages, node_appwrite_1.ID.unique(), {
                conversationId: convId,
                senderId: userId,
                type,
                body: textBody || previewForMessage(type, '', attachments),
                attachments,
                replyToId: body.replyToId ? String(body.replyToId) : undefined,
                createdAt: now,
            }, readPermissionsForMembers(memberIds));
            const preview = previewForMessage(type, textBody, attachments);
            await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.conversations, convId, {
                lastMessageAt: now,
                lastMessagePreview: preview,
                lastMessageSenderId: userId,
            });
            await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.conversationMembers, member.$id, {
                lastReadAt: now,
                lastReadMessageId: msg.$id,
            });
            return (0, middleware_1.jsonResponse)(res, { success: true, message: formatMessage(msg) });
        }
        // POST /chat/conversations/:id/read
        const readMatch = path.match(/^\/chat\/conversations\/([^/]+)\/read$/);
        if (readMatch && method === 'POST') {
            const convId = readMatch[1];
            const member = await requireMembership(databases, convId, userId);
            if (!member)
                return (0, middleware_1.errorResponse)(res, 'FORBIDDEN', 'Not a member', 403);
            const now = new Date().toISOString();
            const updates = { lastReadAt: now };
            if (body.messageId)
                updates.lastReadMessageId = String(body.messageId);
            await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.conversationMembers, member.$id, updates);
            return (0, middleware_1.jsonResponse)(res, { success: true });
        }
        // POST /chat/conversations/:id/typing
        const typingMatch = path.match(/^\/chat\/conversations\/([^/]+)\/typing$/);
        if (typingMatch && method === 'POST') {
            const convId = typingMatch[1];
            if (!(await requireMembership(databases, convId, userId))) {
                return (0, middleware_1.errorResponse)(res, 'FORBIDDEN', 'Not a member', 403);
            }
            const key = `typing:${convId}:${userId}`;
            const now = new Date().toISOString();
            const existing = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.rateLimits, [
                node_appwrite_1.Query.equal('key', key),
                node_appwrite_1.Query.limit(1),
            ]);
            if (existing.documents.length > 0) {
                await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.rateLimits, existing.documents[0].$id, {
                    count: 1,
                    windowStart: now,
                });
            }
            else {
                await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.rateLimits, node_appwrite_1.ID.unique(), {
                    key,
                    count: 1,
                    windowStart: now,
                });
            }
            return (0, middleware_1.jsonResponse)(res, { success: true, typing: true, userId, conversationId: convId });
        }
        // GET /chat/conversations/:id/typing
        if (typingMatch && method === 'GET') {
            const convId = typingMatch[1];
            if (!(await requireMembership(databases, convId, userId))) {
                return (0, middleware_1.errorResponse)(res, 'FORBIDDEN', 'Not a member', 403);
            }
            const prefix = `typing:${convId}:`;
            const docs = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.rateLimits, [
                node_appwrite_1.Query.startsWith('key', prefix),
                node_appwrite_1.Query.limit(20),
            ]);
            const cutoff = Date.now() - 5000;
            const typingUsers = docs.documents
                .filter((d) => {
                const ws = new Date(d.windowStart).getTime();
                return ws >= cutoff && !String(d.key).endsWith(userId);
            })
                .map((d) => String(d.key).replace(prefix, ''));
            return (0, middleware_1.jsonResponse)(res, { success: true, typingUsers });
        }
        // PATCH /chat/messages/:id
        const patchMsgMatch = path.match(/^\/chat\/messages\/([^/]+)$/);
        if (patchMsgMatch && method === 'PATCH') {
            const msgId = patchMsgMatch[1];
            const msg = await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.messages, msgId);
            if (msg.senderId !== userId)
                return (0, middleware_1.errorResponse)(res, 'FORBIDDEN', 'Not your message', 403);
            if (msg.type !== 'text')
                return (0, middleware_1.errorResponse)(res, 'INVALID', 'Only text messages editable');
            const created = new Date(msg.createdAt).getTime();
            if (Date.now() - created > 15 * 60 * 1000) {
                return (0, middleware_1.errorResponse)(res, 'EXPIRED', 'Edit window expired', 400);
            }
            const updated = await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.messages, msgId, {
                body: String(body.body || '').slice(0, chat_schema_1.CHAT_BODY_MAX),
                editedAt: new Date().toISOString(),
            });
            return (0, middleware_1.jsonResponse)(res, { success: true, message: formatMessage(updated) });
        }
        // DELETE /chat/messages/:id
        const deleteMsgMatch = path.match(/^\/chat\/messages\/([^/]+)$/);
        if (deleteMsgMatch && method === 'DELETE') {
            const msgId = deleteMsgMatch[1];
            const msg = await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.messages, msgId);
            if (msg.senderId !== userId)
                return (0, middleware_1.errorResponse)(res, 'FORBIDDEN', 'Not your message', 403);
            const updated = await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.messages, msgId, {
                deletedAt: new Date().toISOString(),
                body: '',
            });
            return (0, middleware_1.jsonResponse)(res, { success: true, message: formatMessage(updated) });
        }
        return (0, middleware_1.errorResponse)(res, 'NOT_FOUND', `Unknown chat route: ${path}`, 404);
    }
    catch (err) {
        const detail = (0, runtime_1.formatError)(err);
        logger.error(`Chat error: ${detail}`);
        return (0, middleware_1.errorResponse)(res, 'INTERNAL_ERROR', detail || 'Chat request failed', 500);
    }
}
