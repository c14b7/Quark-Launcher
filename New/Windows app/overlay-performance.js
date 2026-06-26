const { exec } = require('child_process');
const os = require('os');

function execAsync(cmd, timeout = 2500) {
  return new Promise((resolve) => {
    exec(cmd, { timeout, windowsHide: true }, (err, stdout) => {
      resolve(err ? '' : String(stdout || '').trim());
    });
  });
}

class OverlayPerformanceMonitor {
  constructor(onSample) {
    this.onSample = onSample;
    this.timer = null;
    this.cpuHistory = [];
    this.lastCpuTimes = null;
  }

  start(intervalMs = 500) {
    this.stop();
    this.timer = setInterval(() => void this.sample(), intervalMs);
    void this.sample();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getRamPercent() {
    const total = os.totalmem();
    const used = total - os.freemem();
    return Math.round((used / total) * 100);
  }

  async getCpuPercent() {
    if (process.platform === 'win32') {
      const out = await execAsync(
        'powershell -NoProfile -Command "(Get-Counter \'\\Processor(_Total)\\% Processor Time\').CounterSamples[0].CookedValue"'
      );
      const val = parseFloat(out);
      if (!Number.isNaN(val)) return Math.min(100, Math.round(val));
    }
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
      for (const t of Object.values(cpu.times)) total += t;
      idle += cpu.times.idle;
    }
    if (this.lastCpuTimes) {
      const idleDiff = idle - this.lastCpuTimes.idle;
      const totalDiff = total - this.lastCpuTimes.total;
      this.lastCpuTimes = { idle, total };
      if (totalDiff > 0) return Math.min(100, Math.round((1 - idleDiff / totalDiff) * 100));
    }
    this.lastCpuTimes = { idle, total };
    return 0;
  }

  async getGpuPercent() {
    const nvidia = await execAsync(
      'nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits'
    );
    if (nvidia) {
      const val = parseInt(nvidia.split('\n')[0], 10);
      if (!Number.isNaN(val)) return Math.min(100, val);
    }
    if (process.platform === 'win32') {
      const out = await execAsync(
        `powershell -NoProfile -Command "try { [math]::Round((Get-Counter '\\GPU Engine(*)\\Utilization Percentage' -ErrorAction Stop).CounterSamples | Measure-Object -Property CookedValue -Maximum).Maximum) } catch { 0 }"`
      );
      const val = parseFloat(out);
      if (!Number.isNaN(val)) return Math.min(100, Math.round(val));
    }
    return 0;
  }

  async sample() {
    const [cpu, gpu] = await Promise.all([this.getCpuPercent(), this.getGpuPercent()]);
    const ram = this.getRamPercent();
    this.cpuHistory.push(cpu);
    if (this.cpuHistory.length > 48) this.cpuHistory.shift();
    this.onSample({
      cpu,
      gpu,
      ram,
      cpuHistory: [...this.cpuHistory],
      ts: Date.now(),
    });
  }
}

module.exports = { OverlayPerformanceMonitor };
