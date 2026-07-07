/**
 * Chat collections bootstrap for Appwrite.
 * Usage: APPWRITE_API_KEY=xxx npm run migrate-chat
 */

import { Client, Databases, IndexType } from 'node-appwrite';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '680d15210002f3f65ea9';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = 'quark_launcher_db';

const SERVER_ONLY = ['read("any")', 'create("any")', 'update("any")', 'delete("any")'];

if (!APPWRITE_API_KEY) {
  console.error('❌ APPWRITE_API_KEY required');
  process.exit(1);
}

type Attr =
  | { key: string; type: 'string'; size: number; required: boolean; array?: boolean }
  | { key: string; type: 'datetime'; required: boolean }
  | { key: string; type: 'enum'; elements: string[]; required: boolean; default?: string }
  | { key: string; type: 'boolean'; required: boolean; default?: boolean };

const COLLECTIONS: { id: string; name: string; attributes: Attr[] }[] = [
  {
    id: 'conversations',
    name: 'Conversations',
    attributes: [
      { key: 'type', type: 'enum', elements: ['dm', 'group'], required: true },
      { key: 'name', type: 'string', size: 128, required: false },
      { key: 'avatarFileId', type: 'string', size: 64, required: false },
      { key: 'ownerId', type: 'string', size: 36, required: false },
      { key: 'memberIds', type: 'string', size: 36, required: true, array: true },
      { key: 'dmKey', type: 'string', size: 80, required: false },
      { key: 'lastMessageAt', type: 'datetime', required: false },
      { key: 'lastMessagePreview', type: 'string', size: 256, required: false },
      { key: 'lastMessageSenderId', type: 'string', size: 36, required: false },
      { key: 'settings', type: 'string', size: 2000, required: false },
      { key: 'pinnedMessageIds', type: 'string', size: 36, required: false, array: true },
      { key: 'createdAt', type: 'datetime', required: true },
    ],
  },
  {
    id: 'conversation_members',
    name: 'Conversation Members',
    attributes: [
      { key: 'conversationId', type: 'string', size: 36, required: true },
      { key: 'userId', type: 'string', size: 36, required: true },
      { key: 'role', type: 'enum', elements: ['owner', 'admin', 'member'], required: true },
      { key: 'joinedAt', type: 'datetime', required: true },
      { key: 'lastReadAt', type: 'datetime', required: false },
      { key: 'lastReadMessageId', type: 'string', size: 36, required: false },
      { key: 'notifications', type: 'enum', elements: ['all', 'mentions', 'muted'], required: false, default: 'all' },
      { key: 'pinned', type: 'boolean', required: false, default: false },
    ],
  },
  {
    id: 'messages',
    name: 'Messages',
    attributes: [
      { key: 'conversationId', type: 'string', size: 36, required: true },
      { key: 'senderId', type: 'string', size: 36, required: true },
      { key: 'type', type: 'enum', elements: ['text', 'game_share', 'achievement_share', 'store_deal', 'party_invite', 'system', 'lfg'], required: true },
      { key: 'body', type: 'string', size: 2048, required: true },
      { key: 'attachments', type: 'string', size: 2048, required: false },
      { key: 'replyToId', type: 'string', size: 36, required: false },
      { key: 'editedAt', type: 'datetime', required: false },
      { key: 'deletedAt', type: 'datetime', required: false },
      { key: 'createdAt', type: 'datetime', required: true },
    ],
  },
  {
    id: 'message_reactions',
    name: 'Message Reactions',
    attributes: [
      { key: 'messageId', type: 'string', size: 36, required: true },
      { key: 'userId', type: 'string', size: 36, required: true },
      { key: 'emoji', type: 'string', size: 16, required: true },
      { key: 'createdAt', type: 'datetime', required: true },
    ],
  },
];

async function createAttr(databases: Databases, collectionId: string, attr: Attr) {
  switch (attr.type) {
    case 'string':
      await databases.createStringAttribute(
        DATABASE_ID, collectionId, attr.key, attr.size, attr.required, undefined, attr.array || false
      );
      break;
    case 'datetime':
      await databases.createDatetimeAttribute(DATABASE_ID, collectionId, attr.key, attr.required);
      break;
    case 'enum':
      await databases.createEnumAttribute(
        DATABASE_ID,
        collectionId,
        attr.key,
        attr.elements,
        attr.required,
        attr.required ? undefined : attr.default,
        false
      );
      break;
    case 'boolean':
      await databases.createBooleanAttribute(
        DATABASE_ID,
        collectionId,
        attr.key,
        attr.required,
        attr.required ? undefined : attr.default,
        false
      );
      break;
  }
}

async function main() {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY!);
  const databases = new Databases(client);

  for (const col of COLLECTIONS) {
    try {
      await databases.createCollection(DATABASE_ID, col.id, col.name, SERVER_ONLY);
      console.log(`✅ collection ${col.id}`);
    } catch (e: unknown) {
      const err = e as { code?: number };
      if (err.code === 409) console.log(`ℹ️  collection ${col.id}`);
      else throw e;
    }

    for (const attr of col.attributes) {
      try {
        await createAttr(databases, col.id, attr);
        console.log(`   ✅ ${col.id}.${attr.key}`);
      } catch (e: unknown) {
        const err = e as { code?: number };
        if (err.code === 409) console.log(`   ℹ️  ${col.id}.${attr.key}`);
        else console.error(`   ❌ ${col.id}.${attr.key}`, e);
      }
    }
  }

  const indexes = [
    { collection: 'conversations', key: 'dmKey_idx', attributes: ['dmKey'] },
    { collection: 'conversations', key: 'lastMessageAt_idx', attributes: ['lastMessageAt'] },
    { collection: 'conversation_members', key: 'userId_idx', attributes: ['userId'] },
    { collection: 'conversation_members', key: 'conversationId_idx', attributes: ['conversationId'] },
    { collection: 'conversation_members', key: 'conv_user_unique', attributes: ['conversationId', 'userId'], unique: true },
    { collection: 'messages', key: 'conversationId_createdAt_idx', attributes: ['conversationId', 'createdAt'] },
    { collection: 'message_reactions', key: 'messageId_idx', attributes: ['messageId'] },
  ];

  for (const idx of indexes) {
    try {
      await databases.createIndex(
        DATABASE_ID,
        idx.collection,
        idx.key,
        (idx as { unique?: boolean }).unique ? IndexType.Unique : IndexType.Key,
        idx.attributes
      );
      console.log(`✅ index ${idx.key}`);
    } catch (e: unknown) {
      const err = e as { code?: number };
      if (err.code === 409) console.log(`ℹ️  index ${idx.key}`);
      else console.error(`❌ index ${idx.key}`, e);
    }
  }

  console.log('\n🎉 Chat migration done');
  console.log('ℹ️  If chat fails on unknown attributes, re-run after attributes finish building in Appwrite (~1 min).');
}

main().catch(console.error);
