const { BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

const SHORTCUT = 'Control+Alt+F10';
const SESSION_MAX_MS = 8 * 60 * 60 * 1000;

class OverlayManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.window = null;
    this.visible = false;
    this.gameSessionActive = false;
    this.sessionTimeout = null;
    this.shortcutRegistered = false;
  }

  setMainWindow(win) {
    this.mainWindow = win;
  }

  onGameLaunched() {
    this.gameSessionActive = true;
    if (this.sessionTimeout) clearTimeout(this.sessionTimeout);
    this.sessionTimeout = setTimeout(() => {
      this.gameSessionActive = false;
      this.hide();
    }, SESSION_MAX_MS);
    this.ensureShortcut();
  }

  ensureShortcut() {
    if (this.shortcutRegistered) return;
    try {
      const ok = globalShortcut.register(SHORTCUT, () => {
        if (!this.gameSessionActive) return;
        this.toggle();
      });
      if (ok) this.shortcutRegistered = true;
    } catch (err) {
      console.error('[Overlay] Shortcut registration failed:', err);
    }
  }

  createWindow() {
    if (this.window && !this.window.isDestroyed()) return;
    this.window = new BrowserWindow({
      width: 200,
      height: 60,
      x: 16,
      y: 16,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      hasShadow: false,
      resizable: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });
    this.window.loadFile(path.join(__dirname, 'overlay.html'));
    this.window.setIgnoreMouseEvents(true, { forward: true });
    this.window.on('closed', () => {
      this.window = null;
      this.visible = false;
    });
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
    this.notifyRenderer(this.visible);
  }

  show() {
    this.createWindow();
    if (this.window && !this.window.isDestroyed()) {
      this.window.showInactive();
      this.visible = true;
      this.notifyRenderer(true);
    }
  }

  hide() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide();
    }
    this.visible = false;
    this.notifyRenderer(false);
  }

  notifyRenderer(visible) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('overlay-toggled', { visible });
    }
  }

  dispose() {
    if (this.sessionTimeout) clearTimeout(this.sessionTimeout);
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
