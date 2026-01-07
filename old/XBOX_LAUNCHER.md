# Xbox App Game Launcher

This feature enables launching games from the Xbox App using URI protocols.

## How it works

1. **PowerShell Script**: `v/Start-XboxGame.ps1` handles the actual game launching using Windows Explorer and Xbox URIs
2. **Game Data**: Enhanced `xbox_games.json` contains game information including launch URIs
3. **UI Integration**: Xbox games are displayed in the sidebar with launch buttons
4. **Cross-platform Support**: Works in both Electron and web browser environments

## Usage

### Command Line
```powershell
.\v\Start-XboxGame.ps1 -gameURI "ms-xbox-store://game/?id=9WZDNCRFJ3TJ"
```

### From UI
- Xbox games appear in the left sidebar with Xbox icons
- Click the play button next to any Xbox game to launch it
- A notification will show the launch status

## URI Format

Xbox game URIs follow the format:
```
ms-xbox-store://game/?id={GAME_ID}
```

Example game IDs:
- `9WZDNCRFJ3TJ` - Sample game
- `9NMGXBQ69CQ8` - TUNIC
- `9P4L3VJKVD7C` - Car Mechanic Simulator 2021

## Technical Details

- **PowerShell Execution Policy**: Script uses `-ExecutionPolicy Bypass` for compatibility
- **Error Handling**: Includes proper error checking and user feedback
- **Node.js Integration**: Uses child_process.spawn() for Electron environment
- **Web Fallback**: Uses window.open() for browser environment

## Files Modified

1. `v/Start-XboxGame.ps1` - Main PowerShell launcher script
2. `xbox-launcher.js` - JavaScript UI integration
3. `xbox-launcher-node.js` - Node.js backend module
4. `xbox_games.json` - Enhanced with URI data
5. `v/x.py` - Updated to generate URIs
6. `index.html` - Added script reference
7. `styles.css` - Added Xbox launcher styling