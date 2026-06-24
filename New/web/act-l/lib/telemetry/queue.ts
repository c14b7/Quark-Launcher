import type { QueuedTelemetry, TelemetryEvent, TelemetryLog } from './types';

const QUEUE_KEY = 'quark_telemetry_queue';
const MAX_EVENTS = 500;
const MAX_LOGS = 100;

let memoryQueue: QueuedTelemetry = { events: [], logs: [] };
let loaded = false;

async function loadQueue(): Promise<QueuedTelemetry> {
  if (loaded) return memoryQueue;

  if (typeof window !== 'undefined' && window.electronAPI?.loadUserData) {
    try {
      const result = await window.electronAPI.loadUserData(QUEUE_KEY);
      if (result.success && result.data && typeof result.data === 'object') {
        const data = result.data as QueuedTelemetry;
        memoryQueue = {
          events: Array.isArray(data.events) ? data.events : [],
          logs: Array.isArray(data.logs) ? data.logs : [],
        };
      }
    } catch {
      /* ignore */
    }
  } else if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (raw) memoryQueue = JSON.parse(raw) as QueuedTelemetry;
    } catch {
      /* ignore */
    }
  }

  loaded = true;
  return memoryQueue;
}

async function persistQueue(): Promise<void> {
  if (typeof window === 'undefined') return;

  const payload = JSON.stringify(memoryQueue);
  if (window.electronAPI?.saveUserData) {
    await window.electronAPI.saveUserData(QUEUE_KEY, memoryQueue);
  } else {
    localStorage.setItem(QUEUE_KEY, payload);
  }
}

export async function enqueueEvent(event: TelemetryEvent): Promise<void> {
  await loadQueue();
  memoryQueue.events.push(event);
  if (memoryQueue.events.length > MAX_EVENTS) {
    memoryQueue.events = memoryQueue.events.slice(-MAX_EVENTS);
  }
  await persistQueue();
}

export async function enqueueLog(log: TelemetryLog): Promise<void> {
  await loadQueue();
  memoryQueue.logs.push(log);
  if (memoryQueue.logs.length > MAX_LOGS) {
    memoryQueue.logs = memoryQueue.logs.slice(-MAX_LOGS);
  }
  await persistQueue();
}

export async function takeBatch(maxEvents = 50, maxLogs = 20): Promise<QueuedTelemetry> {
  await loadQueue();
  const batch: QueuedTelemetry = {
    events: memoryQueue.events.splice(0, maxEvents),
    logs: memoryQueue.logs.splice(0, maxLogs),
  };
  await persistQueue();
  return batch;
}

export async function clearQueue(): Promise<void> {
  memoryQueue = { events: [], logs: [] };
  loaded = true;
  await persistQueue();
}

export async function queueSize(): Promise<number> {
  await loadQueue();
  return memoryQueue.events.length + memoryQueue.logs.length;
}
