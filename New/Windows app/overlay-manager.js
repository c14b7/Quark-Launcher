const { BrowserWindow, globalShortcut, screen, ipcMain } = require('electron');
const path = require('path');
const { OverlayPerformanceMonitor } = require('./overlay-performance');

const SHORTCUT = 'Control+Alt+F10';
const SESSION_MAX_MS = 8 * 60 * 60 * 1000;

const DEFAULT_OVERLAY_CONFIG = {
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

class OverlayManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.window = null;
    this.visible = false;
    this.gameSessionActive = false;
    this.sessionTimeout = null;
    this.shortcutRegistered = false;
    this.sessionStartedAt = null;
    this.config = { ...DEFAULT_OVERLAY_CONFIG };
    this.perfMonitor = new OverlayPerformanceMonitor((sample) => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send('overlay-metrics', sample);
      }
    });
    this.registerIpc();
  }

  registerIpc() {
    ipcMain.handle('overlay-update-config', (_event, config) => {
      this.updateConfig(config);
      return { success: true };
    });
  }

  setMainWindow(win) {
    this.mainWindow = win;
  }

  updateConfig(config) {
    if (!config || typeof config !== 'object') return;
    this.config = { ...DEFAULT_OVERLAY_CONFIG, ...config };
    this.sendConfigToOverlay();
  }

  sendConfigToOverlay() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('overlay-config', this.config);
    }
  }

  sendSessionStart() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('overlay-session-start', {
        startedAt: this.sessionStartedAt || Date.now(),
      });
    }
  }

  onGameLaunched() {
    this.gameSessionActive = true;
    this.sessionStartedAt = Date.now();
    if (this.sessionTimeout) clearTimeout(this.sessionTimeout);
    this.sessionTimeout = setTimeout(() => {
      this.gameSessionActive = false;
      this.hide();
      this.perfMonitor.stop();
    }, SESSION_MAX_MS);
    this.ensureShortcut();
    this.sendSessionStart();
    console.log('[Overlay] Game session active — Ctrl+Alt+F10 to toggle');
  }

  ensureShortcut() {
    if (this.shortcutRegistered) return;
    try {
      if (globalShortcut.isRegistered(SHORTCUT)) {
        globalShortcut.unregister(SHORTCUT);
      }
      const ok = globalShortcut.register(SHORTCUT, () => {
        if (!this.gameSessionActive) {
          console.log('[Overlay] Shortcut ignored — no active game session');
          return;
        }
        this.toggle();
      });
      if (ok) {
        this.shortcutRegistered = true;
        console.log('[Overlay] Registered shortcut:', SHORTCUT);
      } else {
        console.error('[Overlay] Failed to register shortcut (may be in use)');
      }
    } catch (err) {
      console.error('[Overlay] Shortcut registration failed:', err);
    }
  }

  createWindow() {
    if (this.window && !this.window.isDestroyed()) return;

    const { width, x, y } = screen.getPrimaryDisplay().workArea;
    this.window = new BrowserWindow({
      width,
      height: 100,
      x,
      y,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      hasShadow: false,
      resizable: false,
      show: false,
      type: process.platform === 'win32' ? 'toolbar' : 'panel',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
        preload: path.join(__dirname, 'overlay-preload.js'),
      },
    });

    this.window.setAlwaysOnTop(true, 'screen-saver');
    this.window.loadFile(path.join(__dirname, 'overlay.html'));
    this.window.setIgnoreMouseEvents(true, { forward: true });

    this.window.webContents.on('did-finish-load', () => {
      this.sendConfigToOverlay();
      this.sendSessionStart();
    });

    this.window.on('closed', () => {
      this.window = null;
      this.visible = false;
      this.perfMonitor.stop();
    });
  }

  toggle() {
    const nextVisible = !this.visible;
    if (nextVisible) this.show();
    else this.hide();
    this.notifyRenderer(nextVisible);
    console.log('[Overlay] Toggled:', nextVisible ? 'visible' : 'hidden');
  }

  show() {
    this.createWindow();
    if (this.window && !this.window.isDestroyed()) {
      this.window.setAlwaysOnTop(true, 'screen-saver');
      this.window.showInactive();
      this.visible = true;
      this.perfMonitor.start(500);
      this.sendConfigToOverlay();
      this.sendSessionStart();
    }
  }

  hide() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide();
    }
    this.visible = false;
    this.perfMonitor.stop();
  }

  notifyRenderer(visible) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('overlay-toggled', { visible });
    }
  }

  dispose() {
    if (this.sessionTimeout) clearTimeout(this.sessionTimeout);
    this.perfMonitor.stop();
    if (globalShortcut.isRegistered(SHORTCUT)) {
      globalShortcut.unregister(SHORTCUT);
    }
    this.shortcutRegistered = false;
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    this.window = null;
  }
}

module.exports = { OverlayManager };
