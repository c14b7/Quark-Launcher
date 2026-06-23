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
];
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
    }
    const indexes = [
        { collection: 'user_profiles', key: 'userId_idx', attributes: ['userId'] },
        { collection: 'user_profiles', key: 'friendCode_unique', attributes: ['friendCode'], unique: true },
        { collection: 'steam_integrations', key: 'userId_idx', attributes: ['userId'] },
        { collection: 'steam_integrations', key: 'steamId_idx', attributes: ['steamId'] },
        { collection: 'friend_requests', key: 'fromUserId_idx', attributes: ['fromUserId'] },
        { collection: 'friend_requests', key: 'toUserId_status_idx', attributes: ['toUserId', 'status'] },
        { collection: 'friendships', key: 'userIds_idx', attributes: ['userIds'] },
        { collection: 'rate_limits', key: 'key_idx', attributes: ['key'] },
        { collection: 'steam_friends_cache', key: 'userId_idx', attributes: ['userId'] },
        { collection: 'steam_achievements_cache', key: 'userId_gameId_idx', attributes: ['userId', 'gameId'] },
        { collection: 'steam_stats_cache', key: 'userId_idx', attributes: ['userId'] },
    ];
    console.log('🔍 Indexes...');
    for (const index of indexes) {
        try {
            await databases.createIndex(DATABASE_ID, index.collection, index.key, index.unique ? node_appwrite_1.IndexType.Unique : node_appwrite_1.IndexType.Key, index.attributes);
            console.log(`   ✅ ${index.key}`);
        }
        catch (error) {
            const e = error;
            if (e.code === 409)
                console.log(`   ℹ️  ${index.key}`);
            else
                console.error(`   ❌ ${index.key}`, error);
        }
    }
    try {
        await storage.createBucket('user_media', 'User Media', [], true, true, 5242880, undefined, undefined, undefined);
        console.log('\n📦 Bucket user_media created');
    }
    catch (error) {
        const e = error;
        if (e.code === 409)
            console.log('\n📦 Bucket user_media already exists');
    }
    console.log('\n🎉 Setup complete!');
}
setupDatabase().catch(console.error);
