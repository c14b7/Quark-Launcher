// Xbox Game Launcher functionality
class XboxGameLauncher {
    constructor() {
        this.xboxGames = [];
        this.loadXboxGames();
    }

    async loadXboxGames() {
        try {
            const response = await fetch('xbox_games.json');
            this.xboxGames = await response.json();
            this.displayXboxGames();
        } catch (error) {
            console.error('Error loading Xbox games:', error);
        }
    }

    displayXboxGames() {
        const gamesList = document.querySelector('.games-list');
        if (!gamesList) return;

        // Clear existing Xbox games (if any)
        const existingXboxGames = gamesList.querySelectorAll('.xbox-game');
        existingXboxGames.forEach(game => game.remove());

        // Add Xbox games to the list
        this.xboxGames.forEach(game => {
            const gameItem = document.createElement('li');
            gameItem.className = 'xbox-game';
            gameItem.innerHTML = `
                <img src="l/logo/xbox-logo.png" alt="Xbox" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iNSIgZmlsbD0iIzEwNzQzQyIvPgo8dGV4dCB4PSIyMCIgeT0iMjUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlg8L3RleHQ+Cjwvc3ZnPg=='">
                <span class="game-name">${this.getDisplayName(game.name)}</span>
                <button class="launch-btn xbox-launch" data-uri="${game.game_uri || ''}" data-name="${game.name}">
                    <i class="fas fa-play"></i>
                </button>
            `;
            gamesList.appendChild(gameItem);
        });

        // Add click event listeners for Xbox game launch buttons
        this.attachLaunchHandlers();
    }

    getDisplayName(packageName) {
        // Convert package names to more readable format
        const nameMap = {
            'Microsoft.Lovika': 'Lovika',
            'Finji.TUNIC': 'TUNIC',
            '5901F20F.CarMechanicSimulator2021': 'Car Mechanic Simulator 2021',
            'Microsoft.4297127D64EC6': 'Minecraft',
            'GSCGameWorld.S.T.A.L.K.E.R.2HeartofChernobyl': 'S.T.A.L.K.E.R. 2: Heart of Chernobyl',
            'BethesdaSoftworks.ProjectGold': 'Starfield'
        };
        return nameMap[packageName] || packageName.replace(/\./g, ' ');
    }

    attachLaunchHandlers() {
        const launchButtons = document.querySelectorAll('.xbox-launch');
        launchButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const uri = button.dataset.uri;
                const gameName = button.dataset.name;
                this.launchXboxGame(uri, gameName);
            });
        });
    }

    async launchXboxGame(gameURI, gameName) {
        if (!gameURI) {
            console.error('No URI provided for game:', gameName);
            alert('Nie można uruchomić gry - brak URI');
            return;
        }

        try {
            // For Electron environment, use Node.js launcher
            if (typeof require !== 'undefined') {
                const XboxGameLauncherNode = require('./xbox-launcher-node.js');
                const result = await XboxGameLauncherNode.launchGame(gameURI, gameName);
                console.log('Game launch result:', result);
                
                // Show success message
                const notification = document.createElement('div');
                notification.className = 'launch-notification success';
                notification.textContent = `Uruchamianie ${this.getDisplayName(gameName)}...`;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 3000);
                
            } else {
                // For web environment, try using the protocol directly
                window.open(gameURI, '_blank');
            }
        } catch (error) {
            console.error('Error launching Xbox game:', error);
            
            // Show error message
            const notification = document.createElement('div');
            notification.className = 'launch-notification error';
            notification.textContent = `Błąd podczas uruchamiania gry: ${error.message}`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }
    }
}

// Initialize Xbox Game Launcher when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const xboxLauncher = new XboxGameLauncher();
});