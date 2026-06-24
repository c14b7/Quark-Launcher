import { Client, Databases } from 'node-appwrite';
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, DATABASE_ID, COLLECTIONS } from './lib/config';
import {
  parseBody,
  verifyAuth,
  jsonResponse,
  errorResponse,
  resolveRoutePath,
  stripRouteMeta,
} from './lib/middleware';
import { checkRateLimit } from './lib/rate-limit';
import { formatError } from './lib/runtime';
import { isUnknownAttributeError } from './lib/telemetry-schema';
import type { FunctionRequest, FunctionResponse } from './lib/runtime';

type Logger = { log: (msg: string) => void; error: (msg: string) => void };
const noopLogger: Logger = { log: () => {}, error: console.error };

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
  'overlay.toggled',
  'error.api', 'error.client', 'error.uncaught',
]);

const PRE_AUTH_EVENTS = new Set(['app.launch', 'session.start', 'session.end', 'session.heartbeat']);

const LOG_LEVELS = new Set(['debug', 'info', 'warn', 'error', 'fatal']);

function getDatabases(): Databases {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  return new Databases(client);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function sanitizeString(input: string): string {
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

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]';
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => sanitizeValue(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 30)) {
      if (/password|token|secret|authorization|email/i.test(k)) continue;
      out[k] = sanitizeValue(v, depth + 1);
    }
    return out;
  }
  return value;
}

function stringifyProperties(props: unknown): string {
  try {
    const sanitized = sanitizeValue(props ?? {});
    const json = JSON.stringify(sanitized);
    return json.length > 2000 ? json.slice(0, 2000) : json;
  } catch {
    return '{}';
  }
}

function stringifyLogDetails(context: unknown, stack?: string): string {
  try {
    const payload = {
      context: sanitizeValue(context ?? {}),
      stack: stack ? sanitizeString(String(stack)).slice(0, 1500) : undefined,
    };
    const json = JSON.stringify(payload);
    return json.length > 3000 ? json.slice(0, 3000) : json;
  } catch {
    return '{}';
  }
}

interface InstallationPayload {
  installationId: string;
  appVersion?: string;
  platform?: string;
  arch?: string;
  locale?: string;
  electronVersion?: string;
  screenResolution?: string;
  analyticsEnabled?: boolean;
  diagnosticsEnabled?: boolean;
}

interface SessionPayload {
  sessionId: string;
  startedAt?: string;
  entryPoint?: string;
  endedAt?: string;
  endReason?: string;
  durationSec?: number;
}

interface EventPayload {
  eventId: string;
  name: string;
  category: string;
  timestamp: string;
  properties?: Record<string, unknown>;
}

interface LogPayload {
  logId: string;
  level: string;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  stack?: string;
}

async function upsertInstallation(
  databases: Databases,
  installation: InstallationPayload,
  userId: string | null,
  now: string
) {
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
    await databases.getDocument(DATABASE_ID, COLLECTIONS.telemetryInstallations, id);
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.telemetryInstallations, id, data);
  } catch {
    await databases.createDocument(DATABASE_ID, COLLECTIONS.telemetryInstallations, id, {
      ...data,
      firstSeenAt: now,
    });
  }
}

async function upsertSession(
  databases: Databases,
  session: SessionPayload,
  installationId: string,
  userId: string | null,
  appVersion: string,
  now: string
) {
  const id = session.sessionId;
  const patch: Record<string, unknown> = {
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
    if (typeof session.durationSec === 'number') patch.durationSec = session.durationSec;
  }

  try {
    await databases.getDocument(DATABASE_ID, COLLECTIONS.telemetrySessions, id);
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.telemetrySessions, id, patch);
  } catch {
    if (!session.startedAt) return;
    await databases.createDocument(DATABASE_ID, COLLECTIONS.telemetrySessions, id, {
      ...patch,
      startedAt: session.startedAt,
      entryPoint: session.entryPoint || 'cold_start',
    });
  }
}

