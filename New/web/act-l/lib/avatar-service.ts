import { Storage, ID, Permission, Role } from 'appwrite';
import { client, APPWRITE_CONFIG, account } from './api-client';

export const USER_MEDIA_BUCKET = 'user_media';

const storage = new Storage(client);

export function getAvatarUrl(fileId: string | null | undefined): string | undefined {
  if (!fileId) return undefined;
  return `${APPWRITE_CONFIG.endpoint}/storage/buckets/${USER_MEDIA_BUCKET}/files/${fileId}/view?project=${APPWRITE_CONFIG.projectId}`;
}

export async function uploadAvatar(file: File): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    const user = await account.get();
    const fileId = ID.unique();
    const permissions = [
      Permission.read(Role.any()),
      Permission.update(Role.user(user.$id)),
      Permission.delete(Role.user(user.$id)),
    ];

    const result = await storage.createFile(USER_MEDIA_BUCKET, fileId, file, permissions);
    return { success: true, fileId: result.$id };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Avatar] Upload failed:', err);
    return { success: false, error: err.message || 'Nie udało się przesłać avatara' };
  }
}

export async function deleteAvatar(fileId: string): Promise<void> {
  try {
    await storage.deleteFile(USER_MEDIA_BUCKET, fileId);
  } catch {
    // ignore — file may already be gone
  }
}
