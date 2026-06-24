import { getAppVersion } from '../build-env';
import { isDevSettingsEnabled } from '../build-env';
import {
  loadConsent,
  saveConsent,
  loadInstallationId,
  persistInstallationId,
  DEFAULT_CONSENT,
} from './consent';
import { enqueueEvent, enqueueLog, takeBatch, clearQueue, queueSize } from './queue';
import { ingestTelemetry, syncTelemetryConsent } from './telemetry-service';
import { sanitizeProperties, sanitizeString } from './sanitize';
import type {
  EventCategory,
  LogLevel,
  SessionEndReason,
  SessionEntryPoint,
  TelemetryConsent,
  TelemetryEvent,
  TelemetryLog,
  TelemetrySessionState,
} from './types';

const FLUSH_INTERVAL_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 60_000;
const FLUSH_EVENT_THRESHOLD = 50;

let installationId = '';
let session: TelemetrySessionState | null = null;
let userId: string | null = null;
let consent: TelemetryConsent = { ...DEFAULT_CONSENT };
let sessionStartedAt = 0;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;
let sessionEnded = false;
let flushing = false;
let flushBackoffMs = 0;
let flushBackoffUntil = 0;
let flushWarnedThisSession = false;

function scheduleFlushBackoff() {
  flushBackoffMs = flushBackoffMs ? Math.min(flushBackoffMs * 2, 300_000) : 30_000;
  flushBackoffUntil = Date.now() + flushBackoffMs;
  if (!flushWarnedThisSession) {
    flushWarnedThisSession = true;
    console.warn('[Telemetry] Ingest failed — retry with backoff. Run migrate-telemetry if persistent.');
  }
}

function clearFlushBackoff() {
  flushBackoffMs = 0;
  flushBackoffUntil = 0;
}

async function getEnvironment() {
  const appVersion = getAppVersion();
  let platform = 'web';
  let arch = '';
  let electronVersion = '';

  if (typeof window !== 'undefined' && window.electronAPI) {
    platform = window.electronAPI.platform || 'win32';
    try {
      const info = await window.electronAPI.getSystemInfo();
      platform = info.platform || platform;
      arch = info.arch || '';
      electronVersion = info.electronVersion || window.electronAPI.versions?.electron || '';
    } catch {
      arch = '';
    }
  }

  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en';
  const screenResolution =
    typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '';

  return { appVersion, platform, arch, locale, electronVersion, screenResolution };
}

function newEventId(): string {
  return crypto.randomUUID();
}

function isFullyOptedOut(): boolean {
  return !consent.analyticsEnabled && !consent.diagnosticsEnabled;
}

export async function initTelemetry(entryPoint: SessionEntryPoint = 'cold_start'): Promise<void> {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  installationId = await loadInstallationId();
  await persistInstallationId(installationId);
  consent = loadConsent();

  session = {
    sessionId: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    entryPoint,
  };
  sessionStartedAt = Date.now();

  if (!appLaunched) {
    appLaunched = true;
    track('app.launch', { coldStart: entryPoint === 'cold_start' }, 'session');
  }
  track('session.start', { entryPoint }, 'session');

  flushTimer = setInterval(() => void flushTelemetry(), FLUSH_INTERVAL_MS);
  heartbeatTimer = setInterval(() => {
    track('session.heartbeat', {}, 'session');
  }, HEARTBEAT_INTERVAL_MS);

  const onHidden = () => {
    if (document.visibilityState === 'hidden') void flushTelemetry();
  };
  document.addEventListener('visibilitychange', onHidden);
  window.addEventListener('beforeunload', () => {
    endSession('quit');
    void flushTelemetry();
  });

  void flushTelemetry();
}

export function setTelemetryUser(id: string | null): void {
  userId = id;
}

export function getTelemetryConsent(): TelemetryConsent {
  return { ...consent };
}

export async function updateTelemetryConsent(next: Partial<TelemetryConsent>): Promise<void> {
  const prev = { ...consent };
  consent = {
    ...consent,
    ...next,
    consentVersion: 1,
    consentAt: new Date().toISOString(),
  };
  await saveConsent(consent);

  if (!consent.analyticsEnabled && !consent.diagnosticsEnabled) {
    await clearQueue();
  }

  track(
    'telemetry.consent_changed',
    {
      analyticsEnabled: consent.analyticsEnabled,
      diagnosticsEnabled: consent.diagnosticsEnabled,
      previousAnalytics: prev.analyticsEnabled,
      previousDiagnostics: prev.diagnosticsEnabled,
    },
    'settings'
  );

  if (userId) {
    await syncTelemetryConsent(
      installationId,
      consent.analyticsEnabled,
      consent.diagnosticsEnabled
    );
  }

  await flushTelemetry();
}

