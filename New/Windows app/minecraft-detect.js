const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function placeholder(name, accent = '#d4ff00') {
  const label = String(name).slice(0, 20);
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="215" viewBox="0 0 460 215">
      <rect fill="#14532d" width="460" height="215"/>
      <rect fill="#166534" x="0" y="140" width="460" height="75"/>
      <text x="230" y="100" fill="${accent}" font-family="sans-serif" font-size="22" text-anchor="middle">${label.replace(/[<>&]/g, '')}</text>
    </svg>`
  );
  const url = `data:image/svg+xml,${svg}`;
  return { image: url, hero: url, logo: url, capsule: url, background: url };
}

function mtimeMs(p) {
  try {
    return fs.statSync(p).mtimeMs;
  } catch {
    return 0;
  }
}

function latestSaveMtime(minecraftDir) {
  const saves = path.join(minecraftDir, 'saves');
  if (!exists(saves)) return undefined;
  let best = 0;
  try {
    for (const name of fs.readdirSync(saves)) {
      const t = mtimeMs(path.join(saves, name));
      if (t > best) best = t;
    }
  } catch {
    /* ignore */
  }
  return best || undefined;
}

/** @returns {Promise<string|{exe:string|null,protocol:string|null}|undefined>} */
async function findJavaLauncher() {
  const localApp = process.env.LOCALAPPDATA || '';
  const appData = process.env.APPDATA || '';
  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  const candidates = [
    path.join(programFiles, 'Minecraft Launcher', 'MinecraftLauncher.exe'),
    path.join(programFilesX86, 'Minecraft Launcher', 'MinecraftLauncher.exe'),
    path.join(localApp, 'Programs', 'Minecraft Launcher', 'MinecraftLauncher.exe'),
    path.join(localApp, 'Packages', 'Microsoft.4297127D64EC6_8wekyb3d8bbwe', 'LocalCache', 'Local', 'games', 'Minecraft Launcher', 'MinecraftLauncher.exe'),
  ];

  for (const exe of candidates) {
    if (exists(exe)) return exe;
  }

  // Microsoft Store / Xbox app Minecraft Launcher
  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `$p = Get-AppxPackage -Name "*MinecraftLauncher*","*MinecraftJava*" -ErrorAction SilentlyContinue | Select-Object -First 1; if ($p) { "$($p.PackageFamilyName)|$($p.InstallLocation)" }`,
      ],
      { timeout: 10000, windowsHide: true }
    );
    const line = String(stdout || '').trim();
    if (line.includes('|')) {
      const [family, loc] = line.split('|');
      const exe = path.join(loc.trim(), 'MinecraftLauncher.exe');
      if (exists(exe)) return { exe, protocol: null };
      if (family.trim()) {
        return { exe: null, protocol: `shell:AppsFolder\\${family.trim()}!App` };
      }
    }
  } catch {
    /* ignore */
  }

  const mcDir = path.join(appData, '.minecraft');
  if (exists(mcDir)) return { exe: null, protocol: 'minecraft:' };
  return undefined;
}

async function findBedrock() {
  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `$p = Get-AppxPackage -Name "Microsoft.MinecraftUWP" -ErrorAction SilentlyContinue | Select-Object -First 1; if ($p) { "$($p.PackageFamilyName)|$($p.InstallLocation)" }`,
      ],
      { timeout: 8000, windowsHide: true }
    );
    const line = String(stdout || '').trim();
    if (!line || !line.includes('|')) return null;
    const [family, installLocation] = line.split('|');
    return {
      family: family.trim(),
      installLocation: installLocation.trim(),
    };
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<Array<object>>}
 */
async function detectMinecraftInstallations() {
  const found = [];
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const mcDir = path.join(appData, '.minecraft');

  try {
    const java = await findJavaLauncher();
    if (java !== undefined) {
      const last = latestSaveMtime(mcDir);
      const art = placeholder('Minecraft Java', '#d4ff00');
      const exe = typeof java === 'string' ? java : java?.exe;
      const protocol = typeof java === 'object' && java ? java.protocol : null;
      found.push({
        id: 'minecraft-java',
        name: 'Minecraft: Java Edition',
        platform: 'custom',
        installed: Boolean(exe) || Boolean(protocol) || exists(mcDir),
        installDir: exists(mcDir) ? mcDir : undefined,
        gamePath: exe || undefined,
        launchProtocol: exe ? undefined : protocol || undefined,
        kind: 'minecraft-java',
        detected: true,
        genres: ['Minecraft', 'Sandbox'],
        developers: ['Mojang Studios'],
        lastUpdated: last,
        ...art,
      });
    }
  } catch (err) {
    console.warn('[minecraft-detect] Java:', err.message);
  }

  try {
    const bedrock = await findBedrock();
    if (bedrock) {
      const art = placeholder('Minecraft Bedrock', '#22c55e');
      found.push({
        id: 'minecraft-bedrock',
        name: 'Minecraft: Bedrock Edition',
        platform: 'custom',
        installed: true,
        installDir: bedrock.installLocation || undefined,
        launchProtocol: `shell:AppsFolder\\${bedrock.family}!App`,
        kind: 'minecraft-bedrock',
        detected: true,
        genres: ['Minecraft', 'Sandbox'],
        developers: ['Mojang Studios'],
        ...art,
      });
    }
  } catch (err) {
    console.warn('[minecraft-detect] Bedrock:', err.message);
  }

  return found;
}

/**
 * Aggregate Java advancements from local saves.
 */
async function readJavaAdvancements() {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const saves = path.join(appData, '.minecraft', 'saves');
  if (!exists(saves)) {
    return { success: true, unlocked: 0, total: 0, items: [] };
  }

  const unlockedIds = new Set();
  let files = 0;

  try {
    for (const world of fs.readdirSync(saves)) {
      const advDir = path.join(saves, world, 'advancements');
      if (!exists(advDir)) continue;
      for (const file of fs.readdirSync(advDir)) {
        if (!file.endsWith('.json')) continue;
        files += 1;
        try {
          const data = JSON.parse(fs.readFileSync(path.join(advDir, file), 'utf8'));
          for (const [id, meta] of Object.entries(data)) {
            if (id.startsWith('DataVersion')) continue;
            if (meta && typeof meta === 'object' && meta.done === true) {
              unlockedIds.add(id);
            }
          }
        } catch {
          /* ignore bad json */
        }
      }
    }
  } catch (err) {
    return { success: false, error: err.message, unlocked: 0, total: 0, items: [] };
  }

  const items = Array.from(unlockedIds)
    .slice(0, 200)
    .map((id) => ({
      id,
      name: id.replace(/^minecraft:/, '').replace(/\//g, ' · '),
      achieved: true,
    }));

  return {
    success: true,
    unlocked: unlockedIds.size,
    total: Math.max(unlockedIds.size, files > 0 ? unlockedIds.size : 0),
    items,
  };
}

module.exports = {
  detectMinecraftInstallations,
  readJavaAdvancements,
};
