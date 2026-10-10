const DEFAULTS = {
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
  themes: {
    lime: {
      accent: '#d4ff00',
      panelBg: 'rgba(8, 8, 12, 0.55)',
      textPrimary: '#ffffff',
      textMuted: 'rgba(255,255,255,0.55)',
      blurPx: 8,
      radiusPx: 10,
    },
    ghost: {
      accent: '#f4f4f5',
      panelBg: 'rgba(255, 255, 255, 0.08)',
      textPrimary: '#fafafa',
      textMuted: 'rgba(255,255,255,0.5)',
      blurPx: 12,
      radiusPx: 14,
    },
    contrast: {
      accent: '#ffffff',
      panelBg: 'rgba(0, 0, 0, 0.85)',
      textPrimary: '#ffffff',
      textMuted: 'rgba(255,255,255,0.7)',
      blurPx: 0,
      radiusPx: 4,
    },
  },
};

let config = JSON.parse(JSON.stringify(DEFAULTS));
let sessionStart = Date.now();
let fps = 0;
let frameCount = 0;
let lastFpsTs = performance.now();
let pingMs = null;
let dragState = null;

const root = document.getElementById('overlay-root');
const els = {
  logo: document.getElementById('logo-block'),
  perf: document.getElementById('perf-block'),
  cpuVal: document.getElementById('cpu-val'),
  gpuVal: document.getElementById('gpu-val'),
  fpsVal: document.getElementById('fps-val'),
  ramVal: document.getElementById('ram-val'),
  timerVal: document.getElementById('timer-val'),
  clockVal: document.getElementById('clock-val'),
  pingVal: document.getElementById('ping-val'),
  chart: document.getElementById('cpu-chart'),
  media: document.getElementById('media-block'),
  mediaArt: document.getElementById('media-art'),
  mediaTitle: document.getElementById('media-title'),
  mediaArtist: document.getElementById('media-artist'),
  mediaProgress: document.getElementById('media-progress'),
  toasts: document.getElementById('toast-stack'),
};

const THEMES = DEFAULTS.themes || {};

function resolveTheme() {
  const base = THEMES[config.themeId] || THEMES.lime || {};
  return { ...base, ...(config.theme || {}) };
}

function applyTheme() {
  const t = resolveTheme();
  const s = document.documentElement.style;
  s.setProperty('--accent', t.accent || '#d4ff00');
  s.setProperty('--panel-bg', t.panelBg || 'rgba(8,8,12,0.55)');
  s.setProperty('--text-primary', t.textPrimary || '#fff');
  s.setProperty('--text-muted', t.textMuted || 'rgba(255,255,255,0.55)');
  s.setProperty('--blur', `${t.blurPx ?? 8}px`);
  s.setProperty('--radius', `${t.radiusPx ?? 10}px`);
  s.setProperty('--scale', String(config.scale || 1));
}

function placeWidget(el, layout) {
  if (!el || !layout) return;
  const { x = 0, y = 0, anchor = 'top-left' } = layout;
  const scale = Number(config.scale) || 1;
  el.style.top = '';
  el.style.bottom = '';
  el.style.left = '';
  el.style.right = '';

  const topSide = anchor.startsWith('top');
  const leftSide = anchor.endsWith('left');
  if (topSide) el.style.top = `${y}%`;
  else el.style.bottom = `${y}%`;

  const centerMedia =
    el.dataset.widget === 'media' && leftSide && Math.abs(Number(x) - 50) < 1.5;

  if (centerMedia) {
    el.style.left = '50%';
    const originY = topSide ? 'top' : 'bottom';
    el.style.transform = `translateX(-50%) scale(${scale})`;
    el.style.transformOrigin = `${originY} center`;
  } else {
    if (leftSide) el.style.left = `${x}%`;
    else el.style.right = `${x}%`;
    const ox = leftSide ? 'left' : 'right';
    const oy = topSide ? 'top' : 'bottom';
    el.style.transform = `scale(${scale})`;
    el.style.transformOrigin = `${oy} ${ox}`;
  }
}

function applyLayout() {
  const layout = config.layout || DEFAULTS.layout;
  placeWidget(els.logo, layout.logo);
  placeWidget(els.media, layout.media);
  placeWidget(els.perf, layout.perf);
  placeWidget(els.toasts, layout.toasts);
}

function applyConfig() {
  applyTheme();
  if (root) root.classList.toggle('edit-mode', Boolean(config.editMode));

  if (els.logo) els.logo.style.display = config.showLogo === false ? 'none' : '';
  if (els.perf) {
    const showPerf =
      config.showCpu ||
      config.showGpu ||
      config.showFps ||
      config.showCpuChart ||
      config.showRam ||
      config.showSessionTimer ||
      config.showDateTime ||
      config.showPing;
    els.perf.style.display = showPerf ? '' : 'none';
  }

  document.querySelectorAll('[data-overlay]').forEach((node) => {
    const key = node.getAttribute('data-overlay');
    const show = config[key] !== false;
    if (node.id === 'media-block') return;
    node.style.display = show ? '' : 'none';
  });

  applyLayout();
}

