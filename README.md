# 🚀 Quark Launcher

**The Ultimate Gaming Hub** - A modern, multi-platform game launcher built with React and Electron.

![Quark Launcher](screenshot.png)

## ✨ Features

### 🎮 Multi-Platform Gaming
- **Steam Integration** - Full library sync with Steam API
- **Xbox Game Pass** - Access your Xbox and Game Pass games  
- **Epic Games Store** - Launch Epic games directly
- **Custom Games** - Add non-platform games to your library

### 🎨 Modern Interface
- **Steam-inspired Design** - Familiar yet modern UI/UX
- **Glass Morphism Effects** - Beautiful translucent interface elements
- **Smooth Animations** - Framer Motion powered transitions
- **Dark Theme** - Easy on the eyes for long gaming sessions

### 🛠️ Advanced Features  
- **Game Library Management** - Organize, filter, and search games
- **Recently Played** - Quick access to your favorite games
- **Platform Statistics** - Track gaming habits across platforms
- **Settings Panel** - Customize appearance and behavior
- **Secure & Private** - No data collection or tracking

## 🏗️ Tech Stack

- **Frontend**: React 18, Framer Motion, Lucide Icons
- **Desktop**: Electron 27 with security best practices
- **Styling**: CSS3 with modern variables and effects
- **APIs**: Steam Web API, Microsoft Store, Epic Games Launcher protocols

## 🚦 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/quark-launcher.git
cd quark-launcher
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development servers**
```bash
# Terminal 1: Start React development server
npm run start-renderer

# Terminal 2: Start Electron application  
npm start
```

### Building for Production

```bash
# Build React app
npm run build

# Package Electron app
npm run electron-pack
```

## 🎮 Platform Integration

### Steam Integration
1. Get your Steam API key from [Steam Community](https://steamcommunity.com/dev/apikey)
2. Add your API key in Settings > Platforms > Steam
3. Your Steam library will sync automatically

### Xbox Game Pass
- Automatically detects installed Xbox games
- Uses Windows MS Store integration
- No additional setup required on Windows

### Epic Games Store  
- Auto-detects Epic Games Launcher installation
- Uses Epic launcher protocols for game launching
- Supports both paid and free games

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── TitleBar/        # Custom window title bar
│   ├── Sidebar/         # Navigation and game library
│   ├── Hero/           # Featured games carousel  
│   ├── GameGrid/       # Game library grid/list view
│   ├── Settings/       # Settings modal
│   └── About/          # About dialog
├── services/            # Platform integration services
│   ├── PlatformManager.js  # Unified platform interface
│   ├── SteamService.js     # Steam API integration
│   ├── XboxService.js      # Xbox/Game Pass integration
│   └── EpicService.js      # Epic Games Store integration
├── styles/              # Global styles and themes
└── main.js             # Electron main process
```

## ⚙️ Configuration

### Settings
Access settings through the gear icon in the sidebar:

- **General**: Startup behavior, notifications, auto-launch
- **Appearance**: Themes, colors, animations, opacity
- **Platforms**: Enable/disable platforms, API keys, paths  
- **Downloads**: Download locations, bandwidth limits
- **Privacy**: Data sharing preferences, logging levels

### Platform Paths
The app auto-detects platform installations, but you can manually configure:
- Steam: Usually `C:\Program Files (x86)\Steam\`
- Epic: Usually `C:\Program Files (x86)\Epic Games\Launcher\`
- Xbox: Built into Windows (no path required)

## 🔧 Development

### Available Scripts
- `npm start` - Start Electron app  
- `npm run start-renderer` - Start React dev server
- `npm run build` - Build React app for production
- `npm run electron-dev` - Start Electron in development mode
- `npm run electron-pack` - Package app for distribution
- `npm test` - Run tests

### Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)  
5. Open a Pull Request

## 🐛 Troubleshooting

### Common Issues

**"Steam games not loading"**
- Ensure your Steam API key is valid
- Check if Steam is running
- Verify your Steam profile is public

**"Epic games won't launch"**  
- Make sure Epic Games Launcher is installed
- Check if launcher is running
- Try running as administrator

**"Xbox games not detected"**
- Only available on Windows 10/11
- Enable Xbox app integration in Windows
- Check Windows Store for updates

**"App won't start"**
- Clear `node_modules` and run `npm install`
- Check Node.js version compatibility
- Try `npm run clean` if available

## 📸 Screenshots

### Home Screen
![Home Screen](docs/screenshots/home.png)

### Game Library  
![Game Library](docs/screenshots/library.png)

### Settings Panel
![Settings](docs/screenshots/settings.png)

## 🔮 Roadmap

- [ ] **Cloud Saves Sync** - Sync saves across devices
- [ ] **Game Time Tracking** - Detailed gaming statistics  
- [ ] **Friends Integration** - See what friends are playing
- [ ] **Download Manager** - Manage game downloads/updates
- [ ] **Mod Support** - Integration with mod platforms
- [ ] **Streaming Integration** - Connect with Twitch/YouTube
- [ ] **Mobile Companion** - Remote control via mobile app

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Steam** - For the inspiration and API access
- **Electron Team** - For the amazing desktop framework
- **React Team** - For the best UI library  
- **Framer** - For smooth animations
- **Lucide** - For beautiful icons
- **Gaming Community** - For feedback and support

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/quark-launcher/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/quark-launcher/discussions)  
- **Email**: support@quarklauncher.com

---

**Built with ❤️ for gamers, by gamers.**

*Quark Launcher - Where all your games unite.*