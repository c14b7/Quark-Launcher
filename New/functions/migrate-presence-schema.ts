/**
 * Dodaje pola rich presence do user_profiles.
 * Usage: APPWRITE_API_KEY=xxx npm run migrate-presence
 */

import { Client, Databases } from 'node-appwrite';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '680d15210002f3f65ea9';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = 'quark_launcher_db';

if (!APPWRITE_API_KEY) {
  console.error('❌ APPWRITE_API_KEY required');
  process.exit(1);
}

async function main() {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY!);
  const databases = new Databases(client);

  const attrs = [
    { key: 'currentGameId', size: 50 },
    { key: 'currentGameName', size: 128 },
  ] as const;

  for (const attr of attrs) {
    try {
      await databases.createStringAttribute(
        DATABASE_ID, 'user_profiles', attr.key, attr.size, false
      );
      console.log(`✅ ${attr.key}`);
    } catch (e: unknown) {
      const err = e as { code?: number };
      if (err.code === 409) console.log(`ℹ️  ${attr.key}`);
      else console.error(`❌ ${attr.key}`, e);
    }
  }

  try {
    await databases.createEnumAttribute(
      DATABASE_ID, 'user_profiles', 'currentActivity',
      ['playing', 'menu', 'idle', 'none'], false, 'none'
    );
    console.log('✅ currentActivity');
  } catch (e: unknown) {
    const err = e as { code?: number };
    if (err.code === 409) console.log('ℹ️  currentActivity');
    else console.error('❌ currentActivity', e);
  }

  try {
    await databases.createDatetimeAttribute(
      DATABASE_ID, 'user_profiles', 'activityUpdatedAt', false
    );
    console.log('✅ activityUpdatedAt');
  } catch (e: unknown) {
    const err = e as { code?: number };
    if (err.code === 409) console.log('ℹ️  activityUpdatedAt');
    else console.error('❌ activityUpdatedAt', e);
  }

  console.log('\n🎉 Presence migration done');
}

main().catch(console.error);
