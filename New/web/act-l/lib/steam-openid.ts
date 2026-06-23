export interface SteamLoginResult {
  success: boolean;
  steamId?: string;
  error?: string;
}

export async function loginWithSteam(): Promise<SteamLoginResult> {
  if (typeof window !== 'undefined' && window.electronAPI?.steamOpenIdLogin) {
    return window.electronAPI.steamOpenIdLogin();
  }
  return {
    success: false,
    error: 'Logowanie przez Steam jest dostępne w aplikacji desktopowej Quark Launcher.',
  };
}
