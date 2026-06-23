/**
 * Quark Launcher - Appwrite Functions Entry Point
 */

import { handleSteamApiRequest } from './steam-api';
import { handleAuthApiRequest } from './auth-api';
import { handleFriendsApiRequest } from './friends-api';
import { parseBody, resolveRoutePath } from './lib/middleware';

export default async function (req: { path?: string; method?: string; payload?: string; headers?: Record<string, string> }, res: { json: (body: unknown, status?: number) => unknown }) {
  const path = resolveRoutePath(req, parseBody(req));

  if (path.startsWith('/auth')) {
    return handleAuthApiRequest(req, res);
  }

  if (path.startsWith('/friends')) {
    return handleFriendsApiRequest(req, res);
  }

  if (path.startsWith('/steam')) {
    return handleSteamApiRequest(req, res);
  }

  return res.json({
    success: false,
    code: 'NOT_FOUND',
    error: `Unknown route: ${path || '/'}`,
    version: '2.0.0',
    endpoints: ['/auth', '/friends', '/steam'],
  }, 404);
}
