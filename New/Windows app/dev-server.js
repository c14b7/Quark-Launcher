const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const http = require('http');

const PREFERRED_PORT = 30211;
const WEB_DIR = path.join(__dirname, '..', 'web', 'act-l');

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.listen({ port, host: '127.0.0.1' }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function resolveFreePort(startPort = PREFERRED_PORT, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortFree(port)) return port;
  }
  throw new Error(`Brak wolnego portu w zakresie ${startPort}–${startPort + maxAttempts - 1}`);
}

function waitForHttp(port, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  const host = `http://127.0.0.1:${port}`;

  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Next.js nie odpowiada na porcie ${port} (timeout ${timeoutMs / 1000}s)`));
        return;
      }

      const req = http.get(host, (res) => {
        res.resume();
        resolve(host);
      });

      req.on('error', () => setTimeout(attempt, 400));
      req.setTimeout(2500, () => {
        req.destroy();
        setTimeout(attempt, 400);
      });
    };

    attempt();
  });
}

async function startNextDevServer() {
  const port = await resolveFreePort();
  const url = `http://127.0.0.1:${port}`;

  console.log(`[Dev] Uruchamiam Next.js na porcie ${port}…`);

  const child = spawn('npx', ['next', 'dev', '-p', String(port)], {
    cwd: WEB_DIR,
    shell: true,
    env: { ...process.env, PORT: String(port) },
    stdio: 'inherit',
  });

  child.on('error', (err) => {
    console.error('[Dev] Błąd uruchamiania Next.js:', err.message);
  });

  await waitForHttp(port);
  console.log(`[Dev] Next.js gotowy: ${url}`);

  return { port, url, process: child };
}

function stopNextDevServer(devServer) {
  if (!devServer?.process || devServer.process.killed) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(devServer.process.pid), '/f', '/t'], { shell: true });
    } else {
      devServer.process.kill('SIGTERM');
    }
  } catch (err) {
    console.warn('[Dev] Nie udało się zatrzymać Next.js:', err.message);
  }
}

module.exports = {
  PREFERRED_PORT,
  resolveFreePort,
  startNextDevServer,
  stopNextDevServer,
};
