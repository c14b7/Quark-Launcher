import { Databases, Query } from 'node-appwrite';
import { DATABASE_ID, COLLECTIONS } from './config';

export function generateFriendCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function generateUniqueFriendCode(databases: Databases, maxAttempts = 10): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateFriendCode();
    const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.userProfiles, [
      Query.equal('friendCode', code),
      Query.limit(1),
    ]);
    if (existing.documents.length === 0) return code;
  }
  throw new Error('Failed to generate unique friend code');
}

export function sortUserIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}