async function createEventDoc(
  databases: Databases,
  event: EventPayload,
  installationId: string,
  sessionId: string,
  userId: string | null,
  _appVersion: string,
  _now: string,
  logger: Logger
): Promise<boolean> {
  if (!ALLOWED_EVENTS.has(event.name)) return false;
  if (!EVENT_CATEGORIES.has(event.category)) return false;
  if (!isUuid(event.eventId)) return false;

  try {
    await databases.getDocument(DATABASE_ID, COLLECTIONS.telemetryEvents, event.eventId);
    return true;
  } catch {
    /* new event */
  }

  const base = {
    installationId,
    sessionId,
    userId: userId || '',
    name: event.name,
    category: event.category,
    timestamp: event.timestamp,
  };

  try {
    await databases.createDocument(DATABASE_ID, COLLECTIONS.telemetryEvents, event.eventId, {
      ...base,
      properties: stringifyProperties(event.properties),
    });
    return true;
  } catch (err) {
    if (isUnknownAttributeError(err)) {
      try {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.telemetryEvents, event.eventId, base);
        logger.log(`Event ${event.name} stored without properties (schema partial)`);
        return true;
      } catch (retryErr) {
        logger.error(`Event create failed: ${formatError(retryErr)}`);
        return false;
      }
    }
    logger.error(`Event create failed: ${formatError(err)}`);
    return false;
  }
}

async function createLogDoc(
  databases: Databases,
  log: LogPayload,
  installationId: string,
  sessionId: string,
  userId: string | null,
  _appVersion: string,
  _now: string,
  logger: Logger
): Promise<boolean> {
  if (!LOG_LEVELS.has(log.level)) return false;
  if (!isUuid(log.logId)) return false;

  try {
    await databases.getDocument(DATABASE_ID, COLLECTIONS.telemetryLogs, log.logId);
    return true;
  } catch {
    /* new log */
  }

  const base = {
    installationId,
    sessionId,
    userId: userId || '',
    level: log.level,
    message: sanitizeString(String(log.message || '').slice(0, 500)),
    timestamp: log.timestamp,
  };

  try {
    await databases.createDocument(DATABASE_ID, COLLECTIONS.telemetryLogs, log.logId, {
      ...base,
      details: stringifyLogDetails(log.context, log.stack),
    });
    return true;
  } catch (err) {
    if (isUnknownAttributeError(err)) {
      try {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.telemetryLogs, log.logId, base);
        logger.log(`Log stored without details (schema partial)`);
        return true;
      } catch (retryErr) {
        logger.error(`Log create failed: ${formatError(retryErr)}`);
        return false;
      }
    }
    logger.error(`Log create failed: ${formatError(err)}`);
    return false;
  }
}