export function track(
  name: string,
  properties?: Record<string, unknown>,
  category: EventCategory = 'feature'
): void {
  if (typeof window === 'undefined' || isFullyOptedOut()) return;
  if (!consent.analyticsEnabled && !name.startsWith('session.') && name !== 'app.launch') return;

  const event: TelemetryEvent = {
    eventId: newEventId(),
    name,
    category,
    timestamp: new Date().toISOString(),
    properties: properties ? sanitizeProperties(properties) : undefined,
  };

  void enqueueEvent(event);

  void queueSizeCheck();
}

async function queueSizeCheck(): Promise<void> {
  const size = await queueSize();
  if (size >= FLUSH_EVENT_THRESHOLD) void flushTelemetry();
}

export function logTelemetry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  stack?: string
): void {
  if (typeof window === 'undefined' || isFullyOptedOut()) return;
  if (!consent.diagnosticsEnabled) return;

  const isDev = isDevSettingsEnabled();
  if (!isDev && (level === 'debug' || level === 'info')) return;

  const entry: TelemetryLog = {
    logId: newEventId(),
    level,
    message: sanitizeString(message).slice(0, 2000),
    timestamp: new Date().toISOString(),
    context: context ? sanitizeProperties(context) : undefined,
    stack: stack ? sanitizeString(stack).slice(0, 8000) : undefined,
  };

  void enqueueLog(entry);
}

let sessionEndReason: SessionEndReason | null = null;

export function endSession(reason: SessionEndReason = 'unknown'): void {
  if (!session || sessionEnded) return;
  const durationSec = Math.round((Date.now() - sessionStartedAt) / 1000);
  track('session.end', { reason, durationSec }, 'session');
  sessionEnded = true;
  sessionEndReason = reason;

  if (flushTimer) clearInterval(flushTimer);
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  flushTimer = null;
  heartbeatTimer = null;
}

export async function flushTelemetry(): Promise<void> {
  if (flushing || typeof window === 'undefined' || isFullyOptedOut()) return;
  if (!session || !installationId) return;
  if (Date.now() < flushBackoffUntil) return;

  flushing = true;
  try {
    const batch = await takeBatch();
    if (batch.events.length === 0 && batch.logs.length === 0) return;

    const env = await getEnvironment();
    const durationSec = Math.round((Date.now() - sessionStartedAt) / 1000);

    const payload = {
      installation: {
        installationId,
        appVersion: env.appVersion,
        platform: env.platform,
        arch: env.arch,
        locale: env.locale,
        electronVersion: env.electronVersion,
        screenResolution: env.screenResolution,
        analyticsEnabled: consent.analyticsEnabled,
        diagnosticsEnabled: consent.diagnosticsEnabled,
      },
      session: {
        ...session,
        durationSec,
        ...(sessionEnded
          ? { endedAt: new Date().toISOString(), endReason: sessionEndReason || 'unknown' }
          : {}),
      },
      events: batch.events,
      logs: batch.logs,
    };

    const result = await ingestTelemetry(payload);
    if (!result.success) {
      scheduleFlushBackoff();
      for (const event of batch.events) await enqueueEvent(event);
      for (const log of batch.logs) await enqueueLog(log);
    } else {
      clearFlushBackoff();
    }
  } catch {
    /* re-queue handled above on failure */
  } finally {
    flushing = false;
  }
}

export function getInstallationId(): string {
  return installationId;
}

export function installGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    track('error.uncaught', { message: event.message, source: 'window' }, 'error');
    logTelemetry('error', event.message, { filename: event.filename, lineno: event.lineno }, event.error?.stack);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as Error | string | undefined;
    const message = typeof reason === 'string' ? reason : reason?.message || 'Unhandled rejection';
    track('error.uncaught', { message, source: 'promise' }, 'error');
    logTelemetry('error', message, { source: 'unhandledrejection' }, typeof reason === 'object' ? reason?.stack : undefined);
  });
}
