export type EventCategory =
  | 'session'
  | 'navigation'
  | 'game'
  | 'social'
  | 'auth'
  | 'settings'
  | 'update'
  | 'error'
  | 'feature';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type SessionEntryPoint = 'cold_start' | 'resume' | 'login';
export type SessionEndReason = 'quit' | 'crash' | 'logout' | 'unknown';

export interface TelemetryConsent {
  analyticsEnabled: boolean;
  diagnosticsEnabled: boolean;
  consentVersion: number;
  consentAt?: string;
}

export interface TelemetryEvent {
  eventId: string;
  name: string;
  category: EventCategory;
  timestamp: string;
  properties?: Record<string, unknown>;
}

export interface TelemetryLog {
  logId: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  stack?: string;
}

export interface TelemetryInstallation {
  installationId: string;
  appVersion: string;
  platform: string;
  arch: string;
  locale: string;
  electronVersion?: string;
  screenResolution?: string;
  analyticsEnabled: boolean;
  diagnosticsEnabled: boolean;
}

export interface TelemetrySessionState {
  sessionId: string;
  startedAt: string;
  entryPoint: SessionEntryPoint;
}

export interface TelemetryIngestPayload {
  installation: TelemetryInstallation;
  session: TelemetrySessionState & {
    endedAt?: string;
    endReason?: SessionEndReason;
    durationSec?: number;
  };
  events: TelemetryEvent[];
  logs: TelemetryLog[];
}

export interface QueuedTelemetry {
  events: TelemetryEvent[];
  logs: TelemetryLog[];
}
