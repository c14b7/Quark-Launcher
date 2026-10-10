import { Client, Databases, Query, ID } from 'node-appwrite';
import { createHash, randomBytes } from 'crypto';
import {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY,
  DATABASE_ID,
  COLLECTIONS,
} from './lib/config';
import {
  parseBody,
  verifyAuth,
  jsonResponse,
  errorResponse,
  requireAuth,
  resolveRoutePath,
  stripRouteMeta,
} from './lib/middleware';
import { formatError } from './lib/runtime';
import type { FunctionRequest, FunctionResponse } from './lib/runtime';

type Logger = { log: (msg: string) => void; error: (msg: string) => void };
const noopLogger: Logger = { log: () => {}, error: console.error };

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_REDIRECT =
  process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:39211/spotify/callback';
const SCOPES = ['user-read-currently-playing', 'user-read-playback-state', 'user-read-email'].join(
  ' '
);

function getDatabases(): Databases {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  return new Databases(client);
}

function base64Url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getIntegration(databases: Databases, userId: string) {
  const docs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.spotifyIntegrations, [
    Query.equal('userId', userId),
    Query.limit(1),
  ]);
  return docs.documents[0] || null;
}

async function refreshAccessToken(
  databases: Databases,
  doc: { $id: string; refreshToken: string }
): Promise<string | null> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) return null;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: doc.refreshToken,
  });
  const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };
  if (!json.access_token) return null;
  const expiresAt = new Date(Date.now() + (json.expires_in || 3600) * 1000).toISOString();
  await databases.updateDocument(DATABASE_ID, COLLECTIONS.spotifyIntegrations, doc.$id, {
    accessToken: json.access_token,
    expiresAt,
    ...(json.refresh_token ? { refreshToken: json.refresh_token } : {}),
  });
  return json.access_token;
}

async function validAccessToken(
  databases: Databases,
  userId: string
): Promise<string | null> {
  const doc = await getIntegration(databases, userId);
  if (!doc) return null;
  const expires = new Date(String(doc.expiresAt)).getTime();
  if (Date.now() < expires - 60_000) return String(doc.accessToken);
  return refreshAccessToken(databases, {
    $id: doc.$id,
    refreshToken: String(doc.refreshToken || ''),
  });
}

export async function handleSpotifyApiRequest(
  req: FunctionRequest,
  res: FunctionResponse,
  log: Logger = noopLogger
) {
  const databases = getDatabases();
  const method = (req.method || 'GET').toUpperCase();
  const rawBody = parseBody(req);
  const path = resolveRoutePath(req, rawBody);
  const body = stripRouteMeta(rawBody);

  try {
    const userId = await verifyAuth(req);

    // GET /spotify/status
    if (path === '/spotify/me' && method === 'GET') {
      if (!requireAuth(res, userId)) return;
      const configured = Boolean(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET);
      if (!configured) {
        return jsonResponse(res, {
          success: true,
          configured: false,
          linked: false,
          hint: 'Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET on the Function',
        });
      }
      const doc = await getIntegration(databases, userId!);
      return jsonResponse(res, {
        success: true,
        configured: true,
        linked: Boolean(doc),
        displayName: doc?.displayName || null,
        spotifyUserId: doc?.spotifyUserId || null,
      });
    }

    // GET /spotify/auth-url
    if (path === '/spotify/auth-url' && method === 'GET') {
      if (!requireAuth(res, userId)) return;
      if (!SPOTIFY_CLIENT_ID) {
        return errorResponse(res, 'SPOTIFY_NOT_CONFIGURED', 'Spotify Client ID missing', 503);
      }
      const verifier = base64Url(randomBytes(32));
      const challenge = base64Url(createHash('sha256').update(verifier).digest());
      const state = base64Url(randomBytes(16));
      const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: SPOTIFY_REDIRECT,
        scope: SCOPES,
        state,
        code_challenge_method: 'S256',
        code_challenge: challenge,
      });
      return jsonResponse(res, {
        success: true,
        url: `https://accounts.spotify.com/authorize?${params}`,
        verifier,
        state,
        redirectUri: SPOTIFY_REDIRECT,
      });
    }

    // POST /spotify/callback
    if (path === '/spotify/callback' && method === 'POST') {
      if (!requireAuth(res, userId)) return;
      if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        return errorResponse(res, 'SPOTIFY_NOT_CONFIGURED', 'Spotify not configured', 503);
      }
      const code = String(body.code || '');
      const verifier = String(body.verifier || '');
      if (!code || !verifier) return errorResponse(res, 'INVALID_BODY', 'code and verifier required');

      const tokenBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_REDIRECT,
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: verifier,
      });
      const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenBody,
      });
      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        log.error(`Spotify token error: ${errText}`);
        return errorResponse(res, 'SPOTIFY_TOKEN', 'Token exchange failed', 400);
      }
      const tokens = (await tokenRes.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      const meRes = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const me = meRes.ok
        ? ((await meRes.json()) as { id?: string; display_name?: string })
        : {};

      const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
      const existing = await getIntegration(databases, userId!);
      const payload = {
        userId: userId!,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        spotifyUserId: me.id || '',
        displayName: me.display_name || '',
        linkedAt: new Date().toISOString(),
      };
      if (existing) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.spotifyIntegrations,
          existing.$id,
          payload
        );
      } else {
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.spotifyIntegrations,
          ID.unique(),
          payload
        );
      }
      return jsonResponse(res, {
        success: true,
        displayName: payload.displayName,
        spotifyUserId: payload.spotifyUserId,
      });
    }

    // DELETE /spotify/unlink
    if (path === '/spotify/unlink' && method === 'DELETE') {
      if (!requireAuth(res, userId)) return;
      const existing = await getIntegration(databases, userId!);
      if (existing) {
        await databases.deleteDocument(
          DATABASE_ID,
          COLLECTIONS.spotifyIntegrations,
          existing.$id
        );
      }
      return jsonResponse(res, { success: true });
    }

    // GET /spotify/currently-playing
    if (path === '/spotify/currently-playing' && method === 'GET') {
      if (!requireAuth(res, userId)) return;
      const token = await validAccessToken(databases, userId!);
      if (!token) {
        return jsonResponse(res, { success: true, playing: false, linked: false });
      }
      const resSp = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resSp.status === 204) {
        return jsonResponse(res, { success: true, playing: false, linked: true });
      }
      if (!resSp.ok) {
        return jsonResponse(res, { success: true, playing: false, linked: true });
      }
      const data = (await resSp.json()) as {
        is_playing?: boolean;
        item?: {
          name?: string;
          artists?: Array<{ name?: string }>;
          album?: { images?: Array<{ url?: string }> };
        };
      };
      const item = data.item;
      return jsonResponse(res, {
        success: true,
        linked: true,
        playing: Boolean(data.is_playing),
        title: item?.name || null,
        artist: item?.artists?.map((a) => a.name).filter(Boolean).join(', ') || null,
        artUrl: item?.album?.images?.[0]?.url || null,
        source: 'spotify',
      });
    }

    return errorResponse(res, 'NOT_FOUND', `Unknown spotify route: ${path}`, 404);
  } catch (err) {
    log.error(`spotify-api error: ${formatError(err)}`);
    return errorResponse(res, 'INTERNAL_ERROR', formatError(err), 500);
  }
}
