import { Client, Users, Databases, Query, ID } from 'node-appwrite';
import {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY,
  DATABASE_ID,
  COLLECTIONS,
  STEAM_API_KEY,
} from './lib/config';
import {
  parseBody,
  getClientIp,
  verifyAuth,
  jsonResponse,
  errorResponse,
  requireAuth,
  resolveRoutePath,
  stripRouteMeta,
} from './lib/middleware';
import { checkRateLimit } from './lib/rate-limit';
import {
  validateEmail,
  validatePassword,
  validateName,
  validateDisplayName,
  validateBio,
  validateCardTheme,
  validatePresence,
  validateCustomStatus,
  stripHtml,
} from './lib/validators';
import { generateUniqueFriendCode } from './lib/friend-code';
import { formatError } from './lib/runtime';
import type { FunctionRequest, FunctionResponse } from './lib/runtime';

type Logger = { log: (msg: string) => void; error: (msg: string) => void };
const noopLogger: Logger = { log: () => {}, error: console.error };

function getServerClient(): Client {
  return new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
}

function getDatabases(): Databases {
  return new Databases(getServerClient());
}

function getUsers(): Users {
  return new Users(getServerClient());
}

function defaultPreferences() {
  return JSON.stringify({ theme: 'dark', notifications: true, autoLogin: false });
}

function defaultCardTheme() {
  return JSON.stringify({ accentColor: '#8b5cf6', gradientPreset: 'violet-fuchsia', glowEnabled: true });
}

function toPrivateProfile(doc: Record<string, unknown>) {
  return {
    $id: doc.$id,
    userId: doc.userId,
    email: doc.email,
    name: doc.name,
    displayName: doc.displayName || doc.name,
    friendCode: doc.friendCode,
    createdAt: doc.createdAt,
    steamLinked: doc.steamLinked ?? false,
    steamId: doc.steamId ?? null,
    preferences: doc.preferences,
    bio: doc.bio ?? '',
    avatarFileId: doc.avatarFileId ?? null,
    bannerFileId: doc.bannerFileId ?? null,
    cardTheme: doc.cardTheme ?? defaultCardTheme(),
    presence: doc.presence ?? 'offline',
    customStatus: doc.customStatus ?? '',
    lastSeen: doc.lastSeen ?? null,
    emailVerified: doc.emailVerified ?? false,
    friendCodeRegeneratedAt: doc.friendCodeRegeneratedAt ?? null,
  };
}

function toPublicProfile(doc: Record<string, unknown>) {
  return {
    userId: doc.userId,
    displayName: doc.displayName || doc.name,
    bio: doc.bio ?? '',
    avatarFileId: doc.avatarFileId ?? null,
    bannerFileId: doc.bannerFileId ?? null,
    cardTheme: doc.cardTheme ?? defaultCardTheme(),
    presence: doc.presence ?? 'offline',
    customStatus: doc.customStatus ?? '',
    lastSeen: doc.lastSeen ?? null,
    createdAt: doc.createdAt,
  };
}

