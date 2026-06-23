import { apiRequest, APPWRITE_CONFIG } from './api-client';
import type { UserProfile } from './auth-service';

export const USER_MEDIA_BUCKET = 'user_media';

/** Bezpośredni URL do odczytu avatara z Appwrite Storage (publiczny read na pliku). */
export function getAvatarUrl(fileId: string | null | undefined): string | undefined {
  if (!fileId) return undefined;
  return `${APPWRITE_CONFIG.endpoint}/storage/buckets/${USER_MEDIA_BUCKET}/files/${fileId}/view?project=${APPWRITE_CONFIG.projectId}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Nie udało się odczytać pliku'));
        return;
      }
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error('Nie udało się odczytać pliku'));
    reader.readAsDataURL(file);
  });
}

export function fileToPreviewUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Nie udało się wygenerować podglądu'));
    };
    reader.onerror = () => reject(reader.error || new Error('Nie udało się wygenerować podglądu'));
    reader.readAsDataURL(file);
  });
}

export async function uploadAvatar(
  file: File
): Promise<{ success: boolean; fileId?: string; avatarUrl?: string; profile?: UserProfile; error?: string }> {
  // Upload wyłącznie przez POST /auth/avatar — klient nie ma create na buckecie.
  try {
    const data = await fileToBase64(file);
    const result = await apiRequest<{
      fileId: string;
      avatarUrl: string;
      profile: UserProfile;
    }>('/auth/avatar', 'POST', {
      data,
      mimeType: file.type,
    });

    if (!result.success) {
      return { success: false, error: result.error || 'Nie udało się przesłać avatara' };
    }

    return {
      success: true,
      fileId: result.fileId as string,
      avatarUrl: (result.avatarUrl as string) || getAvatarUrl(result.fileId as string),
      profile: result.profile as UserProfile,
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Avatar] Upload failed:', err);
    return { success: false, error: err.message || 'Nie udało się przesłać avatara' };
  }
}
