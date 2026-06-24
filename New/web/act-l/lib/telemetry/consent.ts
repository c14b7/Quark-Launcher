import type { TelemetryConsent } from './types';

const CONSENT_KEY = 'quark_telemetry_consent';
const INSTALLATION_KEY = 'quark_installation_id';

/** Beta: opt-out — analityka i diagnostyka domyślnie włączone */
export const DEFAULT_CONSENT: TelemetryConsent = {
  analyticsEnabled: true,
  diagnosticsEnabled: true,
  consentVersion: 1,
};

export function loadConsent(): TelemetryConsent {
  if (typeof window === 'undefined') return { ...DEFAULT_CONSENT };
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return { ...DEFAULT_CONSENT, consentAt: new Date().toISOString() };
    const parsed = JSON.parse(raw) as TelemetryConsent;
    return {
      analyticsEnabled: parsed.analyticsEnabled !== false,
      diagnosticsEnabled: parsed.diagnosticsEnabled !== false,
      consentVersion: parsed.consentVersion ?? 1,
      consentAt: parsed.consentAt,
    };
  } catch {
    return { ...DEFAULT_CONSENT };
  }
}

export async function saveConsent(consent: TelemetryConsent): Promise<void> {
  const next: TelemetryConsent = {
    ...consent,
    consentAt: new Date().toISOString(),
    consentVersion: 1,
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
    if (window.electronAPI?.saveUserData) {
      await window.electronAPI.saveUserData('telemetryConsent', next);
    }
  }
}

export function getOrCreateInstallationId(): string {
  if (typeof window === 'undefined') return '00000000-0000-4000-8000-000000000000';

  let id = localStorage.getItem(INSTALLATION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(INSTALLATION_KEY, id);
  }
  return id;
}

export async function persistInstallationId(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem(INSTALLATION_KEY, id);
  if (window.electronAPI?.saveUserData) {
    await window.electronAPI.saveUserData('installationId', id);
  }
}

export async function loadInstallationId(): Promise<string> {
  if (typeof window === 'undefined') return getOrCreateInstallationId();

  if (window.electronAPI?.loadUserData) {
    try {
      const result = await window.electronAPI.loadUserData('installationId');
      if (result.success && typeof result.data === 'string' && result.data) {
        localStorage.setItem(INSTALLATION_KEY, result.data);
        return result.data;
      }
    } catch {
      /* fallback */
    }
  }

  return getOrCreateInstallationId();
}
