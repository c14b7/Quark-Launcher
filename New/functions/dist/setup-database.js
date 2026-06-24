"use strict";
/**
 * Appwrite Database Setup Script
 *
 * Usage: APPWRITE_API_KEY=xxx npx ts-node setup-database.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const node_appwrite_1 = require("node-appwrite");
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '680d15210002f3f65ea9';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
if (!APPWRITE_API_KEY) {
    console.error('❌ APPWRITE_API_KEY environment variable is required');
    console.error('   Copy functions/.env.example to functions/.env and set your key');
    process.exit(1);
}
const DATABASE_ID = 'quark_launcher_db';
// Server-only: no client access
const SERVER_ONLY_PERMISSIONS = [];
const COLLECTIONS = [
    {
        id: 'user_profiles',
        name: 'User Profiles',
        attributes: [
            { key: 'userId', type: 'string', size: 36, required: true },
            { key: 'email', type: 'email', required: true },
            { key: 'name', type: 'string', size: 100, required: true },
            { key: 'displayName', type: 'string', size: 32, required: false },
            { key: 'friendCode', type: 'string', size: 6, required: false },
            { key: 'createdAt', type: 'datetime', required: true },
            { key: 'steamLinked', type: 'boolean', required: false, default: false },
            { key: 'steamId', type: 'string', size: 50, required: false },
            { key: 'preferences', type: 'string', size: 5000, required: false },
            { key: 'bio', type: 'string', size: 190, required: false },
            { key: 'avatarFileId', type: 'string', size: 36, required: false },
            { key: 'bannerFileId', type: 'string', size: 36, required: false },
            { key: 'cardTheme', type: 'string', size: 2000, required: false },
            { key: 'presence', type: 'enum', elements: ['online', 'idle', 'dnd', 'offline'], required: false, default: 'offline' },
            { key: 'customStatus', type: 'string', size: 128, required: false },
            { key: 'lastSeen', type: 'datetime', required: false },
            { key: 'emailVerified', type: 'boolean', required: false, default: false },
            { key: 'friendCodeRegeneratedAt', type: 'datetime', required: false },
            { key: 'subscriptionTier', type: 'enum', elements: ['free', 'premium', 'premium_plus'], required: false, default: 'free' },
            { key: 'subscriptionStatus', type: 'enum', elements: ['active', 'canceled', 'expired', 'trialing'], required: false, default: 'active' },
            { key: 'subscriptionExpiresAt', type: 'datetime', required: false },
            { key: 'subscriptionProvider', type: 'enum', elements: ['stripe', 'manual'], required: false },
        ],
    },
    {
        id: 'steam_integrations',
        name: 'Steam Integrations',
        attributes: [
            { key: 'userId', type: 'string', size: 36, required: true },
            { key: 'steamId', type: 'string', size: 50, required: true },
            { key: 'personaName', type: 'string', size: 100, required: true },
            { key: 'avatarUrl', type: 'string', size: 500, required: false },
            { key: 'profileUrl', type: 'string', size: 500, required: false },
            { key: 'linkedAt', type: 'datetime', required: true },
        ],
    },
    {
        id: 'friend_requests',
        name: 'Friend Requests',
        attributes: [
            { key: 'fromUserId', type: 'string', size: 36, required: true },
            { key: 'toUserId', type: 'string', size: 36, required: true },
            { key: 'status', type: 'enum', elements: ['pending', 'accepted', 'declined', 'cancelled'], required: true },
            { key: 'createdAt', type: 'datetime', required: true },
            { key: 'respondedAt', type: 'datetime', required: false },
        ],
    },
    {
        id: 'friendships',
        name: 'Friendships',
        attributes: [
            { key: 'userIds', type: 'string', size: 36, required: true, array: true },
            { key: 'createdAt', type: 'datetime', required: true },
        ],
    },
    {
        id: 'rate_limits',
        name: 'Rate Limits',
        attributes: [
            { key: 'key', type: 'string', size: 128, required: true },
            { key: 'count', type: 'integer', required: true },
            { key: 'windowStart', type: 'datetime', required: true },
        ],
    },
    {
        id: 'steam_friends_cache',
        name: 'Steam Friends Cache',
        attributes: [
            { key: 'userId', type: 'string', size: 36, required: true },
            { key: 'steamId', type: 'string', size: 50, required: true },
            { key: 'friendsData', type: 'string', size: 50000, required: false },
            { key: 'lastUpdated', type: 'datetime', required: true },
        ],
    },
    {
        id: 'steam_achievements_cache',
        name: 'Steam Achievements Cache',
        attributes: [
            { key: 'userId', type: 'string', size: 36, required: true },
            { key: 'steamId', type: 'string', size: 50, required: true },
            { key: 'gameId', type: 'string', size: 50, required: true },
            { key: 'achievementsData', type: 'string', size: 100000, required: false },
            { key: 'lastUpdated', type: 'datetime', required: true },
        ],
    },
    {
        id: 'steam_stats_cache',
        name: 'Steam Stats Cache',
        attributes: [
            { key: 'userId', type: 'string', size: 36, required: true },
            { key: 'steamId', type: 'string', size: 50, required: true },
            { key: 'gamesOwned', type: 'integer', required: false },
            { key: 'totalPlaytime', type: 'integer', required: false },
            { key: 'recentlyPlayedData', type: 'string', size: 50000, required: false },
            { key: 'lastUpdated', type: 'datetime', required: true },
        ],
    },
    {
        id: 'telemetry_installations',
        name: 'Telemetry Installations',
        attributes: [
            // installationId = document $id (nie duplikujemy w atrybutach)
            { key: 'firstSeenAt', type: 'datetime', required: true },
            { key: 'lastSeenAt', type: 'datetime', required: true },
            { key: 'appVersion', type: 'string', size: 32, required: false },
            { key: 'platform', type: 'enum', elements: ['win32', 'darwin', 'linux', 'web'], required: false },
            { key: 'arch', type: 'string', size: 16, required: false },
            { key: 'locale', type: 'string', size: 10, required: false },
            { key: 'electronVersion', type: 'string', size: 32, required: false },
            { key: 'screenResolution', type: 'string', size: 16, required: false },
            { key: 'userId', type: 'string', size: 36, required: false },
            { key: 'analyticsEnabled', type: 'boolean', required: false, default: true },
            { key: 'diagnosticsEnabled', type: 'boolean', required: false, default: true },
            { key: 'optedOut', type: 'boolean', required: false, default: false },
        ],
    },
    {
        id: 'telemetry_sessions',
        name: 'Telemetry Sessions',
        attributes: [
            // sessionId = document $id
            { key: 'installationId', type: 'string', size: 36, required: true },
            { key: 'userId', type: 'string', size: 36, required: false },
            { key: 'startedAt', type: 'datetime', required: true },
            { key: 'endedAt', type: 'datetime', required: false },
            { key: 'lastActivityAt', type: 'datetime', required: false },
            { key: 'durationSec', type: 'integer', required: false },
            { key: 'appVersion', type: 'string', size: 32, required: false },
            { key: 'entryPoint', type: 'enum', elements: ['cold_start', 'resume', 'login'], required: false },
            { key: 'endReason', type: 'enum', elements: ['quit', 'crash', 'logout', 'unknown'], required: false },
        ],
    },
    {
        id: 'telemetry_events',
        name: 'Telemetry Events',
        attributes: [
            // eventId = document $id — limit Appwrite: mało dużych stringów na kolekcję
            { key: 'installationId', type: 'string', size: 36, required: true },
            { key: 'sessionId', type: 'string', size: 36, required: true },
            { key: 'userId', type: 'string', size: 36, required: false },
            { key: 'name', type: 'string', size: 64, required: true },
            { key: 'category', type: 'enum', elements: ['session', 'navigation', 'game', 'social', 'auth', 'settings', 'update', 'error', 'feature'], required: true },
            { key: 'timestamp', type: 'datetime', required: true },
            { key: 'properties', type: 'string', size: 2000, required: false },
        ],
    },
    {
        id: 'telemetry_logs',
        name: 'Telemetry Logs',
        attributes: [
            // logId = document $id — context+stack scalone w details (JSON)
            { key: 'installationId', type: 'string', size: 36, required: true },
            { key: 'sessionId', type: 'string', size: 36, required: true },
            { key: 'userId', type: 'string', size: 36, required: false },
            { key: 'level', type: 'enum', elements: ['debug', 'info', 'warn', 'error', 'fatal'], required: true },
            { key: 'message', type: 'string', size: 500, required: true },
            { key: 'details', type: 'string', size: 3000, required: false },
            { key: 'timestamp', type: 'datetime', required: true },
        ],
    },
];
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function waitForAttributes(databases, collectionId, keys, maxWaitMs = 120000) {
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
        const col = await databases.getCollection(DATABASE_ID, collectionId);
        const attrs = (col.attributes || []);
        const ready = keys.every((k) => attrs.find((a) => a.key === k)?.status === 'available');
        if (ready)
            return true;
        await sleep(2500);
    }
    return false;
}
async function createIndexWithRetry(databases, collection, key, attributes, unique = false, retries = 8) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await databases.createIndex(DATABASE_ID, collection, key, unique ? node_appwrite_1.IndexType.Unique : node_appwrite_1.IndexType.Key, attributes);
            console.log(`   ✅ ${key}`);
            return;
        }
        catch (error) {
            const e = error;
            if (e.code === 409) {
                console.log(`   ℹ️  ${key}`);
                return;
            }
            if (e.type === 'attribute_not_available' && attempt < retries) {
                console.log(`   ⏳ ${key} — czekam na atrybuty (${attempt}/${retries})...`);
                await waitForAttributes(databases, collection, attributes, 30000);
                await sleep(2000);
                continue;
            }
            console.error(`   ❌ ${key}`, error);
            return;
        }
    }
}
async function createAttribute(databases, collectionId, attr) {
    switch (attr.type) {
        case 'string':
            await databases.createStringAttribute(DATABASE_ID, collectionId, attr.key, attr.size || 255, attr.required, attr.default, attr.array || false);
            break;
        case 'email':
            await databases.createEmailAttribute(DATABASE_ID, collectionId, attr.key, attr.required, attr.default, attr.array || false);
            break;
        case 'integer':
            await databases.createIntegerAttribute(DATABASE_ID, collectionId, attr.key, attr.required, undefined, undefined, attr.default, attr.array || false);
            break;
        case 'boolean':
            await databases.createBooleanAttribute(DATABASE_ID, collectionId, attr.key, attr.required, attr.default, attr.array || false);
            break;
        case 'datetime':
            await databases.createDatetimeAttribute(DATABASE_ID, collectionId, attr.key, attr.required, attr.default, attr.array || false);
            break;
        case 'enum':
            await databases.createEnumAttribute(DATABASE_ID, collectionId, attr.key, attr.elements || [], attr.required, attr.default, attr.array || false);
            break;
    }
}
async function setupDatabase() {
    console.log('🚀 Starting Appwrite database setup...\n');
    const client = new node_appwrite_1.Client()
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID)
        .setKey(APPWRITE_API_KEY);
    const databases = new node_appwrite_1.Databases(client);
    const storage = new node_appwrite_1.Storage(client);
    try {
        await databases.create(DATABASE_ID, 'Quark Launcher Database');
        console.log('📁 Database created\n');
    }
    catch (error) {
        const e = error;
        if (e.code === 409)
            console.log('📁 Database already exists\n');
        else
            throw error;
    }
    for (const collection of COLLECTIONS) {
        console.log(`📋 Collection: ${collection.name}`);
        try {
            await databases.createCollection(DATABASE_ID, collection.id, collection.name, SERVER_ONLY_PERMISSIONS);
            console.log('   ✅ Created');
        }
        catch (error) {
            const e = error;
            if (e.code === 409)
                console.log('   ℹ️  Already exists');
            else {
                console.error('   ❌', error);
                continue;
            }
        }
        for (const attr of collection.attributes) {
            try {
                await createAttribute(databases, collection.id, attr);
                console.log(`   📝 ${attr.key} ✅`);
            }
            catch (error) {
                const e = error;
                if (e.code === 409)
                    console.log(`   📝 ${attr.key} ℹ️`);
                else
                    console.error(`   📝 ${attr.key} ❌`, error);
            }
        }
        console.log('');
        // Appwrite indeksuje atrybuty asynchronicznie — krótka pauza przed indeksami telemetry
        if (collection.id.startsWith('telemetry_')) {
            const keys = collection.attributes.map((a) => a.key);
            console.log(`   ⏳ Oczekiwanie na atrybuty ${collection.id}...`);
            await waitForAttributes(databases, collection.id, keys, 90000);
        }
    }
    const indexes = [
        { collection: 'user_profiles', key: 'userId_idx', attributes: ['userId'] },
        { collection: 'user_profiles', key: 'friendCode_unique', attributes: ['friendCode'], unique: true },
        { collection: 'steam_integrations', key: 'userId_idx', attributes: ['userId'] },
        { collection: 'steam_integrations', key: 'steamId_idx', attributes: ['steamId'] },
        { collection: 'friend_requests', key: 'fromUserId_idx', attributes: ['fromUserId'] },
        { collection: 'friend_requests', key: 'toUserId_status_idx', attributes: ['toUserId', 'status'] },
        // friendships.userIds — tablica; Appwrite nie wspiera indeksów na array (Query.contains działa bez indeksu)
        { collection: 'rate_limits', key: 'key_idx', attributes: ['key'] },
        { collection: 'steam_friends_cache', key: 'userId_idx', attributes: ['userId'] },
        { collection: 'steam_achievements_cache', key: 'userId_gameId_idx', attributes: ['userId', 'gameId'] },
        { collection: 'steam_stats_cache', key: 'userId_idx', attributes: ['userId'] },
        { collection: 'telemetry_installations', key: 'userId_idx', attributes: ['userId'] },
        { collection: 'telemetry_installations', key: 'lastSeenAt_idx', attributes: ['lastSeenAt'] },
        { collection: 'telemetry_sessions', key: 'installationId_idx', attributes: ['installationId'] },
        { collection: 'telemetry_sessions', key: 'userId_idx', attributes: ['userId'] },
        { collection: 'telemetry_sessions', key: 'startedAt_idx', attributes: ['startedAt'] },
        { collection: 'telemetry_events', key: 'name_idx', attributes: ['name'] },
        { collection: 'telemetry_events', key: 'userId_idx', attributes: ['userId'] },
        { collection: 'telemetry_events', key: 'installationId_idx', attributes: ['installationId'] },
        { collection: 'telemetry_events', key: 'timestamp_idx', attributes: ['timestamp'] },
        { collection: 'telemetry_events', key: 'category_idx', attributes: ['category'] },
        { collection: 'telemetry_logs', key: 'level_idx', attributes: ['level'] },
        { collection: 'telemetry_logs', key: 'timestamp_idx', attributes: ['timestamp'] },
        { collection: 'telemetry_logs', key: 'installationId_idx', attributes: ['installationId'] },
    ];
    console.log('🔍 Indexes...');
    for (const index of indexes) {
        await createIndexWithRetry(databases, index.collection, index.key, index.attributes, index.unique || false);
    }
    try {
        // Bucket bez create dla users — upload tylko przez Function (API key).
        // Odczyt plików: Permission.read(Role.any()) na każdym pliku przy uploadzie.
        await storage.createBucket('user_media', 'User Media', [], true, true, 5242880, undefined, undefined, undefined);
        console.log('\n📦 Bucket user_media created (server-only upload)');
    }
    catch (error) {
        const e = error;
        if (e.code === 409) {
            console.log('\n📦 Bucket user_media already exists — removing client create permission...');
            try {
                await storage.updateBucket('user_media', 'User Media', []);
                console.log('   ✅ user_media bucket locked to server-only create');
            }
            catch (updateError) {
                console.error('   ⚠️  Could not update user_media permissions:', updateError);
                console.error('   → W konsoli Appwrite usuń ręcznie create:users z bucketa user_media');
            }
        }
    }
    console.log('\n🎉 Setup complete!');
}
setupDatabase().catch(console.error);