export async function handleTelemetryApiRequest(
  req: FunctionRequest,
  res: FunctionResponse,
  logger: Logger = noopLogger
) {
  const method = (req.method || 'POST').toUpperCase();
  let rawBody: Record<string, unknown> = {};
  try {
    rawBody = method === 'GET' ? {} : parseBody(req);
  } catch (err) {
    logger.error(`telemetry parseBody failed: ${err}`);
    rawBody = {};
  }
  const path = resolveRoutePath(req, rawBody);
  const body = stripRouteMeta(rawBody);
  const userId = await verifyAuth(req);
  const databases = getDatabases();

  logger.log(`Telemetry ${method} ${path} user=${userId || 'anon'}`);

  if (path === '/telemetry/ingest' && method === 'POST') {
    const installation = body.installation as InstallationPayload | undefined;
    const session = body.session as SessionPayload | undefined;
    const events = Array.isArray(body.events) ? (body.events as EventPayload[]) : [];
    const logs = Array.isArray(body.logs) ? (body.logs as LogPayload[]) : [];

    if (!installation?.installationId || !isUuid(installation.installationId)) {
      return errorResponse(res, 'INVALID_INSTALLATION', 'Valid installationId required', 400);
    }
    if (!session?.sessionId || !isUuid(session.sessionId)) {
      return errorResponse(res, 'INVALID_SESSION', 'Valid sessionId required', 400);
    }
    if (events.length > 50 || logs.length > 20) {
      return errorResponse(res, 'BATCH_TOO_LARGE', 'Batch size exceeded', 400);
    }

    const rate = await checkRateLimit('telemetry/ingest', installation.installationId);
    if (!rate.allowed) return errorResponse(res, rate.code || 'RATE_LIMITED', 'Too many telemetry requests', 429);

    const optedOut = installation.analyticsEnabled === false && installation.diagnosticsEnabled === false;
    if (optedOut) {
      return jsonResponse(res, { success: true, accepted: { events: 0, logs: 0 }, optedOut: true });
    }

    const analyticsOff = installation.analyticsEnabled === false;
    const diagnosticsOff = installation.diagnosticsEnabled === false;

    if (!userId) {
      const hasDisallowed = events.some((e) => e?.name && !PRE_AUTH_EVENTS.has(e.name));
      if (hasDisallowed) {
        return errorResponse(res, 'UNAUTHORIZED', 'Authentication required for these events', 401);
      }
    }

    const now = new Date().toISOString();
    const appVersion = installation.appVersion || '';

    let partial = false;
    let acceptedEvents = 0;
    let acceptedLogs = 0;
    let installOk = false;
    let sessionOk = false;

    try {
      await upsertInstallation(databases, installation, userId, now);
      installOk = true;
    } catch (err) {
      logger.error(`Installation upsert failed: ${formatError(err)}`);
    }

    try {
      await upsertSession(databases, session, installation.installationId, userId, appVersion, now);
      sessionOk = true;
    } catch (err) {
      logger.error(`Session upsert failed: ${formatError(err)}`);
    }

    if (!analyticsOff) {
      for (const event of events) {
        if (!event?.name || !event?.category || !event?.timestamp) continue;
        if (!userId && !PRE_AUTH_EVENTS.has(event.name)) continue;
        const ok = await createEventDoc(
          databases,
          event,
          installation.installationId,
          session.sessionId,
          userId,
          appVersion,
          now,
          logger
        );
        if (ok) acceptedEvents++;
      }
    }

    if (!diagnosticsOff) {
      for (const log of logs) {
        if (!log?.level || !log?.message || !log?.timestamp) continue;
        if (log.level === 'debug' || log.level === 'info') continue;
        const ok = await createLogDoc(
          databases,
          log,
          installation.installationId,
          session.sessionId,
          userId,
          appVersion,
          now,
          logger
        );
        if (ok) acceptedLogs++;
      }
    }

    if (!installOk && !sessionOk && acceptedEvents === 0 && acceptedLogs === 0 && (events.length > 0 || logs.length > 0)) {
      return errorResponse(res, 'INGEST_FAILED', 'Failed to store telemetry — check DB schema (run migrate-telemetry)', 500);
    }

    if (acceptedEvents < events.length || acceptedLogs < logs.length) partial = true;

    return jsonResponse(res, {
      success: true,
      accepted: { events: acceptedEvents, logs: acceptedLogs },
      partial,
      installOk,
      sessionOk,
    });
  }

  if (path === '/telemetry/consent' && method === 'POST') {
    if (!userId) return errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);

    const analyticsEnabled = body.analyticsEnabled !== false;
    const diagnosticsEnabled = body.diagnosticsEnabled !== false;
    const installationId = typeof body.installationId === 'string' ? body.installationId : '';

    if (isUuid(installationId)) {
      try {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.telemetryInstallations, installationId, {
          analyticsEnabled,
          diagnosticsEnabled,
          optedOut: !analyticsEnabled && !diagnosticsEnabled,
          lastSeenAt: new Date().toISOString(),
        });
      } catch {
        /* installation may not exist yet */
      }
    }

    return jsonResponse(res, {
      success: true,
      consent: { analyticsEnabled, diagnosticsEnabled, consentVersion: 1 },
    });
  }

  return errorResponse(res, 'NOT_FOUND', `Unknown telemetry route: ${path}`, 404);
}
