import { Client, Account } from 'node-appwrite';
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from './config';

export interface RequestContext {
  userId: string | null;
  jwt: string | null;
  ip: string;
}

export function parseBody(req: { payload?: string; body?: string; bodyRaw?: string }): Record<string, unknown> {
  const raw = req.payload || req.body || req.bodyRaw || '{}';
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

export function getHeaders(req: { headers?: Record<string, string> }): Record<string, string> {
  return req.headers || {};
}

export function getClientIp(req: { headers?: Record<string, string> }): string {
  const headers = getHeaders(req);
  const forwarded = headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers['x-appwrite-client-ip'] || headers['cf-connecting-ip'] || 'unknown';
}

export function extractAuth(req: { headers?: Record<string, string> }): { userId: string | null; jwt: string | null } {
  const headers = getHeaders(req);
  return {
    userId: headers['x-appwrite-user-id'] || null,
    jwt: headers['x-appwrite-jwt'] || null,
  };
}

export async function verifyAuth(req: { headers?: Record<string, string> }): Promise<string | null> {
  const { userId, jwt } = extractAuth(req);
  if (userId) return userId;

  if (!jwt) return null;

  try {
    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setJWT(jwt);
    const account = new Account(client);
    const user = await account.get();
    return user.$id;
  } catch {
    return null;
  }
}

export function jsonResponse(
  res: { json: (body: unknown, status?: number) => unknown },
  data: unknown,
  status = 200
) {
  return res.json(data, status);
}

export function errorResponse(
  res: { json: (body: unknown, status?: number) => unknown },
  code: string,
  message: string,
  status = 400
) {
  return res.json({ success: false, code, error: message }, status);
}

export function requireAuth(
  res: { json: (body: unknown, status?: number) => unknown },
  userId: string | null
): userId is string {
  if (!userId) {
    errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return false;
  }
  return true;
}
