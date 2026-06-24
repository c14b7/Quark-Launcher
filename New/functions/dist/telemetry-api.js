"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTelemetryApiRequest = handleTelemetryApiRequest;
const node_appwrite_1 = require("node-appwrite");
const config_1 = require("./lib/config");
const middleware_1 = require("./lib/middleware");
const rate_limit_1 = require("./lib/rate-limit");
const runtime_1 = require("./lib/runtime");
const noopLogger = { log: () => { }, error: console.error };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_CATEGORIES = new Set([
    'session', 'navigation', 'game', 'social', 'auth', 'settings', 'update', 'error', 'feature',
]);
const ALLOWED_EVENTS = new Set([
    'app.launch', 'session.start', 'session.end', 'session.heartbeat',
    'navigation.view',
    'game.launch', 'game.launch_failed', 'library.scan', 'library.game_added',
    'auth.register', 'auth.login', 'auth.logout', 'auth.onboarding_complete',
    'profile.updated',
    'friends.request_sent', 'friends.request_accepted', 'friends.request_declined',
    'steam.linked', 'steam.unlinked',
    'settings.changed', 'feature.used', 'telemetry.consent_changed',
    'update.available', 'update.download_started', 'update.download_complete', 'update.installed', 'update.failed',
    'error.api', 'error.client', 'error.uncaught',
]);
const PRE_AUTH_EVENTS = new Set(['app.launch', 'session.start', 'session.end', 'session.heartbeat']);
const LOG_LEVELS = new Set(['debug', 'info', 'warn', 'error', 'fatal']);
function getDatabases() {
    const client = new node_appwrite_1.Client()
        .setEndpoint(config_1.APPWRITE_ENDPOINT)
        .setProject(config_1.APPWRITE_PROJECT_ID)
        .setKey(config_1.APPWRITE_API_KEY);
    return new node_appwrite_1.Databases(client);
}
function isUuid(value) {
    return typeof value === 'string' && UUID_RE.test(value);
}
function sanitizeString(input) {
    return input
        .replace(/[A-Z]:\\Users\\[^\\]+/gi, '<USER>')
        .replace(/[A-Z]:\\Users\\[^\\]+/gi, '<USER>')
        .replace(/\/Users\/[^/]+/g, '<USER>')
        .replace(/\/home\/[^/]+/g, '<USER>')
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '<EMAIL>')
        .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer <TOKEN>')
        .replace(/secret[=:]\s*\S+/gi, 'secret=<REDACTED>')
        .slice(0, 8000);
}
function sanitizeValue(value, depth = 0) {
    if (depth > 4)
        return '[truncated]';
    if (typeof value === 'string')
        return sanitizeString(value);
    if (Array.isArray(value))
        return value.slice(0, 20).map((v) => sanitizeValue(v, depth + 1));
    if (value && typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value).slice(0, 30)) {
            if (/password|token|secret|authorization|email/i.test(k))
                continue;
            out[k] = sanitizeValue(v, depth + 1);
        }
        return out;
    }
    return value;
}
function stringifyProperties(props) {
    try {
        const sanitized = sanitizeValue(props ?? {});
        const json = JSON.stringify(sanitized);
        return json.length > 2000 ? json.slice(0, 2000) : json;
    }
    catch {
        return '{}';
    }
}
function stringifyLogDetails(context, stack) {
    try {
        const payload = {
            context: sanitizeValue(context ?? {}),
            stack: stack ? sanitizeString(String(stack)).slice(0, 1500) : undefined,
        };
        const json = JSON.stringify(payload);
        return json.length > 3000 ? json.slice(0, 3000) : json;
    }
    catch {
        return '{}';
    }
}
async function upsertInstallation(databases, installation, userId, now) {
    const id = installation.installationId;
    const data = {
        lastSeenAt: now,
        appVersion: installation.appVersion || '',
        platform: installation.platform || 'web',
        arch: installation.arch || '',
        locale: installation.locale || '',
        electronVersion: installation.electronVersion || '',
        screenResolution: installation.screenResolution || '',
        userId: userId || '',
        analyticsEnabled: installation.analyticsEnabled !== false,
        diagnosticsEnabled: installation.diagnosticsEnabled !== false,
        optedOut: installation.analyticsEnabled === false && installation.diagnosticsEnabled === false,
    };
    try {
        await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.telemetryInstallations, id);
        await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.telemetryInstallations, id, data);
    }
    catch {
        await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.telemetryInstallations, id, {
            ...data,
            firstSeenAt: now,
        });
    }
}
async function upsertSession(databases, session, installationId, userId, appVersion, now) {
    const id = session.sessionId;
    const patch = {
        installationId,
        userId: userId || '',
        appVersion,
        lastActivityAt: now,
    };
    if (session.startedAt) {
        patch.startedAt = session.startedAt;
        patch.entryPoint = session.entryPoint || 'cold_start';
    }
    if (session.endedAt) {
        patch.endedAt = session.endedAt;
        patch.endReason = session.endReason || 'unknown';
        if (typeof session.durationSec === 'number')
            patch.durationSec = session.durationSec;
    }
    try {
        await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.telemetrySessions, id);
        await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.telemetrySessions, id, patch);
    }
    catch {
        if (!session.startedAt)
            return;
        await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.telemetrySessions, id, {
            ...patch,
            startedAt: session.startedAt,
            entryPoint: session.entryPoint || 'cold_start',
        });
    }
}
async function createEventDoc(databases, event, installationId, sessionId, userId, appVersion, now) {
    if (!ALLOWED_EVENTS.has(event.name))
        return false;
    if (!EVENT_CATEGORIES.has(event.category))
        return false;
    if (!isUuid(event.eventId))
        return false;
    try {
        await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.telemetryEvents, event.eventId);
        return true;
    }
    catch {
        /* new event */
    }
    await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.telemetryEvents, event.eventId, {
        installationId,
        sessionId,
        userId: userId || '',
        name: event.name,
        category: event.category,
        timestamp: event.timestamp,
        properties: stringifyProperties(event.properties),
    });
    return true;
}
async function createLogDoc(databases, log, installationId, sessionId, userId, appVersion, now) {
    if (!LOG_LEVELS.has(log.level))
        return false;
    if (!isUuid(log.logId))
        return false;
    try {
        await databases.getDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.telemetryLogs, log.logId);
        return true;
    }
    catch {
        /* new log */
    }
    await databases.createDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.telemetryLogs, log.logId, {
        installationId,
        sessionId,
        userId: userId || '',
        level: log.level,
        message: sanitizeString(String(log.message || '').slice(0, 500)),
        details: stringifyLogDetails(log.context, log.stack),
        timestamp: log.timestamp,
    });
    return true;
}
async function handleTelemetryApiRequest(req, res, logger = noopLogger) {
    const method = (req.method || 'POST').toUpperCase();
    let rawBody = {};
    try {
        rawBody = method === 'GET' ? {} : (0, middleware_1.parseBody)(req);
    }
    catch (err) {
        logger.error(`telemetry parseBody failed: ${err}`);
        rawBody = {};
    }
    const path = (0, middleware_1.resolveRoutePath)(req, rawBody);
    const body = (0, middleware_1.stripRouteMeta)(rawBody);
    const userId = await (0, middleware_1.verifyAuth)(req);
    const databases = getDatabases();
    logger.log(`Telemetry ${method} ${path} user=${userId || 'anon'}`);
    if (path === '/telemetry/ingest' && method === 'POST') {
        const installation = body.installation;
        const session = body.session;
        const events = Array.isArray(body.events) ? body.events : [];
        const logs = Array.isArray(body.logs) ? body.logs : [];
        if (!installation?.installationId || !isUuid(installation.installationId)) {
            return (0, middleware_1.errorResponse)(res, 'INVALID_INSTALLATION', 'Valid installationId required', 400);
        }
        if (!session?.sessionId || !isUuid(session.sessionId)) {
            return (0, middleware_1.errorResponse)(res, 'INVALID_SESSION', 'Valid sessionId required', 400);
        }
        if (events.length > 50 || logs.length > 20) {
            return (0, middleware_1.errorResponse)(res, 'BATCH_TOO_LARGE', 'Batch size exceeded', 400);
        }
        const rate = await (0, rate_limit_1.checkRateLimit)('telemetry/ingest', installation.installationId);
        if (!rate.allowed)
            return (0, middleware_1.errorResponse)(res, rate.code || 'RATE_LIMITED', 'Too many telemetry requests', 429);
        const optedOut = installation.analyticsEnabled === false && installation.diagnosticsEnabled === false;
        if (optedOut) {
            return (0, middleware_1.jsonResponse)(res, { success: true, accepted: { events: 0, logs: 0 }, optedOut: true });
        }
        const analyticsOff = installation.analyticsEnabled === false;
        const diagnosticsOff = installation.diagnosticsEnabled === false;
        if (!userId) {
            const hasDisallowed = events.some((e) => e?.name && !PRE_AUTH_EVENTS.has(e.name));
            if (hasDisallowed) {
                return (0, middleware_1.errorResponse)(res, 'UNAUTHORIZED', 'Authentication required for these events', 401);
            }
        }
        const now = new Date().toISOString();
        const appVersion = installation.appVersion || '';
        try {
            await upsertInstallation(databases, installation, userId, now);
            await upsertSession(databases, session, installation.installationId, userId, appVersion, now);
            let acceptedEvents = 0;
            let acceptedLogs = 0;
            if (!analyticsOff) {
                for (const event of events) {
                    if (!event?.name || !event?.category || !event?.timestamp)
                        continue;
                    if (!userId && !PRE_AUTH_EVENTS.has(event.name))
                        continue;
                    const ok = await createEventDoc(databases, event, installation.installationId, session.sessionId, userId, appVersion, now);
                    if (ok)
                        acceptedEvents++;
                }
            }
            if (!diagnosticsOff) {
                for (const log of logs) {
                    if (!log?.level || !log?.message || !log?.timestamp)
                        continue;
                    if (log.level === 'debug' || log.level === 'info')
                        continue;
                    const ok = await createLogDoc(databases, log, installation.installationId, session.sessionId, userId, appVersion, now);
                    if (ok)
                        acceptedLogs++;
                }
            }
            return (0, middleware_1.jsonResponse)(res, {
                success: true,
                accepted: { events: acceptedEvents, logs: acceptedLogs },
            });
        }
        catch (err) {
            logger.error(`Telemetry ingest failed: ${(0, runtime_1.formatError)(err)}`);
            return (0, middleware_1.errorResponse)(res, 'INGEST_FAILED', 'Failed to store telemetry', 500);
        }
    }
    if (path === '/telemetry/consent' && method === 'POST') {
        if (!userId)
            return (0, middleware_1.errorResponse)(res, 'UNAUTHORIZED', 'Authentication required', 401);
        const analyticsEnabled = body.analyticsEnabled !== false;
        const diagnosticsEnabled = body.diagnosticsEnabled !== false;
        const installationId = typeof body.installationId === 'string' ? body.installationId : '';
        if (isUuid(installationId)) {
            try {
                await databases.updateDocument(config_1.DATABASE_ID, config_1.COLLECTIONS.telemetryInstallations, installationId, {
                    analyticsEnabled,
                    diagnosticsEnabled,
                    optedOut: !analyticsEnabled && !diagnosticsEnabled,
                    lastSeenAt: new Date().toISOString(),
                });
            }
            catch {
                /* installation may not exist yet */
            }
        }
        return (0, middleware_1.jsonResponse)(res, {
            success: true,
            consent: { analyticsEnabled, diagnosticsEnabled, consentVersion: 1 },
        });
    }
    return (0, middleware_1.errorResponse)(res, 'NOT_FOUND', `Unknown telemetry route: ${path}`, 404);
}
