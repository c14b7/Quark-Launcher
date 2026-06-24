/**
 * Naprawa schematu telemetry po limicie atrybutów Appwrite.
 * Dodaje brakujące pola: properties (events), details (logs) + indeksy z retry.
 *
 * Jeśli nadal attribute_limit_exceeded:
 * W konsoli Appwrite usuń kolekcje telemetry_events i telemetry_logs,
 * potem uruchom: npm run setup-db
 *
 * Usage: APPWRITE_API_KEY=xxx npx ts-node migrate-telemetry-schema.ts
 */

import { Client, Databases, IndexType } from 'node-appwrite';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '680d15210002f3f65ea9';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = 'quark_launcher_db';

if (!APPWRITE_API_KEY) {
  console.error('❌ APPWRITE_API_KEY required');
  process.exit(1);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForAttribute(databases: Databases, collectionId: string, key: string) {
  for (let i = 0; i < 40; i++) {
    const col = await databases.getCollection(DATABASE_ID, collectionId);
    const attr = ((col.attributes || []) as unknown as Array<{ key: string; status: string }>).find((a) => a.key === key);
    if (attr?.status === 'available') return true;
    await sleep(2500);
  }
  return false;
}

async function ensureStringAttr(
  databases: Databases,
  collectionId: string,
  key: string,
  size: number,
  required = false
) {
  try {
    await databases.createStringAttribute(DATABASE_ID, collectionId, key, size, required);
    console.log(`   ✅ attribute ${collectionId}.${key}`);
    await waitForAttribute(databases, collectionId, key);
  } catch (error: unknown) {
    const e = error as { code?: number };
    if (e.code === 409) console.log(`   ℹ️  ${collectionId}.${key} exists`);
    else throw error;
  }
}

async function ensureIndex(databases: Databases, collection: string, key: string, attributes: string[]) {
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      await databases.createIndex(DATABASE_ID, collection, key, IndexType.Key, attributes);
      console.log(`   ✅ index ${collection}.${key}`);
      return;
    } catch (error: unknown) {
      const e = error as { code?: number; type?: string };
      if (e.code === 409) {
        console.log(`   ℹ️  index ${collection}.${key}`);
        return;
      }
      if (e.type === 'attribute_not_available' && attempt < 8) {
        await sleep(3000);
        continue;
      }
      console.error(`   ❌ index ${collection}.${key}`, error);
      return;
    }
  }
}

async function main() {
  console.log('🔧 Migracja schematu telemetry...\n');

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY!);

  const databases = new Databases(client);

  console.log('📋 telemetry_events');
  await ensureStringAttr(databases, 'telemetry_events', 'properties', 2000);

  console.log('\n📋 telemetry_logs');
  await ensureStringAttr(databases, 'telemetry_logs', 'details', 3000);

  console.log('\n🔍 Indeksy telemetry_logs (jeśli brakuje)...');
  await ensureIndex(databases, 'telemetry_logs', 'level_idx', ['level']);
  await ensureIndex(databases, 'telemetry_logs', 'timestamp_idx', ['timestamp']);
  await ensureIndex(databases, 'telemetry_logs', 'installationId_idx', ['installationId']);

  console.log('\n🎉 Migracja zakończona.');
  console.log('   Uruchom ponownie launcher i sprawdź ingest w Appwrite.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
