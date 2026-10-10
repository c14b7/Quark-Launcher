"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSpotifyApiRequest = handleSpotifyApiRequest;
const node_appwrite_1 = require("node-appwrite");
const crypto_1 = require("crypto");
const config_1 = require("./lib/config");
const middleware_1 = require("./lib/middleware");
const runtime_1 = require("./lib/runtime");
const noopLogger = { log: () => { }, error: console.error };
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_REDIRECT = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:39211/spotify/callback';
const SCOPES = ['user-read-currently-playing', 'user-read-playback-state', 'user-read-email'].join(' ');
function getDatabases() {
    const client = new node_appwrite_1.Client()
        .setEndpoint(config_1.APPWRITE_ENDPOINT)
        .setProject(config_1.APPWRITE_PROJECT_ID)
        .setKey(config_1.APPWRITE_API_KEY);
    return new node_appwrite_1.Databases(client);
}
function base64Url(buf) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function getIntegration(databases, userId) {
    const docs = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.spotifyIntegrations, [
        node_appwrite_1.Query.equal('userId', userId),
        node_appwrite_1.Query.limit(1),
    ]);
    return docs.documents[0] || null;
}
async function refreshAccessToken(databases, doc) {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET)
        return null;
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
    if (!res.ok)
        return null;
    const json = (await res.json());
    if (!json.access_token)
        return null;
    const expiresAt = new Date(Date.now() + (json.expires_in || 3600) * 1000).toISOString();
    await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.spotifyIntegrations, doc.$id, {
        accessToken: json.access_token,
        expiresAt,
        ...(json.refresh_token ? { refreshToken: json.refresh_token } : {}),
    });
    return json.access_token;
}
async function validAccessToken(databases, userId) {
    const doc = await getIntegration(databases, userId);
    if (!doc)
        return null;
    const expires = new Date(String(doc.expiresAt)).getTime();
    if (Date.now() < expires - 60000)
        return String(doc.accessToken);
    return refreshAccessToken(databases, {
        $id: doc.$id,
        refreshToken: String(doc.refreshToken || ''),
    });
}
async function handleSpotifyApiRequest(req, res, log = noopLogger) {
    const databases = getDatabases();
    const method = (req.method || 'GET').toUpperCase();
    const rawBody = (0, middleware_1.parseBody)(req);
    const path = (0, middleware_1.resolveRoutePath)(req, rawBody);
    const body = (0, middleware_1.stripRouteMeta)(rawBody);
    try {
        const userId = await (0, middleware_1.verifyAuth)(req);
        // GET /spotify/status
        if (path === '/spotify/me' && method === 'GET') {
            if (!(0, middleware_1.requireAuth)(res, userId))
                return;
            const configured = Boolean(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET);
            if (!configured) {
                return (0, middleware_1.jsonResponse)(res, {
                    success: true,
                    configured: false,
                    linked: false,
                    hint: 'Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET on the Function',
                });
            }
            const doc = await getIntegration(databases, userId);
            return (0, middleware_1.jsonResponse)(res, {
                success: true,
                configured: true,
                linked: Boolean(doc),
                displayName: doc?.displayName || null,
                spotifyUserId: doc?.spotifyUserId || null,
            });
        }
        // GET /spotify/auth-url
        if (path === '/spotify/auth-url' && method === 'GET') {
            if (!(0, middleware_1.requireAuth)(res, userId))
                return;
            if (!SPOTIFY_CLIENT_ID) {
                return (0, middleware_1.errorResponse)(res, 'SPOTIFY_NOT_CONFIGURED', 'Spotify Client ID missing', 503);
            }
            const verifier = base64Url((0, crypto_1.randomBytes)(32));
            const challenge = base64Url((0, crypto_1.createHash)('sha256').update(verifier).digest());
            const state = base64Url((0, crypto_1.randomBytes)(16));
            const params = new URLSearchParams({
                client_id: SPOTIFY_CLIENT_ID,
                response_type: 'code',
                redirect_uri: SPOTIFY_REDIRECT,
                scope: SCOPES,
                state,
                code_challenge_method: 'S256',
                code_challenge: challenge,
            });
            return (0, middleware_1.jsonResponse)(res, {
                success: true,
                url: `https://accounts.spotify.com/authorize?${params}`,
                verifier,
                state,
                redirectUri: SPOTIFY_REDIRECT,
            });
        }
        // POST /spotify/callback
        if (path === '/spotify/callback' && method === 'POST') {
            if (!(0, middleware_1.requireAuth)(res, userId))
                return;
            if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
                return (0, middleware_1.errorResponse)(res, 'SPOTIFY_NOT_CONFIGURED', 'Spotify not configured', 503);
            }
            const code = String(body.code || '');
            const verifier = String(body.verifier || '');
            if (!code || !verifier)
                return (0, middleware_1.errorResponse)(res, 'INVALID_BODY', 'code and verifier required');
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
                return (0, middleware_1.errorResponse)(res, 'SPOTIFY_TOKEN', 'Token exchange failed', 400);
            }
            const tokens = (await tokenRes.json());
            const meRes = await fetch('https://api.spotify.com/v1/me', {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
            });
            const me = meRes.ok
                ? (await meRes.json())
                : {};
            const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
            const existing = await getIntegration(databases, userId);
            const payload = {
                userId: userId,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt,
                spotifyUserId: me.id || '',
                displayName: me.display_name || '',
                linkedAt: new Date().toISOString(),
            };
            if (existing) {
                await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.spotifyIntegrations, existing.$id, payload);
            }
            else {
                await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.spotifyIntegrations, node_appwrite_1.ID.unique(), payload);
            }
            return (0, middleware_1.jsonResponse)(res, {
                success: true,
                displayName: payload.displayName,
                spotifyUserId: payload.spotifyUserId,
            });
        }
        // DELETE /spotify/unlink
        if (path === '/spotify/unlink' && method === 'DELETE') {
            if (!(0, middleware_1.requireAuth)(res, userId))
                return;
            const existing = await getIntegration(databases, userId);
            if (existing) {
                await databases.deleteDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.spotifyIntegrations, existing.$id);
            }
            return (0, middleware_1.jsonResponse)(res, { success: true });
        }
        // GET /spotify/currently-playing
        if (path === '/spotify/currently-playing' && method === 'GET') {
            if (!(0, middleware_1.requireAuth)(res, userId))
                return;
            const token = await validAccessToken(databases, userId);
            if (!token) {
                return (0, middleware_1.jsonResponse)(res, { success: true, playing: false, linked: false });
            }
            const resSp = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (resSp.status === 204) {
                return (0, middleware_1.jsonResponse)(res, { success: true, playing: false, linked: true });
            }
            if (!resSp.ok) {
                return (0, middleware_1.jsonResponse)(res, { success: true, playing: false, linked: true });
            }
            const data = (await resSp.json());
            const item = data.item;
            return (0, middleware_1.jsonResponse)(res, {
                success: true,
                linked: true,
                playing: Boolean(data.is_playing),
                title: item?.name || null,
                artist: item?.artists?.map((a) => a.name).filter(Boolean).join(', ') || null,
                artUrl: item?.album?.images?.[0]?.url || null,
                source: 'spotify',
            });
        }
        return (0, middleware_1.errorResponse)(res, 'NOT_FOUND', `Unknown spotify route: ${path}`, 404);
    }
    catch (err) {
        log.error(`spotify-api error: ${(0, runtime_1.formatError)(err)}`);
        return (0, middleware_1.errorResponse)(res, 'INTERNAL_ERROR', (0, runtime_1.formatError)(err), 500);
    }
}
