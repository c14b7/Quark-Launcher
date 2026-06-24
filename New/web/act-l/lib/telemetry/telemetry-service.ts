import { apiRequest } from '../api-client';
import type { TelemetryIngestPayload } from './types';

export async function ingestTelemetry(payload: TelemetryIngestPayload) {
  return apiRequest<{ accepted: { events: number; logs: number } }>(
    '/telemetry/ingest',
    'POST',
    payload as unknown as Record<string, unknown>,
    false
  );
}

export async function syncTelemetryConsent(
  installationId: string,
  analyticsEnabled: boolean,
  diagnosticsEnabled: boolean
) {
  return apiRequest(
    '/telemetry/consent',
    'POST',
    { installationId, analyticsEnabled, diagnosticsEnabled },
    true
  );
}
