/**
 * Windows System Media Transport Controls bridge (SMTC).
 * Uses PowerShell + WinRT GlobalSystemMediaTransportControlsSessionManager.
 */
const { execFile } = require('child_process');
const { globalShortcut } = require('electron');

const PS_GET = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
Function Await($WinRtTask, $ResultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null
$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$session = $mgr.GetCurrentSession()
if (-not $session) { Write-Output '{"empty":true}'; exit }
$info = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
$timeline = $session.GetTimelineProperties()
$playback = $session.GetPlaybackInfo()
$title = if ($info.Title) { $info.Title } else { '' }
$artist = if ($info.Artist) { $info.Artist } else { '' }
$album = if ($info.AlbumTitle) { $info.AlbumTitle } else { '' }
$app = if ($session.SourceAppUserModelId) { $session.SourceAppUserModelId } else { '' }
$playing = if ($playback.PlaybackStatus -eq 4) { 'true' } else { 'false' }
$pos = [math]::Round($timeline.Position.TotalSeconds, 1)
$dur = [math]::Round($timeline.EndTime.TotalSeconds, 1)
$obj = @{
  title = $title
  artist = $artist
  album = $album
  appName = $app
  isPlaying = ($playing -eq 'true')
  positionSec = $pos
  durationSec = $dur
}
$obj | ConvertTo-Json -Compress
`;

function runPs(script, timeout = 4000) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve(null);
      return;
    }
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      { timeout, windowsHide: true, maxBuffer: 1024 * 512 },
      (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        const raw = String(stdout || '').trim();
        if (!raw) {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve(null);
        }
      }
    );
  });
}

function runControl(method) {
  const script = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
Function AwaitBool($WinRtTask) {
  $asTask = $asTaskGeneric.MakeGenericMethod([bool])
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] | Out-Null
$mgr = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
$asTask = $asTaskGeneric.MakeGenericMethod([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$net = $asTask.Invoke($null, @($mgr))
$net.Wait(-1) | Out-Null
$session = $net.Result.GetCurrentSession()
if (-not $session) { Write-Output '{"ok":false}'; exit }
$result = AwaitBool ($session.${method}())
@{ ok = [bool]$result } | ConvertTo-Json -Compress
`;
  return runPs(script, 3000);
}

class MediaSmtcBridge {
  constructor({ onUpdate, onBroadcastOverlay } = {}) {
    this.onUpdate = onUpdate || (() => {});
    this.onBroadcastOverlay = onBroadcastOverlay || (() => {});
    this.timer = null;
    this.last = null;
    this.hotkeysRegistered = false;
  }

  start(intervalMs = 1200) {
    this.stop();
    this.timer = setInterval(() => void this.poll(), intervalMs);
    void this.poll();
    this.registerHotkeys();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.unregisterHotkeys();
  }

  async poll() {
    const data = await runPs(PS_GET);
    let session = null;
    if (data && !data.empty) {
      session = {
        title: data.title || undefined,
        artist: data.artist || undefined,
        album: data.album || undefined,
        appName: data.appName || undefined,
        isPlaying: Boolean(data.isPlaying),
        positionSec: Number(data.positionSec) || 0,
        durationSec: Number(data.durationSec) || 0,
        updatedAt: new Date().toISOString(),
      };
    }
    this.last = session;
    this.onUpdate(session);
    this.onBroadcastOverlay(session);
  }

  getSession() {
    return this.last;
  }

  async playPause() {
    await runControl('TryTogglePlayPauseAsync');
    await this.poll();
    return { success: true };
  }

  async next() {
    await runControl('TrySkipNextAsync');
    await this.poll();
    return { success: true };
  }

  async previous() {
    await runControl('TrySkipPreviousAsync');
    await this.poll();
    return { success: true };
  }

  registerHotkeys() {
    if (this.hotkeysRegistered || process.platform !== 'win32') return;
    try {
      const regs = [
        ['MediaPlayPause', () => void this.playPause()],
        ['MediaNextTrack', () => void this.next()],
        ['MediaPreviousTrack', () => void this.previous()],
      ];
      for (const [key, fn] of regs) {
        try {
          if (!globalShortcut.isRegistered(key)) globalShortcut.register(key, fn);
        } catch {
          /* media keys may be unavailable */
        }
      }
      this.hotkeysRegistered = true;
    } catch (e) {
      console.warn('[MediaSMTC] hotkeys failed', e?.message || e);
    }
  }

  unregisterHotkeys() {
    if (!this.hotkeysRegistered) return;
    try {
      ['MediaPlayPause', 'MediaNextTrack', 'MediaPreviousTrack'].forEach((k) => {
        try {
          if (globalShortcut.isRegistered(k)) globalShortcut.unregister(k);
        } catch {
          /* ignore */
        }
      });
    } catch {
      /* ignore */
    }
    this.hotkeysRegistered = false;
  }
}

module.exports = { MediaSmtcBridge };
