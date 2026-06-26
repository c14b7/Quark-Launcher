const DEFAULT_CONFIG = {
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

let config = { ...DEFAULT_CONFIG };
let sessionStart = Date.now();
let fps = 0;
let frameCount = 0;
let lastFpsTs = performance.now();
let pingMs = null;

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
};

function applyConfig() {
  if (els.logo) els.logo.style.display = config.showLogo ? 'flex' : 'none';
  if (els.perf) els.perf.style.display =
    config.showCpu || config.showGpu || config.showFps || config.showCpuChart ||
    config.showRam || config.showSessionTimer || config.showDateTime || config.showPing
      ? 'flex' : 'none';
  document.querySelectorAll('[data-overlay]').forEach((node) => {
    const key = node.getAttribute('data-overlay');
    const show = config[key] !== false;
    node.style.display = show ? '' : 'none';
  });
}

function drawChart(history) {
  if (!els.chart || !config.showCpuChart) return;
  const ctx = els.chart.getContext('2d');
  const w = els.chart.width;
  const h = els.chart.height;
  ctx.clearRect(0, 0, w, h);
  if (!history?.length) return;
  ctx.strokeStyle = '#d4ff00';
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
    els.clockVal.textContent = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
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

if (window.overlayAPI) {
  window.overlayAPI.onConfig((c) => {
    config = { ...DEFAULT_CONFIG, ...c };
    applyConfig();
  });
  window.overlayAPI.onMetrics(updateMetrics);
  window.overlayAPI.onSessionStart((d) => {
    sessionStart = d?.startedAt || Date.now();
  });
}

applyConfig();
requestAnimationFrame(tickFps);
tickUi();
setInterval(measurePing, 15000);
measurePing();
