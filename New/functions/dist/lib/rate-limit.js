"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRateLimit = checkRateLimit;
exports.getClientIp = getClientIp;
const node_appwrite_1 = require("node-appwrite");
const config_1 = require("./config");
const LIMITS = {
    register: { max: 3, windowMs: 60 * 60 * 1000 },
    login: { max: 10, windowMs: 15 * 60 * 1000 },
    'friends/lookup': { max: 20, windowMs: 60 * 60 * 1000 },
    'friend-code/regenerate': { max: 1, windowMs: 24 * 60 * 60 * 1000 },
    'profile/patch': { max: 30, windowMs: 60 * 60 * 1000 },
};
function getDatabases() {
    const client = new node_appwrite_1.Client()
        .setEndpoint(config_1.APPWRITE_ENDPOINT)
        .setProject(config_1.APPWRITE_PROJECT_ID)
        .setKey(config_1.APPWRITE_API_KEY);
    return new node_appwrite_1.Databases(client);
}
async function checkRateLimit(action, key) {
    const config = LIMITS[action];
    if (!config)
        return { allowed: true };
    const databases = getDatabases();
    const rateKey = `${action}:${key}`;
    const now = Date.now();
    try {
        const existing = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.rateLimits, [
            node_appwrite_1.Query.equal('key', rateKey),
            node_appwrite_1.Query.limit(1),
        ]);
        if (existing.documents.length === 0) {
            await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.rateLimits, node_appwrite_1.ID.unique(), {
                key: rateKey,
                count: 1,
                windowStart: new Date(now).toISOString(),
            });
            return { allowed: true };
        }
        const doc = existing.documents[0];
        const windowStart = new Date(doc.windowStart).getTime();
        const count = doc.count;
        if (now - windowStart > config.windowMs) {
            await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.rateLimits, doc.$id, {
                count: 1,
                windowStart: new Date(now).toISOString(),
            });
            return { allowed: true };
        }
        if (count >= config.max) {
            return { allowed: false, code: 'RATE_LIMITED' };
        }
        await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.rateLimits, doc.$id, {
            count: count + 1,
        });
        return { allowed: true };
    }
    catch (error) {
        console.error('Rate limit check failed:', error);
        return { allowed: true };
    }
}
function getClientIp(req) {
    const forwarded = req.headers?.['x-forwarded-for'];
    if (forwarded)
        return forwarded.split(',')[0].trim();
    return req.headers?.['x-appwrite-client-ip'] || 'unknown';
}