function drawChart(history) {
  if (!els.chart || !config.showCpuChart) return;
  const theme = resolveTheme();
  const ctx = els.chart.getContext('2d');
  const w = els.chart.width;
  const h = els.chart.height;
  ctx.clearRect(0, 0, w, h);
  if (!history?.length) return;
  ctx.strokeStyle = theme.accent || '#d4ff00';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  history.forEach((v, i) => {
    const x = (i / Math.max(history.length - 1, 1)) * (w - 2) + 1;
    const y = h - 1 - (v / 100) * (h - 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = 'rgba(212,255,0,0.12)';
  ctx.lineTo(w - 1, h - 1);
  ctx.lineTo(1, h - 1);
  ctx.closePath();
  ctx.fill();
}

function formatTimer(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function updateMetrics(data) {
  if (config.showCpu && els.cpuVal) els.cpuVal.textContent = `${data.cpu}%`;
  if (config.showGpu && els.gpuVal) els.gpuVal.textContent = `${data.gpu}%`;
  if (config.showRam && els.ramVal) els.ramVal.textContent = `${data.ram}%`;
  drawChart(data.cpuHistory);
}

function tickFps() {
  frameCount++;
  const now = performance.now();
  if (now - lastFpsTs >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastFpsTs = now;
    if (config.showFps && els.fpsVal) els.fpsVal.textContent = String(fps);
  }
  requestAnimationFrame(tickFps);
}

function tickUi() {
  if (config.showSessionTimer && els.timerVal) {
    els.timerVal.textContent = formatTimer(Date.now() - sessionStart);
  }
  if (config.showDateTime && els.clockVal) {
    const d = new Date();
    els.clockVal.textContent = d.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (config.showPing && els.pingVal) {
    els.pingVal.textContent = pingMs === null ? '—' : `${pingMs}ms`;
  }
  setTimeout(tickUi, 1000);
}

async function measurePing() {
  if (!config.showPing) return;
  const start = performance.now();
  try {
    await fetch('https://fra.cloud.appwrite.io/v1/health', { mode: 'no-cors', cache: 'no-store' });
    pingMs = Math.round(performance.now() - start);
  } catch {
    pingMs = null;
  }
}

function updateMedia(session) {
  if (!els.media) return;
  const show = config.showNowPlaying !== false && session && session.title;
  els.media.classList.toggle('visible', Boolean(show));
  if (!show) return;
  if (els.mediaTitle) els.mediaTitle.textContent = session.title || '—';
  if (els.mediaArtist) els.mediaArtist.textContent = session.artist || session.appName || '';
  if (els.mediaArt) {
    if (session.artworkUrl) {
      els.mediaArt.src = session.artworkUrl;
      els.mediaArt.style.display = '';
    } else {
      els.mediaArt.removeAttribute('src');
      els.mediaArt.style.display = 'none';
    }
  }
  if (els.mediaProgress) {
    const pct =
      session.durationSec > 0
        ? Math.min(100, ((session.positionSec || 0) / session.durationSec) * 100)
        : 0;
    els.mediaProgress.style.width = `${pct}%`;
  }
}

function showToast(payload) {
  if (config.showChatNotifications === false) return;
  const stack = els.toasts;
  if (!stack) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="toast-title">${escapeHtml(payload.title || 'Quark')}</div><div class="toast-body">${escapeHtml(payload.body || '')}</div>`;
  stack.appendChild(el);
  if (stack.children.length > 3) stack.removeChild(stack.firstChild);
  setTimeout(() => el.remove(), 6000);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function snap(v, grid = 2) {
  return Math.min(100, Math.max(0, Math.round(v / grid) * grid));
}

function onPointerDown(e) {
  if (!config.editMode) return;
  const widget = e.target.closest('[data-widget]');
  if (!widget || widget.dataset.widget === 'toasts') return;
  const id = widget.dataset.widget;
  dragState = {
    id,
    el: widget,
    startX: e.clientX,
    startY: e.clientY,
    layout: { ...(config.layout?.[id] || DEFAULTS.layout[id]) },
  };
  widget.classList.add('dragging');
  e.preventDefault();
}

function onPointerMove(e) {
  if (!dragState) return;
  const dx = ((e.clientX - dragState.startX) / window.innerWidth) * 100;
  const dy = ((e.clientY - dragState.startY) / window.innerHeight) * 100;
  const anchor = dragState.layout.anchor || 'top-left';
  const leftSide = anchor.endsWith('left');
  const topSide = anchor.startsWith('top');
  let x = Number(dragState.layout.x) + (leftSide ? dx : -dx);
  let y = Number(dragState.layout.y) + (topSide ? dy : -dy);
  x = snap(x);
  y = snap(y);
  const next = { ...dragState.layout, x, y };
  if (!config.layout) config.layout = { ...DEFAULTS.layout };
  config.layout[dragState.id] = next;
  placeWidget(dragState.el, next);
}

function onPointerUp() {
  if (!dragState) return;
  dragState.el.classList.remove('dragging');
  const patch = { [dragState.id]: { ...config.layout[dragState.id] } };
  dragState = null;
  if (window.overlayAPI?.sendLayoutPatch) {
    window.overlayAPI.sendLayoutPatch(patch);
  }
}

function onKeyDown(e) {
  if (e.key === 'Escape' && config.editMode && window.overlayAPI?.exitEditMode) {
    window.overlayAPI.exitEditMode();
  }
}

document.addEventListener('pointerdown', onPointerDown);
document.addEventListener('pointermove', onPointerMove);
document.addEventListener('pointerup', onPointerUp);
document.addEventListener('keydown', onKeyDown);

if (window.overlayAPI) {
  window.overlayAPI.onConfig((c) => {
    config = { ...DEFAULTS, ...c, layout: { ...DEFAULTS.layout, ...(c?.layout || {}) } };
    applyConfig();
  });
  window.overlayAPI.onMetrics(updateMetrics);
  window.overlayAPI.onSessionStart((d) => {
    sessionStart = d?.startedAt || Date.now();
  });
  window.overlayAPI.onNotification(showToast);
  if (window.overlayAPI.onMedia) window.overlayAPI.onMedia(updateMedia);
}

applyConfig();
requestAnimationFrame(tickFps);
tickUi();
setInterval(measurePing, 15000);
measurePing();
