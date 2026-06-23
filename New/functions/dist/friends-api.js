"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleFriendsApiRequest = handleFriendsApiRequest;
const node_appwrite_1 = require("node-appwrite");
const config_1 = require("./lib/config");
const middleware_1 = require("./lib/middleware");
const rate_limit_1 = require("./lib/rate-limit");
const validators_1 = require("./lib/validators");
const friend_code_1 = require("./lib/friend-code");
const auth_api_1 = require("./auth-api");
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
async function hasPendingRequest(databases, fromId, toId) {
    const docs = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.friendRequests, [
        node_appwrite_1.Query.equal('fromUserId', fromId),
        node_appwrite_1.Query.equal('toUserId', toId),
        node_appwrite_1.Query.equal('status', 'pending'),
        node_appwrite_1.Query.limit(1),
    ]);
    return docs.documents.length > 0;
}
async function handleFriendsApiRequest(req, res) {
    const path = req.path || '';
    const method = (req.method || 'POST').toUpperCase();
    const body = (0, middleware_1.parseBody)(req);
    const userId = await (0, middleware_1.verifyAuth)(req);
    const databases = getDatabases();
    if (!(0, middleware_1.requireAuth)(res, userId))
        return;
    try {
        // POST /friends/lookup
        if (path === '/friends/lookup' && method === 'POST') {
            const rate = await (0, rate_limit_1.checkRateLimit)('friends/lookup', userId);
            if (!rate.allowed)
                return (0, middleware_1.errorResponse)(res, rate.code || 'RATE_LIMITED', 'Too many lookups', 429);
            const code = (0, validators_1.normalizeFriendCode)(String(body.code || ''));
            const err = (0, validators_1.validateFriendCode)(code);
            if (err)
                return (0, middleware_1.errorResponse)(res, err, 'Invalid friend code');
            const docs = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.userProfiles, [
                node_appwrite_1.Query.equal('friendCode', code),
                node_appwrite_1.Query.limit(1),
            ]);
            if (docs.documents.length === 0) {
                return (0, middleware_1.errorResponse)(res, 'USER_NOT_FOUND', 'No user found with this code', 404);
            }
            const target = docs.documents[0];
            if (target.userId === userId) {
                return (0, middleware_1.errorResponse)(res, 'CANNOT_ADD_SELF', 'Cannot add yourself');
            }
            return (0, middleware_1.jsonResponse)(res, {
                success: true,
                profile: (0, auth_api_1.toPublicProfile)(target),
            });
        }
        // POST /friends/request
        if (path === '/friends/request' && method === 'POST') {
            const code = (0, validators_1.normalizeFriendCode)(String(body.code || ''));
            const err = (0, validators_1.validateFriendCode)(code);
            if (err)
                return (0, middleware_1.errorResponse)(res, err, 'Invalid friend code');
            const myProfile = await (0, auth_api_1.getProfileByUserId)(databases, userId);
            if (myProfile && myProfile.emailVerified === false) {
                return (0, middleware_1.errorResponse)(res, 'EMAIL_NOT_VERIFIED', 'Verify your email before adding friends', 403);
            }
            const docs = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.userProfiles, [
                node_appwrite_1.Query.equal('friendCode', code),
                node_appwrite_1.Query.limit(1),
            ]);
            if (docs.documents.length === 0) {
                return (0, middleware_1.errorResponse)(res, 'USER_NOT_FOUND', 'No user found with this code', 404);
            }
            const target = docs.documents[0];
            const toUserId = target.userId;
            if (toUserId === userId)
                return (0, middleware_1.errorResponse)(res, 'CANNOT_ADD_SELF', 'Cannot add yourself');
            if (await areFriends(databases, userId, toUserId)) {
                return (0, middleware_1.errorResponse)(res, 'ALREADY_FRIENDS', 'Already friends');
            }
            if (await hasPendingRequest(databases, userId, toUserId)) {
                return (0, middleware_1.errorResponse)(res, 'REQUEST_EXISTS', 'Request already sent');
            }
            const reversePending = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.friendRequests, [
                node_appwrite_1.Query.equal('fromUserId', toUserId),
                node_appwrite_1.Query.equal('toUserId', userId),
                node_appwrite_1.Query.equal('status', 'pending'),
                node_appwrite_1.Query.limit(1),
            ]);
            if (reversePending.documents.length > 0) {
                const reqDoc = reversePending.documents[0];
                await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.friendRequests, reqDoc.$id, {
                    status: 'accepted',
                    respondedAt: new Date().toISOString(),
                });
                const [a, b] = (0, friend_code_1.sortUserIds)(userId, toUserId);
                await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.friendships, node_appwrite_1.ID.unique(), {
                    userIds: [a, b],
                    createdAt: new Date().toISOString(),
                });
                return (0, middleware_1.jsonResponse)(res, { success: true, autoAccepted: true });
            }
            const request = await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.friendRequests, node_appwrite_1.ID.unique(), {
                fromUserId: userId,
                toUserId,
                status: 'pending',
                createdAt: new Date().toISOString(),
            });
            return (0, middleware_1.jsonResponse)(res, { success: true, requestId: request.$id });
        }
        // GET /friends/requests
        if (path === '/friends/requests' && method === 'GET') {
            const [incoming, outgoing] = await Promise.all([
                databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.friendRequests, [
                    node_appwrite_1.Query.equal('toUserId', userId),
                    node_appwrite_1.Query.equal('status', 'pending'),
                ]),
                databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.friendRequests, [
                    node_appwrite_1.Query.equal('fromUserId', userId),
                    node_appwrite_1.Query.equal('status', 'pending'),
                ]),
            ]);
            const enrich = async (docs, type) => {
                return Promise.all(docs.map(async (doc) => {
                    const otherId = type === 'incoming' ? doc.fromUserId : doc.toUserId;
                    const profile = await (0, auth_api_1.getProfileByUserId)(databases, otherId);
                    return {
                        id: doc.$id,
                        fromUserId: doc.fromUserId,
                        toUserId: doc.toUserId,
                        status: doc.status,
                        createdAt: doc.createdAt,
                        profile: profile ? (0, auth_api_1.toPublicProfile)(profile) : null,
                    };
                }));
            };
            return (0, middleware_1.jsonResponse)(res, {
                success: true,
                incoming: await enrich(incoming.documents, 'incoming'),
                outgoing: await enrich(outgoing.documents, 'outgoing'),
            });
        }
        // POST /friends/requests/:id/accept
        const acceptMatch = path.match(/^\/friends\/requests\/([^/]+)\/accept$/);
        if (acceptMatch && method === 'POST') {
            const requestId = acceptMatch[1];
            const request = await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.friendRequests, requestId);
            if (request.toUserId !== userId)
                return (0, middleware_1.errorResponse)(res, 'FORBIDDEN', 'Not your request', 403);
            if (request.status !== 'pending')
                return (0, middleware_1.errorResponse)(res, 'INVALID_STATUS', 'Request not pending');
            await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.friendRequests, requestId, {
                status: 'accepted',
                respondedAt: new Date().toISOString(),
            });
            const [a, b] = (0, friend_code_1.sortUserIds)(request.fromUserId, request.toUserId);
            await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.friendships, node_appwrite_1.ID.unique(), {
                userIds: [a, b],
                createdAt: new Date().toISOString(),
            });
            return (0, middleware_1.jsonResponse)(res, { success: true });
        }
        // POST /friends/requests/:id/decline
        const declineMatch = path.match(/^\/friends\/requests\/([^/]+)\/decline$/);
        if (declineMatch && method === 'POST') {
            const requestId = declineMatch[1];
            const request = await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.friendRequests, requestId);
            if (request.toUserId !== userId)
                return (0, middleware_1.errorResponse)(res, 'FORBIDDEN', 'Not your request', 403);
            await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.friendRequests, requestId, {
                status: 'declined',
                respondedAt: new Date().toISOString(),
            });
            return (0, middleware_1.jsonResponse)(res, { success: true });
        }
        // DELETE /friends/requests/:id
        const cancelMatch = path.match(/^\/friends\/requests\/([^/]+)$/);
        if (cancelMatch && method === 'DELETE') {
            const requestId = cancelMatch[1];
            const request = await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.friendRequests, requestId);
            if (request.fromUserId !== userId)
                return (0, middleware_1.errorResponse)(res, 'FORBIDDEN', 'Not your request', 403);
            await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.friendRequests, requestId, {
                status: 'cancelled',
                respondedAt: new Date().toISOString(),
            });
            return (0, middleware_1.jsonResponse)(res, { success: true });
        }
        // GET /friends
        if (path === '/friends' && method === 'GET') {
            const friendships = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.friendships, [
                node_appwrite_1.Query.contains('userIds', [userId]),
            ]);
            const friendIds = friendships.documents
                .map((f) => f.userIds.find((id) => id !== userId))
                .filter(Boolean);
            const friends = await Promise.all(friendIds.map(async (fid) => {
                const profile = await (0, auth_api_1.getProfileByUserId)(databases, fid);
                return profile ? (0, auth_api_1.toPublicProfile)(profile) : null;
            }));
            return (0, middleware_1.jsonResponse)(res, {
                success: true,
                friends: friends.filter(Boolean),
            });
        }
        // DELETE /friends/:userId
        const unfriendMatch = path.match(/^\/friends\/([^/]+)$/);
        if (unfriendMatch && method === 'DELETE') {
            const friendUserId = unfriendMatch[1];
            const friendships = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.friendships, [
                node_appwrite_1.Query.contains('userIds', [userId]),
            ]);
            const friendship = friendships.documents.find((f) => {
                const ids = f.userIds;
                return ids.includes(userId) && ids.includes(friendUserId);
            });
            if (!friendship)
                return (0, middleware_1.errorResponse)(res, 'NOT_FOUND', 'Friendship not found', 404);
            await databases.deleteDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.friendships, friendship.$id);
            return (0, middleware_1.jsonResponse)(res, { success: true });
        }
        // POST /friends/presence
        if (path === '/friends/presence' && method === 'POST') {
            const presence = String(body.presence || 'online');
            const err = (0, validators_1.validatePresence)(presence);
            if (err)
                return (0, middleware_1.errorResponse)(res, err, 'Invalid presence');
            const updates = {
                presence,
                lastSeen: new Date().toISOString(),
            };
            if (body.customStatus !== undefined) {
                const statusErr = (0, validators_1.validateCustomStatus)(String(body.customStatus));
                if (statusErr)
                    return (0, middleware_1.errorResponse)(res, statusErr, 'Invalid custom status');
                updates.customStatus = body.customStatus;
            }
            await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userProfiles, userId, updates);
            return (0, middleware_1.jsonResponse)(res, { success: true });
        }
        return (0, middleware_1.errorResponse)(res, 'NOT_FOUND', 'Friends endpoint not found', 404);
    }
    catch (error) {
        console.error('Friends API error:', error);
        return (0, middleware_1.errorResponse)(res, 'INTERNAL_ERROR', 'Request failed', 500);
    }
}
