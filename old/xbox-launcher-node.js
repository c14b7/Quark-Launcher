// Xbox Game Launcher Node.js module
const { spawn } = require('child_process');
const path = require('path');

class XboxGameLauncherNode {
    static async launchGame(gameURI, gameName) {
        return new Promise((resolve, reject) => {
            if (!gameURI) {
                reject(new Error('No URI provided for game: ' + gameName));
                return;
            }

            const scriptPath = path.join(__dirname, 'v', 'Start-XboxGame.ps1');
            const process = spawn('powershell', [
                '-ExecutionPolicy', 'Bypass',
                '-File', scriptPath,
                '-gameURI', gameURI
            ]);

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    console.log(`Successfully launched ${gameName}`);
                    console.log('PowerShell output:', stdout);
                    resolve({ success: true, output: stdout });
                } else {
                    console.error(`Failed to launch ${gameName}, exit code: ${code}`);
                    console.error('PowerShell error:', stderr);
                    reject(new Error(`Launch failed with exit code ${code}: ${stderr}`));
                }
            });

            process.on('error', (error) => {
                console.error('Error spawning PowerShell process:', error);
                reject(error);
            });
        });
    }
}

module.exports = XboxGameLauncherNode;