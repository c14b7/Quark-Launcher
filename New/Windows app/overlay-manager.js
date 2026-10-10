const { BrowserWindow, globalShortcut, screen, ipcMain, Notification } = require('electron');
const path = require('path');
const { OverlayPerformanceMonitor } = require('./overlay-performance');

const SHORTCUT = 'Control+Alt+F10';
const SESSION_MAX_MS = 8 * 60 * 60 * 1000;

let DEFAULT_OVERLAY_CONFIG;
try {
  DEFAULT_OVERLAY_CONFIG = require('./overlay-defaults.json');
} catch {
  DEFAULT_OVERLAY_CONFIG = {
    version: 2,
    showLogo: true,
    showCpu: true,
    showGpu: true,
    showFps: true,
    showCpuChart: true,
    showRam: true,
    showSessionTimer: true,
    showDateTime: false,
    showPing: false,
    showChatNotifications: true,
    chatNotificationsWhenHidden: true,
    showNowPlaying: true,
    scale: 1,
    themeId: 'lime',
    presetId: 'classic',
    editorAspect: '16:9',
    editMode: false,
    layout: {
      logo: { x: 1.2, y: 1.5, anchor: 'top-left' },
      media: { x: 50, y: 1.5, anchor: 'top-left' },
      perf: { x: 1.2, y: 1.5, anchor: 'top-right' },
      toasts: { x: 50, y: 12, anchor: 'top-left' },
    },
  };
}

function mergeConfig(raw) {
  const base = JSON.parse(JSON.stringify(DEFAULT_OVERLAY_CONFIG));
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    layout: { ...base.layout, ...(raw.layout || {}) },
    editMode: Boolean(raw.editMode),
  };
}

class OverlayManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.window = null;
    this.visible = false;
    this.gameSessionActive = false;
    this.previewMode = false;
    this.sessionTimeout = null;
    this.shortcutRegistered = false;
    this.sessionStartedAt = null;
    this.config = mergeConfig(null);
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
    ipcMain.handle('overlay-enter-edit-mode', () => {
      this.enterEditMode();
      return { success: true };
    });
    ipcMain.handle('overlay-exit-edit-mode', () => {
      this.exitEditMode();
      return { success: true };
    });
    ipcMain.handle('overlay-preview-show', () => {
      this.showPreview();
      return { success: true };
    });
    ipcMain.handle('overlay-preview-hide', () => {
      this.hidePreview();
      return { success: true };
    });
    ipcMain.handle('overlay-layout-patch', (_e, patch) => {
      this.applyLayoutPatch(patch);
      return { success: true, layout: this.config.layout };
    });
    ipcMain.on('overlay-layout-patch', (_e, patch) => {
      this.applyLayoutPatch(patch);
    });
    ipcMain.on('overlay-exit-edit-mode', () => {
      this.exitEditMode();
    });
  }

  setMainWindow(win) {
    this.mainWindow = win;
  }

  updateConfig(config) {
    const keepEdit = this.config.editMode;
    this.config = mergeConfig({ ...config, editMode: config?.editMode ?? keepEdit });
    this.applyWindowInteraction();
    this.sendConfigToOverlay();
  }

  applyLayoutPatch(patch) {
    if (!patch || typeof patch !== 'object') return;
    this.config.layout = { ...this.config.layout, ...patch };
    this.sendConfigToOverlay();
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('overlay-layout-changed', {
        layout: this.config.layout,
      });
    }
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
    this.previewMode = false;
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
        if (!this.gameSessionActive && !this.previewMode) {
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
    if (this.window && !this.window.isDestroyed()) {
      this.fitToWorkArea();
      return;
    }

    const { width, height, x, y } = screen.getPrimaryDisplay().workArea;
    this.window = new BrowserWindow({
      width,
      height,
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
    this.applyWindowInteraction();

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

  fitToWorkArea() {
    if (!this.window || this.window.isDestroyed()) return;
    const { width, height, x, y } = screen.getPrimaryDisplay().workArea;
    this.window.setBounds({ x, y, width, height });
  }

  applyWindowInteraction() {
    if (!this.window || this.window.isDestroyed()) return;
    const edit = Boolean(this.config.editMode);
    this.window.setFocusable(edit);
    if (edit) {
      this.window.setIgnoreMouseEvents(false);
    } else {
      this.window.setIgnoreMouseEvents(true, { forward: true });
    }
  }

  enterEditMode() {
    this.config.editMode = true;
    this.createWindow();
    this.previewMode = true;
    this.show();
    this.applyWindowInteraction();
    this.sendConfigToOverlay();
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
    }
  }

  exitEditMode() {
    this.config.editMode = false;
    this.applyWindowInteraction();
    this.sendConfigToOverlay();
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('overlay-edit-exited', {
        layout: this.config.layout,
        config: this.config,
      });
    }
    if (!this.gameSessionActive) {
      this.hidePreview();
    }
  }

  showPreview() {
    this.previewMode = true;
    this.sessionStartedAt = this.sessionStartedAt || Date.now();
    this.ensureShortcut();
    this.show();
  }

  hidePreview() {
    this.previewMode = false;
    if (!this.gameSessionActive) {
      this.config.editMode = false;
      this.hide();
    }
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
      this.fitToWorkArea();
      this.window.setAlwaysOnTop(true, 'screen-saver');
      this.window.showInactive();
      this.visible = true;
      this.perfMonitor.start(500);
      this.applyWindowInteraction();
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

  showNotification(payload) {
    if (!this.gameSessionActive && !this.previewMode) return;
    const title = payload?.title || 'Quark';
    const body = payload?.body || '';
    const cfg = this.config;

    if (this.visible && this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('overlay-notification', payload);
      return;
    }

    if (cfg.chatNotificationsWhenHidden !== false && Notification.isSupported()) {
      const n = new Notification({ title, body, silent: false });
      n.show();
      n.on('click', () => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.show();
          this.mainWindow.webContents.send('overlay-notification-click', payload);
        }
      });
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
