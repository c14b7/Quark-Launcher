"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAuthApiRequest = handleAuthApiRequest;
exports.toPublicProfile = toPublicProfile;
exports.toPrivateProfile = toPrivateProfile;
exports.getProfileByUserId = getProfileByUserId;
const node_appwrite_1 = require("node-appwrite");
const file_1 = require("node-appwrite/file");
const config_1 = require("./lib/config");
const middleware_1 = require("./lib/middleware");
const rate_limit_1 = require("./lib/rate-limit");
const validators_1 = require("./lib/validators");
const friend_code_1 = require("./lib/friend-code");
const runtime_1 = require("./lib/runtime");
const noopLogger = { log: () => { }, error: console.error };
function getServerClient() {
    return new node_appwrite_1.Client()
        .setEndpoint(config_1.APPWRITE_ENDPOINT)
        .setProject(config_1.APPWRITE_PROJECT_ID)
        .setKey(config_1.APPWRITE_API_KEY);
}
function getDatabases() {
    return new node_appwrite_1.Databases(getServerClient());
}
function getUsers() {
    return new node_appwrite_1.Users(getServerClient());
}
function getStorage() {
    return new node_appwrite_1.Storage(getServerClient());
}
const ALLOWED_AVATAR_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
function buildAvatarViewUrl(fileId) {
    return `${config_1.APPWRITE_ENDPOINT}/storage/buckets/${config_1.BUCKETS.userMedia}/files/${fileId}/view?project=${config_1.APPWRITE_PROJECT_ID}`;
}
function defaultPreferences() {
    return JSON.stringify({ theme: 'dark', notifications: true, autoLogin: false });
}
function defaultCardTheme() {
    return JSON.stringify({ accentColor: '#8b5cf6', gradientPreset: 'violet-fuchsia', glowEnabled: true });
}
function toPrivateProfile(doc) {
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
function getPublicDisplayFields(preferences) {
    try {
        const raw = typeof preferences === 'string' ? preferences : '';
        const p = raw ? JSON.parse(raw) : {};
        return {
            pronouns: typeof p.pronouns === 'string' ? p.pronouns.slice(0, 24) : '',
            location: typeof p.location === 'string' ? p.location.slice(0, 48) : '',
        };
    }
    catch {
        return { pronouns: '', location: '' };
    }
}
function toPublicProfile(doc) {
    const display = getPublicDisplayFields(doc.preferences);
    return {
        userId: doc.userId,
        displayName: doc.displayName || doc.name,
        bio: doc.bio ?? '',
        avatarFileId: doc.avatarFileId ?? null,
        bannerFileId: doc.bannerFileId ?? null,
        cardTheme: doc.cardTheme ?? defaultCardTheme(),
        presence: doc.presence ?? 'offline',
        customStatus: doc.customStatus ?? '',
        pronouns: display.pronouns || undefined,
        location: display.location || undefined,
        lastSeen: doc.lastSeen ?? null,
        createdAt: doc.createdAt,
    };
}
async function createEmailSession(email, password) {
    const response = await fetch(`${config_1.APPWRITE_ENDPOINT}/account/sessions/email`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': config_1.APPWRITE_PROJECT_ID,
        },
        body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Login failed');
    }
    return response.json();
}
async function getProfileByUserId(databases, userId) {
    try {
        return await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userProfiles, userId);
    }
    catch {
        return null;
    }
}
async function createProfileForUser(databases, userId, email, name) {
    const friendCode = await (0, friend_code_1.generateUniqueFriendCode)(databases);
    return databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userProfiles, userId, {
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
async function getSteamIntegration(databases, userId) {
    const docs = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.steamIntegrations, [
        node_appwrite_1.Query.equal('userId', userId),
        node_appwrite_1.Query.limit(1),
    ]);
    return docs.documents[0] || null;
}
async function validateSteamId(steamId) {
    if (!config_1.STEAM_API_KEY)
        return { valid: false };
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${config_1.STEAM_API_KEY}&steamids=${steamId}`;
    const response = await fetch(url);
    const data = await response.json();
    const player = data.response?.players?.[0];
    if (!player)
        return { valid: false };
    return {
        valid: true,
        player: {
            personaName: player.personaname,
            avatarUrl: player.avatarfull || player.avatarmedium || player.avatar,
            profileUrl: player.profileurl,
        },
    };
}
async function resolveVanityUrl(vanityUrl) {
    if (!config_1.STEAM_API_KEY)
        return null;
    const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${config_1.STEAM_API_KEY}&vanityurl=${encodeURIComponent(vanityUrl)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.response?.success === 1)
        return data.response.steamid || null;
    return null;
}
async function handleAuthApiRequest(req, res, logger = noopLogger) {
    const method = (req.method || 'POST').toUpperCase();
    let rawBody = {};
    try {
        rawBody = method === 'GET' ? {} : (0, middleware_1.parseBody)(req);
    }
    catch (err) {
        logger.error(`parseBody failed: ${err}`);
        rawBody = {};
    }
    const path = (0, middleware_1.resolveRoutePath)(req, rawBody);
    const body = (0, middleware_1.stripRouteMeta)(rawBody);
    const ip = (0, middleware_1.getClientIp)(req);
    const databases = getDatabases();
    logger.log(`Auth ${method} ${path}`);
    try {
        // POST /auth/register
        if (path === '/auth/register' && method === 'POST') {
            const rate = await (0, rate_limit_1.checkRateLimit)('register', ip);
            if (!rate.allowed)
                return (0, middleware_1.errorResponse)(res, rate.code || 'RATE_LIMITED', 'Too many registration attempts', 429);
            const email = String(body.email || '').trim().toLowerCase();
            const password = String(body.password || '');
            const name = String(body.name || '').trim();
            const emailErr = (0, validators_1.validateEmail)(email);
            if (emailErr)
                return (0, middleware_1.errorResponse)(res, emailErr, 'Invalid email');
            const passErr = (0, validators_1.validatePassword)(password);
            if (passErr)
                return (0, middleware_1.errorResponse)(res, passErr, 'Password must be at least 8 characters with a letter and digit');
            const nameErr = (0, validators_1.validateName)(name);
            if (nameErr)
                return (0, middleware_1.errorResponse)(res, nameErr, 'Invalid name');
            const users = getUsers();
            const userId = node_appwrite_1.ID.unique();
            try {
                await users.create(userId, email, undefined, password, name);
            }
            catch (err) {
                const e = err;
                if (e.code === 409)
                    return (0, middleware_1.errorResponse)(res, 'EMAIL_TAKEN', 'Email already registered', 409);
                throw err;
            }
            await createProfileForUser(databases, userId, email, name);
            const profile = await getProfileByUserId(databases, userId);
            return (0, middleware_1.jsonResponse)(res, {
                success: true,
                profile: profile ? toPrivateProfile(profile) : null,
            });
        }
        // POST /auth/login
        if (path === '/auth/login' && method === 'POST') {
            const rate = await (0, rate_limit_1.checkRateLimit)('login', ip);
            if (!rate.allowed)
                return (0, middleware_1.errorResponse)(res, rate.code || 'RATE_LIMITED', 'Too many login attempts', 429);
            const email = String(body.email || '').trim().toLowerCase();
            const password = String(body.password || '');
            if ((0, validators_1.validateEmail)(email))
                return (0, middleware_1.errorResponse)(res, 'INVALID_EMAIL', 'Invalid email');
            if (!password)
                return (0, middleware_1.errorResponse)(res, 'INVALID_CREDENTIALS', 'Invalid credentials', 401);
            try {
                await createEmailSession(email, password);
                const users = getUsers();
                const listed = await users.list([node_appwrite_1.Query.equal('email', email), node_appwrite_1.Query.limit(1)]);
                const userId = listed.users[0]?.$id;
                const profile = userId ? await getProfileByUserId(databases, userId) : null;
                return (0, middleware_1.jsonResponse)(res, {
                    success: true,
                    profile: profile ? toPrivateProfile(profile) : null,
                });
            }
            catch {
                return (0, middleware_1.errorResponse)(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
            }
        }
        const userId = await (0, middleware_1.verifyAuth)(req);
        // POST /auth/profile/init — create Quark profile after client-side account.create
        if (path === '/auth/profile/init' && method === 'POST') {
            if (!(0, middleware_1.requireAuth)(res, userId))
                return;
            logger.log(`Profile init for user ${userId}`);
            const existing = await getProfileByUserId(databases, userId);
            if (existing) {
                logger.log(`Profile already exists for ${userId}`);
                return (0, middleware_1.jsonResponse)(res, {
                    success: true,
                    profile: toPrivateProfile(existing),
                });
            }
            const users = getUsers();
            const user = await users.get(userId);
            const name = String(body.name || user.name || 'User').trim();
            const email = String(user.email || '').trim().toLowerCase();
            const nameErr = (0, validators_1.validateName)(name);
            if (nameErr)
                return (0, middleware_1.errorResponse)(res, nameErr, 'Invalid name');
            logger.log(`Creating profile doc for ${userId} (${email})`);
            await createProfileForUser(databases, userId, email, name);
            const profile = await getProfileByUserId(databases, userId);
            logger.log(`Profile created for ${userId}`);
            return (0, middleware_1.jsonResponse)(res, {
                success: true,
                profile: profile ? toPrivateProfile(profile) : null,
            });
        }
        // GET /auth/me
        if (path === '/auth/me' && method === 'GET') {
            if (!(0, middleware_1.requireAuth)(res, userId))
                return;
            const profile = await getProfileByUserId(databases, userId);
            if (!profile)
                return (0, middleware_1.errorResponse)(res, 'PROFILE_NOT_FOUND', 'Profile not found', 404);
            const steam = await getSteamIntegration(databases, userId);
            return (0, middleware_1.jsonResponse)(res, {
                success: true,
                profile: toPrivateProfile(profile),
                steamIntegration: steam || null,
            });
        }
        // POST /auth/avatar
        if (path === '/auth/avatar' && method === 'POST') {
            if (!(0, middleware_1.requireAuth)(res, userId))
                return;
            const rate = await (0, rate_limit_1.checkRateLimit)('avatar/upload', userId);
            if (!rate.allowed)
                return (0, middleware_1.errorResponse)(res, rate.code || 'RATE_LIMITED', 'Too many avatar uploads', 429);
            const mimeType = String(body.mimeType || '').toLowerCase();
            const data = String(body.data || '');
            if (!ALLOWED_AVATAR_TYPES.has(mimeType)) {
                return (0, middleware_1.errorResponse)(res, 'INVALID_AVATAR', 'Unsupported image type');
            }
            if (!data) {
                return (0, middleware_1.errorResponse)(res, 'INVALID_AVATAR', 'No image data provided');
            }
            let buffer;
            try {
                buffer = Buffer.from(data, 'base64');
            }
            catch {
                return (0, middleware_1.errorResponse)(res, 'INVALID_AVATAR', 'Invalid image data');
            }
            if (buffer.length > MAX_AVATAR_BYTES) {
                return (0, middleware_1.errorResponse)(res, 'AVATAR_TOO_LARGE', 'Image too large (max 5 MB)');
            }
            if (buffer.length < 32) {
                return (0, middleware_1.errorResponse)(res, 'INVALID_AVATAR', 'Image file is too small');
            }
            const profileDoc = await getProfileByUserId(databases, userId);
            if (!profileDoc)
                return (0, middleware_1.errorResponse)(res, 'PROFILE_NOT_FOUND', 'Profile not found', 404);
            const storage = getStorage();
            const fileId = node_appwrite_1.ID.unique();
            const ext = mimeType === 'image/png' ? 'png'
                : mimeType === 'image/webp' ? 'webp'
                    : mimeType === 'image/gif' ? 'gif'
                        : 'jpg';
            if (profileDoc.avatarFileId) {
                try {
                    await storage.deleteFile(config_1.BUCKETS.userMedia, String(profileDoc.avatarFileId));
                }
                catch {
                    // previous file may already be gone
                }
            }
            await storage.createFile(config_1.BUCKETS.userMedia, fileId, file_1.InputFile.fromBuffer(buffer, `avatar.${ext}`), [
                node_appwrite_1.Permission.read(node_appwrite_1.Role.any()),
                node_appwrite_1.Permission.update(node_appwrite_1.Role.user(userId)),
                node_appwrite_1.Permission.delete(node_appwrite_1.Role.user(userId)),
            ]);
            const updated = await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userProfiles, userId, {
                avatarFileId: fileId,
            });
            return (0, middleware_1.jsonResponse)(res, {
                success: true,
                fileId,
                avatarUrl: buildAvatarViewUrl(fileId),
                profile: toPrivateProfile(updated),
            });
        }
        // PATCH /auth/profile
        if (path === '/auth/profile' && method === 'PATCH') {
            if (!(0, middleware_1.requireAuth)(res, userId))
                return;
            const rate = await (0, rate_limit_1.checkRateLimit)('profile/patch', userId);
            if (!rate.allowed)
                return (0, middleware_1.errorResponse)(res, rate.code || 'RATE_LIMITED', 'Too many profile updates', 429);
            const updates = {};
            if (body.displayName !== undefined) {
                const dn = String(body.displayName).trim();
                const err = (0, validators_1.validateDisplayName)(dn);
                if (err)
                    return (0, middleware_1.errorResponse)(res, err, 'Invalid display name');
                updates.displayName = dn;
            }
            if (body.bio !== undefined) {
                const bio = (0, validators_1.stripHtml)(String(body.bio));
                const err = (0, validators_1.validateBio)(bio);
                if (err)
                    return (0, middleware_1.errorResponse)(res, err, 'Invalid bio');
                updates.bio = bio;
            }
            if (body.cardTheme !== undefined) {
                const raw = typeof body.cardTheme === 'string' ? body.cardTheme : JSON.stringify(body.cardTheme);
                const result = (0, validators_1.validateCardTheme)(raw);
                if (!result.valid)
                    return (0, middleware_1.errorResponse)(res, result.error || 'INVALID_CARD_THEME', 'Invalid card theme');
                updates.cardTheme = raw;
            }
            if (body.customStatus !== undefined) {
                const status = String(body.customStatus);
                const err = (0, validators_1.validateCustomStatus)(status);
                if (err)
                    return (0, middleware_1.errorResponse)(res, err, 'Invalid custom status');
                updates.customStatus = status;
            }
            if (body.presence !== undefined) {
                const err = (0, validators_1.validatePresence)(String(body.presence));
                if (err)
                    return (0, middleware_1.errorResponse)(res, err, 'Invalid presence');
                updates.presence = body.presence;
                updates.lastSeen = new Date().toISOString();
            }
            if (body.preferences !== undefined) {
                const prefs = String(body.preferences);
                try {
                    JSON.parse(prefs);
                    updates.preferences = prefs;
                }
                catch {
                    return (0, middleware_1.errorResponse)(res, 'INVALID_PREFERENCES', 'Invalid preferences JSON');
                }
            }
            if (Object.keys(updates).length === 0) {
                return (0, middleware_1.errorResponse)(res, 'NO_CHANGES', 'No valid fields to update');
            }
            const profile = await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userProfiles, userId, updates);
            return (0, middleware_1.jsonResponse)(res, { success: true, profile: toPrivateProfile(profile) });
        }
        // POST /auth/password
        if (path === '/auth/password' && method === 'POST') {
            if (!(0, middleware_1.requireAuth)(res, userId))
                return;
            const oldPassword = String(body.oldPassword || '');
            const newPassword = String(body.newPassword || '');
            const passErr = (0, validators_1.validatePassword)(newPassword);
            if (passErr)
                return (0, middleware_1.errorResponse)(res, passErr, 'Weak password');
            const jwt = req.headers?.['x-appwrite-jwt'];
            if (!jwt)
                return (0, middleware_1.errorResponse)(res, 'UNAUTHORIZED', 'JWT required', 401);
            const client = new node_appwrite_1.Client().setEndpoint(config_1.APPWRITE_ENDPOINT).setProject(config_1.APPWRITE_PROJECT_ID).setJWT(jwt);
            const { Account } = await Promise.resolve().then(() => __importStar(require('node-appwrite')));
            const account = new Account(client);
            await account.updatePassword(newPassword, oldPassword);
            return (0, middleware_1.jsonResponse)(res, { success: true });
        }
        // POST /auth/friend-code/regenerate
        if (path === '/auth/friend-code/regenerate' && method === 'POST') {
            if (!(0, middleware_1.requireAuth)(res, userId))
                return;
            const rate = await (0, rate_limit_1.checkRateLimit)('friend-code/regenerate', userId);
            if (!rate.allowed)
                return (0, middleware_1.errorResponse)(res, rate.code || 'RATE_LIMITED', 'Can only regenerate once per 24h', 429);
            const profile = await getProfileByUserId(databases, userId);
            if (profile?.friendCodeRegeneratedAt) {
                const last = new Date(profile.friendCodeRegeneratedAt).getTime();
                if (Date.now() - last < 24 * 60 * 60 * 1000) {
                    return (0, middleware_1.errorResponse)(res, 'RATE_LIMITED', 'Can only regenerate once per 24h', 429);
                }
            }
            const friendCode = await (0, friend_code_1.generateUniqueFriendCode)(databases);
            const updated = await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userProfiles, userId, {
                friendCode,
                friendCodeRegeneratedAt: new Date().toISOString(),
            });
            return (0, middleware_1.jsonResponse)(res, { success: true, friendCode: updated.friendCode });
        }
        // POST /auth/steam/link
        if (path === '/auth/steam/link' && method === 'POST') {
            if (!(0, middleware_1.requireAuth)(res, userId))
                return;
            let steamId = String(body.steamId || '').trim();
            const vanityUrl = String(body.vanityUrl || '').trim();
            if (!steamId && vanityUrl) {
                const resolved = await resolveVanityUrl(vanityUrl);
                if (!resolved)
                    return (0, middleware_1.errorResponse)(res, 'INVALID_STEAM_ID', 'Could not resolve Steam profile');
                steamId = resolved;
            }
            if (!steamId)
                return (0, middleware_1.errorResponse)(res, 'INVALID_STEAM_ID', 'Steam ID required');
            const validation = await validateSteamId(steamId);
            if (!validation.valid || !validation.player) {
                return (0, middleware_1.errorResponse)(res, 'INVALID_STEAM_ID', 'Invalid Steam ID');
            }
            const existing = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.steamIntegrations, [
                node_appwrite_1.Query.equal('userId', userId),
                node_appwrite_1.Query.limit(1),
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
                await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.steamIntegrations, existing.documents[0].$id, integrationData);
            }
            else {
                await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.steamIntegrations, node_appwrite_1.ID.unique(), integrationData);
            }
            await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userProfiles, userId, {
                steamLinked: true,
                steamId,
            });
            const profile = await getProfileByUserId(databases, userId);
            logger.log(`Steam linked for ${userId}: ${steamId}`);
            return (0, middleware_1.jsonResponse)(res, {
                success: true,
                steamIntegration: integrationData,
                profile: profile ? toPrivateProfile(profile) : null,
            });
        }
        // POST /auth/steam/unlink
        if (path === '/auth/steam/unlink' && method === 'POST') {
            if (!(0, middleware_1.requireAuth)(res, userId))
                return;
            const existing = await databases.listDocuments(config_1.DATABASE_ID, config_1.COLLECTIONS.steamIntegrations, [
                node_appwrite_1.Query.equal('userId', userId),
                node_appwrite_1.Query.limit(1),
            ]);
            if (existing.documents.length > 0) {
                await databases.deleteDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.steamIntegrations, existing.documents[0].$id);
            }
            await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.userProfiles, userId, {
                steamLinked: false,
                steamId: null,
            });
            return (0, middleware_1.jsonResponse)(res, { success: true });
        }
        return (0, middleware_1.errorResponse)(res, 'NOT_FOUND', 'Auth endpoint not found', 404);
    }
    catch (err) {
        logger.error(`Auth API error on ${method} ${path}: ${(0, runtime_1.formatError)(err)}`);
        return (0, middleware_1.errorResponse)(res, 'INTERNAL_ERROR', 'Request failed', 500);
    }
}
