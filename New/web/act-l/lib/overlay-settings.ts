export interface OverlaySettings {
  showLogo: boolean;
  showCpu: boolean;
  showGpu: boolean;
  showFps: boolean;
  showCpuChart: boolean;
  showRam: boolean;
  showSessionTimer: boolean;
  showDateTime: boolean;
  showPing: boolean;
}

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  showLogo: true,
  showCpu: true,
  showGpu: true,
  showFps: true,
  showCpuChart: true,
  showRam: true,
  showSessionTimer: true,
  showDateTime: false,
  showPing: false,
};

export function mergeOverlaySettings(raw?: Partial<OverlaySettings>): OverlaySettings {
  return { ...DEFAULT_OVERLAY_SETTINGS, ...raw };
}

export async function syncOverlayConfigToElectron(config: OverlaySettings): Promise<void> {
  if (typeof window === 'undefined' || !window.electronAPI?.overlayUpdateConfig) return;
  await window.electronAPI.overlayUpdateConfig(config);
}
