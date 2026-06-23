"use strict";
/**
 * Migrate existing user profiles to v2 schema
 * Usage: APPWRITE_API_KEY=xxx npx ts-node migrate-user-profiles-v2.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const node_appwrite_1 = require("node-appwrite");
const friend_code_1 = require("./lib/friend-code");
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '680d15210002f3f65ea9';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = 'quark_launcher_db';
if (!APPWRITE_API_KEY) {
    console.error('APPWRITE_API_KEY required');
    process.exit(1);
}
const defaultCardTheme = JSON.stringify({
    accentColor: '#8b5cf6',
    gradientPreset: 'violet-fuchsia',
    glowEnabled: true,
});
async function migrate() {
    const client = new node_appwrite_1.Client()
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID)
        .setKey(APPWRITE_API_KEY);
    const databases = new node_appwrite_1.Databases(client);
    let offset = 0;
    const limit = 100;
    let migrated = 0;
    while (true) {
        const batch = await databases.listDocuments(DATABASE_ID, 'user_profiles', [
            node_appwrite_1.Query.limit(limit),
            node_appwrite_1.Query.offset(offset),
        ]);
        if (batch.documents.length === 0)
            break;
        for (const doc of batch.documents) {
            const updates = {};
            if (!doc.friendCode) {
                updates.friendCode = await (0, friend_code_1.generateUniqueFriendCode)(databases);
            }
            if (!doc.displayName) {
                updates.displayName = (doc.name || 'User').slice(0, 32);
            }
            if (doc.emailVerified === undefined || doc.emailVerified === null) {
                updates.emailVerified = false;
            }
            if (!doc.cardTheme) {
                updates.cardTheme = defaultCardTheme;
            }
            if (!doc.presence) {
                updates.presence = 'offline';
            }
            if (doc.bio === undefined) {
                updates.bio = '';
            }
            if (doc.customStatus === undefined) {
                updates.customStatus = '';
            }
            if (Object.keys(updates).length > 0) {
                await databases.updateDocument(DATABASE_ID, 'user_profiles', doc.$id, updates);
                migrated++;
                console.log(`✅ Migrated ${doc.$id}`);
            }
        }
        offset += limit;
        if (batch.documents.length < limit)
            break;
    }
    console.log(`\n🎉 Migration complete. Updated ${migrated} profiles.`);
}
migrate().catch(console.error);
