/** App version injected at build time via next.config.ts */
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';

/**
 * Dev settings tab is visible when:
 * - NODE_ENV is development, or
 * - package version contains "-dev" (case-insensitive), e.g. 0.0.5-beta03-dev
 */
export function isDevSettingsEnabled(): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  return APP_VERSION.toLowerCase().includes('-dev');
}

export function getAppVersion(): string {
  return APP_VERSION;
}
