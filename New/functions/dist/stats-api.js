"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStatsApiRequest = handleStatsApiRequest;
const node_appwrite_1 = require("node-appwrite");
const config_1 = require("./lib/config");
const middleware_1 = require("./lib/middleware");
const rate_limit_1 = require("./lib/rate-limit");
const friend_code_1 = require("./lib/friend-code");
const runtime_1 = require("./lib/runtime");
const noopLogger = { log: () => { }, error: console.error };
function getDatabases() {
    const client = new node_appwrite_1.Client()
        .setEndpoint(config_1.APPWRITE_ENDPOINT)
        .setProject(config_1.APPWRITE_PROJECT_ID)
        .setKey(config_1.APPWRITE_API_KEY);
    return new node_appwrite_1.Databases(client);
}
function errMeta(err) {
    const e = err;
    return {
        code: e?.code,
        type: e?.type,
        message: e?.message || (0, runtime_1.formatError)(err),
    };
}
function isNotFound(err) {
    const m = errMeta(err);
    return (m.code === 404 ||
        m.type === 'document_not_found' ||
        m.type === 'collection_not_found' ||
        /not found/i.test(m.message));
}
function isConflict(err) {
    const m = errMeta(err);
    return m.code === 409 || m.type === 'document_already_exists' || /already exists/i.test(m.message);
}
function isCollectionMissing(err) {
    const m = errMeta(err);
    return m.type === 'collection_not_found' || /collection.*(not found|missing)/i.test(m.message);
}
async function upsertPlayStats(databases, userId, data) {
    try {
        await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userPlayStats, userId);
        await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userPlayStats, userId, data);
        return;
    }
    catch (getErr) {
        if (isCollectionMissing(getErr))
            throw getErr;
        if (!isNotFound(getErr)) {
            // Document may exist but get failed oddly — try update, then create
            try {
                await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userPlayStats, userId, data);
                return;
            }
            catch {
                /* fall through to create */
            }
        }
    }
    try {
        // SERVER_ONLY collection — no document ACL (API key writes)
        await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userPlayStats, userId, data);
    }
    catch (createErr) {
        if (isConflict(createErr)) {
            await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userPlayStats, userId, data);
            return;
        }
        throw createErr;
    }
}
async function areFriends(databases, userId, otherId) {
    const [a, b] = (0, friend_code_1.sortUserIds)(userId, otherId);
    const docs = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.friendships, [
        node_appwrite_1.Query.contains('userIds', [a]),
        node_appwrite_1.Query.limit(80),
    ]);
    return docs.documents.some((d) => {
        const ids = d.userIds;
        return ids.includes(a) && ids.includes(b);
    });
}
function parseSummary(raw) {
    if (typeof raw === 'string') {
        if (raw.length > 8000)
            throw new Error('SUMMARY_TOO_LARGE');
        JSON.parse(raw);
        return raw;
    }
    const str = JSON.stringify(raw ?? {});
    if (str.length > 8000)
        throw new Error('SUMMARY_TOO_LARGE');
    return str;
}
async function handleStatsApiRequest(req, res, log = noopLogger) {
    const databases = getDatabases();
    const method = (req.method || 'GET').toUpperCase();
    const rawBody = (0, middleware_1.parseBody)(req);
    const path = (0, middleware_1.resolveRoutePath)(req, rawBody);
    const body = (0, middleware_1.stripRouteMeta)(rawBody);
    try {
        const userId = await (0, middleware_1.verifyAuth)(req);
        // PUT /stats/summary
        if (path === '/stats/summary' && method === 'PUT') {
            if (!(0, middleware_1.requireAuth)(res, userId))
                return;
            const rate = await (0, rate_limit_1.checkRateLimit)('stats/summary', userId);
            if (!rate.allowed)
                return (0, middleware_1.errorResponse)(res, rate.code || 'RATE_LIMITED', 'Too many syncs', 429);
            const visibility = String(body.visibility || 'friends') === 'private' ? 'private' : 'friends';
            let summaryJson;
            try {
                summaryJson = parseSummary(body.summary);
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : 'INVALID_SUMMARY';
                return (0, middleware_1.errorResponse)(res, msg === 'SUMMARY_TOO_LARGE' ? 'SUMMARY_TOO_LARGE' : 'INVALID_SUMMARY', 'Invalid summary');
            }
            const now = new Date().toISOString();
            try {
                await upsertPlayStats(databases, userId, {
                    userId: userId,
                    visibility,
                    summaryJson,
                    updatedAt: now,
                });
            }
            catch (upsertErr) {
                const meta = errMeta(upsertErr);
                log.error(`stats upsert failed: ${meta.message} type=${meta.type || ''} code=${meta.code || ''}`);
                if (isCollectionMissing(upsertErr)) {
                    return (0, middleware_1.errorResponse)(res, 'COLLECTION_MISSING', 'Collection user_play_stats missing — run functions/setup-database.ts', 503);
                }
                return (0, middleware_1.errorResponse)(res, 'UPSERT_FAILED', meta.message, 500);
            }
            return (0, middleware_1.jsonResponse)(res, { success: true, visibility, updatedAt: now });
        }
        // GET /stats/me
        if (path === '/stats/me' && method === 'GET') {
            if (!(0, middleware_1.requireAuth)(res, userId))
                return;
            try {
                const doc = await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userPlayStats, userId);
                let summary = null;
                try {
                    summary = JSON.parse(String(doc.summaryJson || '{}'));
                }
                catch {
                    summary = null;
                }
                return (0, middleware_1.jsonResponse)(res, {
                    success: true,
                    visibility: doc.visibility || 'friends',
                    summary,
                    updatedAt: doc.updatedAt || null,
                });
            }
            catch {
                return (0, middleware_1.jsonResponse)(res, { success: true, visibility: 'friends', summary: null });
            }
        }
        // PATCH /stats/visibility
        if (path === '/stats/visibility' && method === 'PATCH') {
            if (!(0, middleware_1.requireAuth)(res, userId))
                return;
            const visibility = String(body.visibility || 'friends') === 'private' ? 'private' : 'friends';
            const now = new Date().toISOString();
            try {
                await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userPlayStats, userId, {
                    visibility,
                    updatedAt: now,
                });
            }
            catch (updateErr) {
                if (isCollectionMissing(updateErr)) {
                    return (0, middleware_1.errorResponse)(res, 'COLLECTION_MISSING', 'Collection user_play_stats missing — run functions/setup-database.ts', 503);
                }
                if (!isNotFound(updateErr)) {
                    return (0, middleware_1.errorResponse)(res, 'UPSERT_FAILED', errMeta(updateErr).message, 500);
                }
                try {
                    await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userPlayStats, userId, {
                        userId: userId,
                        visibility,
                        summaryJson: '{}',
                        updatedAt: now,
                    });
                }
                catch (createErr) {
                    if (isConflict(createErr)) {
                        await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userPlayStats, userId, {
                            visibility,
                            updatedAt: now,
                        });
                    }
                    else {
                        return (0, middleware_1.errorResponse)(res, 'UPSERT_FAILED', errMeta(createErr).message, 500);
                    }
                }
            }
            return (0, middleware_1.jsonResponse)(res, { success: true, visibility });
        }
        // GET /stats/:userId
        const match = path.match(/^\/stats\/([^/]+)$/);
        if (match && method === 'GET') {
            if (!(0, middleware_1.requireAuth)(res, userId))
                return;
            const targetId = decodeURIComponent(match[1]);
            if (targetId === userId) {
                // redirect semantics to /me
                try {
                    const doc = await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userPlayStats, userId);
                    return (0, middleware_1.jsonResponse)(res, {
                        success: true,
                        visibility: doc.visibility || 'friends',
                        summary: JSON.parse(String(doc.summaryJson || '{}')),
                    });
                }
                catch {
                    return (0, middleware_1.jsonResponse)(res, { success: true, visibility: 'friends', summary: null });
                }
            }
            const friends = await areFriends(databases, userId, targetId);
            if (!friends)
                return (0, middleware_1.errorResponse)(res, 'NOT_FRIENDS', 'Not friends', 403);
            try {
                const doc = await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userPlayStats, targetId);
                if (String(doc.visibility || 'friends') === 'private') {
                    return (0, middleware_1.errorResponse)(res, 'STATS_PRIVATE', 'Stats are private', 403);
                }
                let summary = null;
                try {
                    summary = JSON.parse(String(doc.summaryJson || '{}'));
                }
                catch {
                    summary = null;
                }
                return (0, middleware_1.jsonResponse)(res, { success: true, summary, updatedAt: doc.updatedAt || null });
            }
            catch {
                return (0, middleware_1.jsonResponse)(res, { success: true, summary: null });
            }
        }
        return (0, middleware_1.errorResponse)(res, 'NOT_FOUND', `Unknown stats route: ${path}`, 404);
    }
    catch (err) {
        const meta = errMeta(err);
        log.error(`stats-api error: ${meta.message} type=${meta.type || ''} code=${meta.code || ''}`);
        if (isCollectionMissing(err)) {
            return (0, middleware_1.errorResponse)(res, 'COLLECTION_MISSING', 'Collection user_play_stats missing — run functions/setup-database.ts', 503);
        }
        return (0, middleware_1.errorResponse)(res, 'INTERNAL_ERROR', meta.message || 'Stats API failed', 500);
    }
}
