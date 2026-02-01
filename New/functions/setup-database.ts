/**
 * Appwrite Database Setup Script
 * 
 * This script initializes the database and collections for Quark Launcher.
 * Run this once to set up the Appwrite database structure.
 * 
 * Usage: npx ts-node setup-database.ts
 */

import { Client, Databases, ID, Permission, Role, IndexType } from 'node-appwrite';

// Appwrite configuration
const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '680d15210002f3f65ea9';
const APPWRITE_API_KEY = 'standard_65abd8b00f9266bb409bbd853a93d65a9f60f18f791bf44a24bda306254a113b928cd67bcda714120cf02fd0b50af4d47500ec3da9cc1e1d49d7ba5c52ee46bbb927bb10182754d82b18b37910ed168ecb3f5417a307efa954a776decabcba5022f66dddff7b67376c41754af06edc58717e23bdbb17eec45d065b427a4adc0f';

const DATABASE_ID = 'quark_launcher_db';

interface CollectionConfig {
  id: string;
  name: string;
  attributes: AttributeConfig[];
}

interface AttributeConfig {
  key: string;
  type: 'string' | 'integer' | 'float' | 'boolean' | 'email' | 'datetime' | 'enum';
  size?: number;
  required: boolean;
  default?: unknown;
  array?: boolean;
  elements?: string[];
}

// Collections configuration
const COLLECTIONS: CollectionConfig[] = [
  {
    id: 'user_profiles',
    name: 'User Profiles',
    attributes: [
      { key: 'userId', type: 'string', size: 36, required: true },
      { key: 'email', type: 'email', required: true },
      { key: 'name', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'datetime', required: true },
      { key: 'steamLinked', type: 'boolean', required: false, default: false },
      { key: 'steamId', type: 'string', size: 50, required: false },
      { key: 'preferences', type: 'string', size: 5000, required: false },
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
    id: 'steam_friends_cache',
    name: 'Steam Friends Cache',
    attributes: [
      { key: 'userId', type: 'string', size: 36, required: true },
      { key: 'steamId', type: 'string', size: 50, required: true },
      { key: 'friendsData', type: 'string', size: 50000, required: false }, // JSON string
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
      { key: 'achievementsData', type: 'string', size: 100000, required: false }, // JSON string
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
      { key: 'totalPlaytime', type: 'integer', required: false }, // in minutes
      { key: 'recentlyPlayedData', type: 'string', size: 50000, required: false }, // JSON string
      { key: 'lastUpdated', type: 'datetime', required: true },
    ],
  },
];

async function setupDatabase() {
  console.log('🚀 Starting Appwrite database setup...\n');

  // Initialize client
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new Databases(client);

  // Create database
  try {
    console.log(`📁 Creating database: ${DATABASE_ID}`);
    await databases.create(DATABASE_ID, 'Quark Launcher Database');
    console.log(`   ✅ Database created successfully\n`);
  } catch (error: unknown) {
    const appError = error as { code?: number; message?: string };
    if (appError.code === 409) {
      console.log(`   ℹ️  Database already exists\n`);
    } else {
      console.error(`   ❌ Error creating database:`, appError.message);
      throw error;
    }
  }

  // Create collections
  for (const collection of COLLECTIONS) {
    console.log(`📋 Creating collection: ${collection.name}`);
    
    try {
      await databases.createCollection(
        DATABASE_ID,
        collection.id,
        collection.name,
        [
          Permission.read(Role.users()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ]
      );
      console.log(`   ✅ Collection created`);
    } catch (error: unknown) {
      const appError = error as { code?: number; message?: string };
      if (appError.code === 409) {
        console.log(`   ℹ️  Collection already exists`);
      } else {
        console.error(`   ❌ Error creating collection:`, appError.message);
        continue;
      }
    }

    // Create attributes
    for (const attr of collection.attributes) {
      try {
        console.log(`   📝 Creating attribute: ${attr.key}`);
        
        switch (attr.type) {
          case 'string':
            await databases.createStringAttribute(
              DATABASE_ID,
              collection.id,
              attr.key,
              attr.size || 255,
              attr.required,
              attr.default as string | undefined,
              attr.array || false
            );
            break;
          case 'email':
            await databases.createEmailAttribute(
              DATABASE_ID,
              collection.id,
              attr.key,
              attr.required,
              attr.default as string | undefined,
              attr.array || false
            );
            break;
          case 'integer':
            await databases.createIntegerAttribute(
              DATABASE_ID,
              collection.id,
              attr.key,
              attr.required,
              undefined,
              undefined,
              attr.default as number | undefined,
              attr.array || false
            );
            break;
          case 'float':
            await databases.createFloatAttribute(
              DATABASE_ID,
              collection.id,
              attr.key,
              attr.required,
              undefined,
              undefined,
              attr.default as number | undefined,
              attr.array || false
            );
            break;
          case 'boolean':
            await databases.createBooleanAttribute(
              DATABASE_ID,
              collection.id,
              attr.key,
              attr.required,
              attr.default as boolean | undefined,
              attr.array || false
            );
            break;
          case 'datetime':
            await databases.createDatetimeAttribute(
              DATABASE_ID,
              collection.id,
              attr.key,
              attr.required,
              attr.default as string | undefined,
              attr.array || false
            );
            break;
          case 'enum':
            await databases.createEnumAttribute(
              DATABASE_ID,
              collection.id,
              attr.key,
              attr.elements || [],
              attr.required,
              attr.default as string | undefined,
              attr.array || false
            );
            break;
        }
        
        console.log(`      ✅ Attribute created`);
      } catch (error: unknown) {
        const appError = error as { code?: number; message?: string };
        if (appError.code === 409) {
          console.log(`      ℹ️  Attribute already exists`);
        } else {
          console.error(`      ❌ Error creating attribute:`, appError.message);
        }
      }
    }
    
    console.log('');
  }

  // Create indexes
  console.log('🔍 Creating indexes...');
  
  const indexes = [
    { collection: 'user_profiles', key: 'userId_idx', attributes: ['userId'] },
    { collection: 'steam_integrations', key: 'userId_idx', attributes: ['userId'] },
    { collection: 'steam_integrations', key: 'steamId_idx', attributes: ['steamId'] },
    { collection: 'steam_friends_cache', key: 'userId_idx', attributes: ['userId'] },
    { collection: 'steam_achievements_cache', key: 'userId_gameId_idx', attributes: ['userId', 'gameId'] },
    { collection: 'steam_stats_cache', key: 'userId_idx', attributes: ['userId'] },
  ];

  for (const index of indexes) {
    try {
      console.log(`   📊 Creating index: ${index.key} on ${index.collection}`);
      await databases.createIndex(
        DATABASE_ID,
        index.collection,
        index.key,
        IndexType.Key,
        index.attributes
      );
      console.log(`      ✅ Index created`);
    } catch (error: unknown) {
      const appError = error as { code?: number; message?: string };
      if (appError.code === 409) {
        console.log(`      ℹ️  Index already exists`);
      } else {
        console.error(`      ❌ Error creating index:`, appError.message);
      }
    }
  }

  console.log('\n🎉 Database setup complete!');
}

// Run setup
setupDatabase().catch(console.error);
