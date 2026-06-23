import { apiRequest } from './api-client';

export async function callSteamApi<T = unknown>(
  action: string,
  params: Record<string, unknown> = {}
): Promise<{ success: boolean; data?: T; error?: string; code?: string }> {
  const result = await apiRequest<T>('/steam', 'POST', { action, ...params });
  if (!result.success) {
    return { success: false, error: result.error, code: result.code };
  }
  return { success: true, data: result.data as T };
}