async function createEmailSession(email: string, password: string) {
  const response = await fetch(`${APPWRITE_ENDPOINT}/account/sessions/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': APPWRITE_PROJECT_ID,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || 'Login failed');
  }

  return response.json() as Promise<{ $id: string; userId: string; secret: string }>;
}

async function getProfileByUserId(databases: Databases, userId: string) {
  try {
    return await databases.getDocument(DATABASE_ID, COLLECTIONS.userProfiles, userId);
  } catch {
    return null;
  }
}

async function createProfileForUser(
  databases: Databases,
  userId: string,
  email: string,
  name: string
) {
  const friendCode = await generateUniqueFriendCode(databases);
  return databases.createDocument(DATABASE_ID, COLLECTIONS.userProfiles, userId, {
    userId,
    email,
    name,
    displayName: name.slice(0, 32),
    friendCode,
    createdAt: new Date().toISOString(),
    steamLinked: false,
    steamId: null,
    preferences: defaultPreferences(),
    bio: '',
    cardTheme: defaultCardTheme(),
    presence: 'offline',
    customStatus: '',
    emailVerified: false,
  });
}

async function getSteamIntegration(databases: Databases, userId: string) {
  const docs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.steamIntegrations, [
    Query.equal('userId', userId),
    Query.limit(1),
  ]);
  return docs.documents[0] || null;
}

async function validateSteamId(steamId: string): Promise<{ valid: boolean; player?: Record<string, string> }> {
  if (!STEAM_API_KEY) return { valid: false };
  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`;
  const response = await fetch(url);
  const data = await response.json() as { response?: { players?: Array<Record<string, string>> } };
  const player = data.response?.players?.[0];
  if (!player) return { valid: false };
  return {
    valid: true,
    player: {
      personaName: player.personaname,
      avatarUrl: player.avatarfull || player.avatarmedium || player.avatar,
      profileUrl: player.profileurl,
    },
  };
}

async function resolveVanityUrl(vanityUrl: string): Promise<string | null> {
  if (!STEAM_API_KEY) return null;
  const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_API_KEY}&vanityurl=${encodeURIComponent(vanityUrl)}`;
  const response = await fetch(url);
  const data = await response.json() as { response?: { success?: number; steamid?: string } };
  if (data.response?.success === 1) return data.response.steamid || null;
  return null;
}

export async function handleAuthApiRequest(
  req: FunctionRequest,
  res: FunctionResponse,
  logger: Logger = noopLogger
) {
  const method = (req.method || 'POST').toUpperCase();
  let rawBody: Record<string, unknown> = {};
  try {
    rawBody = method === 'GET' ? {} : parseBody(req);
  } catch (err) {
    logger.error(`parseBody failed: ${err}`);
    rawBody = {};
  }
  const path = resolveRoutePath(req, rawBody);
  const body = stripRouteMeta(rawBody);
  const ip = getClientIp(req);
  const databases = getDatabases();

  logger.log(`Auth ${method} ${path}`);

  try {
    // POST /auth/register
    if (path === '/auth/register' && method === 'POST') {
      const rate = await checkRateLimit('register', ip);
      if (!rate.allowed) return errorResponse(res, rate.code || 'RATE_LIMITED', 'Too many registration attempts', 429);

      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const name = String(body.name || '').trim();

      const emailErr = validateEmail(email);
      if (emailErr) return errorResponse(res, emailErr, 'Invalid email');
      const passErr = validatePassword(password);
      if (passErr) return errorResponse(res, passErr, 'Password must be at least 8 characters with a letter and digit');
      const nameErr = validateName(name);
      if (nameErr) return errorResponse(res, nameErr, 'Invalid name');

      const users = getUsers();
      const userId = ID.unique();

      try {
        await users.create(userId, email, undefined, password, name);
      } catch (err: unknown) {
        const e = err as { code?: number; message?: string };
        if (e.code === 409) return errorResponse(res, 'EMAIL_TAKEN', 'Email already registered', 409);
        throw err;
      }

      await createProfileForUser(databases, userId, email, name);

      const profile = await getProfileByUserId(databases, userId);

      return jsonResponse(res, {
        success: true,
        profile: profile ? toPrivateProfile(profile as Record<string, unknown>) : null,
      });
    }

    // POST /auth/login
    if (path === '/auth/login' && method === 'POST') {
      const rate = await checkRateLimit('login', ip);
      if (!rate.allowed) return errorResponse(res, rate.code || 'RATE_LIMITED', 'Too many login attempts', 429);

      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (validateEmail(email)) return errorResponse(res, 'INVALID_EMAIL', 'Invalid email');
      if (!password) return errorResponse(res, 'INVALID_CREDENTIALS', 'Invalid credentials', 401);

      try {
        await createEmailSession(email, password);
        const users = getUsers();
        const listed = await users.list([Query.equal('email', email), Query.limit(1)]);
        const userId = listed.users[0]?.$id;
        const profile = userId ? await getProfileByUserId(databases, userId) : null;
        return jsonResponse(res, {
          success: true,
          profile: profile ? toPrivateProfile(profile as Record<string, unknown>) : null,
        });
      } catch {
        return errorResponse(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
      }
    }

    const userId = await verifyAuth(req);

    // POST /auth/profile/init — create Quark profile after client-side account.create
    if (path === '/auth/profile/init' && method === 'POST') {
      if (!requireAuth(res, userId)) return;
      logger.log(`Profile init for user ${userId}`);

      const existing = await getProfileByUserId(databases, userId!);
      if (existing) {
        logger.log(`Profile already exists for ${userId}`);
        return jsonResponse(res, {
          success: true,
          profile: toPrivateProfile(existing as Record<string, unknown>),
        });
      }

      const users = getUsers();
      const user = await users.get(userId!);
      const name = String(body.name || user.name || 'User').trim();
      const email = String(user.email || '').trim().toLowerCase();
      const nameErr = validateName(name);
      if (nameErr) return errorResponse(res, nameErr, 'Invalid name');

      logger.log(`Creating profile doc for ${userId} (${email})`);
      await createProfileForUser(databases, userId!, email, name);
      const profile = await getProfileByUserId(databases, userId!);
      logger.log(`Profile created for ${userId}`);
      return jsonResponse(res, {
        success: true,
        profile: profile ? toPrivateProfile(profile as Record<string, unknown>) : null,
      });
    }

    // GET /auth/me
    if (path === '/auth/me' && method === 'GET') {
      if (!requireAuth(res, userId)) return;
      const profile = await getProfileByUserId(databases, userId);
      if (!profile) return errorResponse(res, 'PROFILE_NOT_FOUND', 'Profile not found', 404);
      const steam = await getSteamIntegration(databases, userId);
      return jsonResponse(res, {
        success: true,
        profile: toPrivateProfile(profile as Record<string, unknown>),
        steamIntegration: steam || null,
      });
    }

    // PATCH /auth/profile
    if (path === '/auth/profile' && method === 'PATCH') {
      if (!requireAuth(res, userId)) return;
      const rate = await checkRateLimit('profile/patch', userId);
      if (!rate.allowed) return errorResponse(res, rate.code || 'RATE_LIMITED', 'Too many profile updates', 429);

      const updates: Record<string, unknown> = {};

      if (body.displayName !== undefined) {
        const dn = String(body.displayName).trim();
        const err = validateDisplayName(dn);
        if (err) return errorResponse(res, err, 'Invalid display name');
        updates.displayName = dn;
      }
      if (body.bio !== undefined) {
        const bio = stripHtml(String(body.bio));
        const err = validateBio(bio);
        if (err) return errorResponse(res, err, 'Invalid bio');
        updates.bio = bio;
      }
      if (body.cardTheme !== undefined) {
        const raw = typeof body.cardTheme === 'string' ? body.cardTheme : JSON.stringify(body.cardTheme);
        const result = validateCardTheme(raw);
        if (!result.valid) return errorResponse(res, result.error || 'INVALID_CARD_THEME', 'Invalid card theme');
        updates.cardTheme = raw;
      }
      if (body.customStatus !== undefined) {
        const status = String(body.customStatus);
        const err = validateCustomStatus(status);
        if (err) return errorResponse(res, err, 'Invalid custom status');
        updates.customStatus = status;
      }
      if (body.presence !== undefined) {
        const err = validatePresence(String(body.presence));
        if (err) return errorResponse(res, err, 'Invalid presence');
        updates.presence = body.presence;
        updates.lastSeen = new Date().toISOString();
      }
      if (body.preferences !== undefined) {
        const prefs = String(body.preferences);
        try {
          JSON.parse(prefs);
          updates.preferences = prefs;
        } catch {
          return errorResponse(res, 'INVALID_PREFERENCES', 'Invalid preferences JSON');
        }
      }

      if (Object.keys(updates).length === 0) {
        return errorResponse(res, 'NO_CHANGES', 'No valid fields to update');
      }

      const profile = await databases.updateDocument(DATABASE_ID, COLLECTIONS.userProfiles, userId, updates);
      return jsonResponse(res, { success: true, profile: toPrivateProfile(profile as Record<string, unknown>) });
    }

    // POST /auth/password
    if (path === '/auth/password' && method === 'POST') {
      if (!requireAuth(res, userId)) return;
      const oldPassword = String(body.oldPassword || '');
      const newPassword = String(body.newPassword || '');
      const passErr = validatePassword(newPassword);
      if (passErr) return errorResponse(res, passErr, 'Weak password');

      const jwt = req.headers?.['x-appwrite-jwt'];
      if (!jwt) return errorResponse(res, 'UNAUTHORIZED', 'JWT required', 401);

      const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setJWT(jwt);
      const { Account } = await import('node-appwrite');
      const account = new Account(client);
      await account.updatePassword(newPassword, oldPassword);
      return jsonResponse(res, { success: true });
    }

    // POST /auth/friend-code/regenerate
    if (path === '/auth/friend-code/regenerate' && method === 'POST') {
      if (!requireAuth(res, userId)) return;
      const rate = await checkRateLimit('friend-code/regenerate', userId);
      if (!rate.allowed) return errorResponse(res, rate.code || 'RATE_LIMITED', 'Can only regenerate once per 24h', 429);

      const profile = await getProfileByUserId(databases, userId);
      if (profile?.friendCodeRegeneratedAt) {
        const last = new Date(profile.friendCodeRegeneratedAt as string).getTime();
        if (Date.now() - last < 24 * 60 * 60 * 1000) {
          return errorResponse(res, 'RATE_LIMITED', 'Can only regenerate once per 24h', 429);
        }
      }

      const friendCode = await generateUniqueFriendCode(databases);
      const updated = await databases.updateDocument(DATABASE_ID, COLLECTIONS.userProfiles, userId, {
        friendCode,
        friendCodeRegeneratedAt: new Date().toISOString(),
      });
      return jsonResponse(res, { success: true, friendCode: updated.friendCode });
    }

    // POST /auth/steam/link
    if (path === '/auth/steam/link' && method === 'POST') {
      if (!requireAuth(res, userId)) return;
      let steamId = String(body.steamId || '').trim();
      const vanityUrl = String(body.vanityUrl || '').trim();

      if (!steamId && vanityUrl) {
        const resolved = await resolveVanityUrl(vanityUrl);
        if (!resolved) return errorResponse(res, 'INVALID_STEAM_ID', 'Could not resolve Steam profile');
        steamId = resolved;
      }

      if (!steamId) return errorResponse(res, 'INVALID_STEAM_ID', 'Steam ID required');

      const validation = await validateSteamId(steamId);
      if (!validation.valid || !validation.player) {
        return errorResponse(res, 'INVALID_STEAM_ID', 'Invalid Steam ID');
      }

      const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.steamIntegrations, [
        Query.equal('userId', userId),
        Query.limit(1),
      ]);

      const integrationData = {
        userId,
        steamId,
        personaName: validation.player.personaName,
        avatarUrl: validation.player.avatarUrl,
        profileUrl: validation.player.profileUrl,
        linkedAt: new Date().toISOString(),
      };

      if (existing.documents.length > 0) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.steamIntegrations,
          existing.documents[0].$id,
          integrationData
        );
      } else {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.steamIntegrations, ID.unique(), integrationData);
      }

      await databases.updateDocument(DATABASE_ID, COLLECTIONS.userProfiles, userId, {
        steamLinked: true,
        steamId,
      });

      const profile = await getProfileByUserId(databases, userId);
      logger.log(`Steam linked for ${userId}: ${steamId}`);
      return jsonResponse(res, {
        success: true,
        steamIntegration: integrationData,
        profile: profile ? toPrivateProfile(profile as Record<string, unknown>) : null,
      });
    }

    // POST /auth/steam/unlink
    if (path === '/auth/steam/unlink' && method === 'POST') {
      if (!requireAuth(res, userId)) return;
      const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.steamIntegrations, [
        Query.equal('userId', userId),
        Query.limit(1),
      ]);
      if (existing.documents.length > 0) {
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.steamIntegrations, existing.documents[0].$id);
      }
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.userProfiles, userId, {
        steamLinked: false,
        steamId: null,
      });
      return jsonResponse(res, { success: true });
    }

    return errorResponse(res, 'NOT_FOUND', 'Auth endpoint not found', 404);
  } catch (err) {
    logger.error(`Auth API error on ${method} ${path}: ${formatError(err)}`);
    return errorResponse(res, 'INTERNAL_ERROR', 'Request failed', 500);
  }
}

export { toPublicProfile, toPrivateProfile, getProfileByUserId };
