/**
 * Appwrite Database - Add Missing Attributes to user_profiles
 * 
 * This script adds the missing steamLinked and steamId attributes to the user_profiles collection.
 * 
 * Usage: 
 * 1. cd New/functions
 * 2. npx ts-node fix-user-profiles.ts
 */

import { Client, Databases } from 'node-appwrite';

// Appwrite configuration
const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '680d15210002f3f65ea9';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

if (!APPWRITE_API_KEY) {
  console.error('APPWRITE_API_KEY required');
  process.exit(1);
}

const DATABASE_ID = 'quark_launcher_db';
const COLLECTION_ID = 'user_profiles';

async function fixUserProfiles() {
  console.log('🔧 Fixing user_profiles collection...\n');

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY!);

  const databases = new Databases(client);

  // Add steamLinked attribute
  try {
    console.log('📝 Adding steamLinked attribute...');
    await databases.createBooleanAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'steamLinked',
      false, // required
      false  // default value
    );
    console.log('   ✅ steamLinked attribute added');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('   ℹ️  steamLinked attribute already exists');
    } else {
      console.error('   ❌ Error:', error.message);
    }
  }

  // Wait a bit for the attribute to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Add steamId attribute  
  try {
    console.log('📝 Adding steamId attribute...');
    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'steamId',
      50,    // size
      false  // required
    );
    console.log('   ✅ steamId attribute added');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('   ℹ️  steamId attribute already exists');
    } else {
      console.error('   ❌ Error:', error.message);
    }
  }

  // Wait for attributes to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n✅ Done! Attributes should be ready in a few seconds.');
  console.log('   Refresh your Appwrite dashboard to see the changes.\n');
}

fixUserProfiles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
