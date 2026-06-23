import { Client, Account } from 'node-appwrite';
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from './config';

export interface RequestContext {
  userId: string | null;
  jwt: string | null;
  ip: string;
}

export function parseBody(req: {
  payload?: string;
  body?: string;
  bodyRaw?: string;
  bodyText?: string;
  bodyJson?: unknown;
}): Record<string, unknown> {
  // bodyJson is a getter that throws on empty GET bodies — never read it bare
  try {
    const json = req.bodyJson;
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      return json as Record<string, unknown>;
    }
  } catch {
    // empty body (typical for GET)
  }

  const raw = req.payload || req.body || req.bodyRaw || req.bodyText;
  if (!raw || (typeof raw === 'string' && raw.trim() === '')) {
    return {};
  }

  try {
    return typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown>);
  } catch {
    return {};
  }
}

/** Safe path resolution without parsing body (for GET requests). */
export function resolveRoutePathFromRequest(req: {
  path?: string;
  url?: string;
  headers?: Record<string, string>;
}): string {
  return resolveRoutePath(req, {});
}

/** Resolve route path from Appwrite execution (path is often empty without fallbacks). */
export function resolveRoutePath(
  req: { path?: string; url?: string; headers?: Record<string, string> },
  body: Record<string, unknown>
): string {
  const headers = req.headers || {};
  const fromBody = typeof body._route === 'string' ? body._route : '';
  const headerPath =
    headers['x-appwrite-path'] ||
    headers['X-Appwrite-Path'] ||
    headers['x-appwrite-user-path'] ||
    '';
  const raw = (req.path || req.url || headerPath || fromBody || '/').split('?')[0];
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function stripRouteMeta(body: Record<string, unknown>): Record<string, unknown> {
  const { _route, ...rest } = body;
  return rest;
}

export function getHeaders(req: { headers?: Record<string, string> }): Record<string, string> {
  const headers = req.headers || {};
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
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
    jwt: headers['x-appwrite-jwt'] || headers['x-appwrite-user-jwt'] || null,
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
