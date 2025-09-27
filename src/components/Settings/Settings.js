import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  User, 
  Palette, 
  Monitor, 
  Download, 
  Shield, 
  HardDrive,
  Wifi,
  Bell,
  RefreshCw,
  Save,
  RotateCcw
} from 'lucide-react';
import './Settings.css';

const Settings = ({ isOpen, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      startWithSystem: true,
      minimizeToTray: true,
      closeToTray: false,
      autoLaunchGames: true,
      showNotifications: true
    },
    appearance: {
      theme: 'dark',
      accentColor: '#3b82f6',
      backgroundOpacity: 85,
      enableAnimations: true,
      showGameArt: true,
      gridSize: 'medium'
    },
    platforms: {
      steam: {
        enabled: true,
        autoDetect: true,
        steamPath: '',
        apiKey: ''
      },
      xbox: {
        enabled: true,
        autoDetect: true,
        showGamePass: true
      },
      epic: {
        enabled: true,
        autoDetect: true,
        epicPath: ''
      }
    },
    downloads: {
      downloadPath: '',
      maxConcurrentDownloads: 3,
      bandwidthLimit: 0, // 0 = unlimited
      pauseOnGameLaunch: false
    },
    privacy: {
      shareUsageData: false,
      enableCrashReports: true,
      logLevel: 'info'
    }
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [platformStatus, setPlatformStatus] = useState({});

  useEffect(() => {
    // Load settings from localStorage or API
    loadSettings();
    checkPlatformStatus();
  }, []);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('quark_settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const checkPlatformStatus = async () => {
    const status = {};
    
    if (window.electronAPI) {
      try {
        const steamDetect = await window.electronAPI.detectSteam();
        status.steam = steamDetect;
        
        const epicDetect = await window.electronAPI.detectEpicLauncher();
        status.epic = epicDetect;
        
        // Xbox is always available on Windows
        status.xbox = { found: window.electronAPI.platform === 'win32', path: 'Built-in' };
      } catch (error) {
        console.error('Error detecting platforms:', error);
      }
    }
    
    setPlatformStatus(status);
  };

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleNestedSettingChange = (category, subKey, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subKey]: {
          ...prev[category][subKey],
          [key]: value
        }
      }
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    try {
      localStorage.setItem('quark_settings', JSON.stringify(settings));
      setHasChanges(false);
      onSave?.(settings);
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleReset = () => {
    loadSettings();
    setHasChanges(false);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'platforms', label: 'Platforms', icon: Monitor },
    { id: 'downloads', label: 'Downloads', icon: Download },
    { id: 'privacy', label: 'Privacy', icon: Shield }
  ];

  const themeOptions = [
    { value: 'dark', label: 'Dark Theme' },
    { value: 'light', label: 'Light Theme' },
    { value: 'system', label: 'System Default' }
  ];

  const accentColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="settings-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className="settings-modal"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="settings-header">
            <h2>
              <SettingsIcon size={24} />
              Settings
            </h2>
            <button className="settings-close" onClick={onClose}>×</button>
          </div>

          <div className="settings-content">
            <div className="settings-sidebar">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon size={20} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="settings-main">
              <AnimatePresence mode="wait">
                {/* General Settings */}
                {activeTab === 'general' && (
                  <motion.div 
                    key="general"
                    className="settings-section"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h3>General Settings</h3>
                    
                    <div className="setting-group">
                      <label className="setting-item">
                        <div className="setting-info">
                          <span>Start with system</span>
                          <small>Launch Quark Launcher when Windows starts</small>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.general.startWithSystem}
                          onChange={e => handleSettingChange('general', 'startWithSystem', e.target.checked)}
                        />
                      </label>

                      <label className="setting-item">
                        <div className="setting-info">
                          <span>Minimize to tray</span>
                          <small>Minimize to system tray instead of taskbar</small>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.general.minimizeToTray}
                          onChange={e => handleSettingChange('general', 'minimizeToTray', e.target.checked)}
                        />
                      </label>

                      <label className="setting-item">
                        <div className="setting-info">
                          <span>Close to tray</span>
                          <small>Keep running in background when closed</small>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.general.closeToTray}
                          onChange={e => handleSettingChange('general', 'closeToTray', e.target.checked)}
                        />
                      </label>

                      <label className="setting-item">
                        <div className="setting-info">
                          <span>Auto-launch games</span>
                          <small>Automatically launch games when clicked</small>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.general.autoLaunchGames}
                          onChange={e => handleSettingChange('general', 'autoLaunchGames', e.target.checked)}
                        />
                      </label>

                      <label className="setting-item">
                        <div className="setting-info">
                          <span>Show notifications</span>
                          <small>Display system notifications for updates and events</small>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.general.showNotifications}
                          onChange={e => handleSettingChange('general', 'showNotifications', e.target.checked)}
                        />
                      </label>
                    </div>
                  </motion.div>
                )}

                {/* Appearance Settings */}
                {activeTab === 'appearance' && (
                  <motion.div 
                    key="appearance"
                    className="settings-section"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h3>Appearance</h3>
                    
                    <div className="setting-group">
                      <div className="setting-item">
                        <div className="setting-info">
                          <span>Theme</span>
                          <small>Choose your preferred color scheme</small>
                        </div>
                        <select
                          value={settings.appearance.theme}
                          onChange={e => handleSettingChange('appearance', 'theme', e.target.value)}
                        >
                          {themeOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="setting-item">
                        <div className="setting-info">
                          <span>Accent Color</span>
                          <small>Choose your accent color</small>
                        </div>
                        <div className="color-picker">
                          {accentColors.map(color => (
                            <button
                              key={color}
                              className={`color-option ${settings.appearance.accentColor === color ? 'active' : ''}`}
                              style={{ backgroundColor: color }}
                              onClick={() => handleSettingChange('appearance', 'accentColor', color)}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="setting-item">
                        <div className="setting-info">
                          <span>Background Opacity</span>
                          <small>{settings.appearance.backgroundOpacity}%</small>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="100"
                          value={settings.appearance.backgroundOpacity}
                          onChange={e => handleSettingChange('appearance', 'backgroundOpacity', parseInt(e.target.value))}
                        />
                      </div>

                      <label className="setting-item">
                        <div className="setting-info">
                          <span>Enable animations</span>
                          <small>Smooth transitions and effects</small>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.appearance.enableAnimations}
                          onChange={e => handleSettingChange('appearance', 'enableAnimations', e.target.checked)}
                        />
                      </label>

                      <label className="setting-item">
                        <div className="setting-info">
                          <span>Show game artwork</span>
                          <small>Display game banners and screenshots</small>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.appearance.showGameArt}
                          onChange={e => handleSettingChange('appearance', 'showGameArt', e.target.checked)}
                        />
                      </label>
                    </div>
                  </motion.div>
                )}

                {/* Platform Settings */}
                {activeTab === 'platforms' && (
                  <motion.div 
                    key="platforms"
                    className="settings-section"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h3>Gaming Platforms</h3>
                    
                    {Object.entries(settings.platforms).map(([platform, config]) => (
                      <div key={platform} className="platform-section">
                        <div className="platform-header">
                          <h4>{platform.charAt(0).toUpperCase() + platform.slice(1)}</h4>
                          <div className={`platform-status ${platformStatus[platform]?.found ? 'detected' : 'not-detected'}`}>
                            {platformStatus[platform]?.found ? '✓ Detected' : '✗ Not Found'}
                          </div>
                        </div>
                        
                        <div className="setting-group">
                          <label className="setting-item">
                            <div className="setting-info">
                              <span>Enable {platform}</span>
                              <small>Include games from this platform</small>
                            </div>
                            <input
                              type="checkbox"
                              checked={config.enabled}
                              onChange={e => handleNestedSettingChange('platforms', platform, 'enabled', e.target.checked)}
                            />
                          </label>

                          {config.autoDetect !== undefined && (
                            <label className="setting-item">
                              <div className="setting-info">
                                <span>Auto-detect</span>
                                <small>Automatically find {platform} installation</small>
                              </div>
                              <input
                                type="checkbox"
                                checked={config.autoDetect}
                                onChange={e => handleNestedSettingChange('platforms', platform, 'autoDetect', e.target.checked)}
                              />
                            </label>
                          )}

                          {platform === 'steam' && (
                            <div className="setting-item">
                              <div className="setting-info">
                                <span>Steam API Key</span>
                                <small>Required for accessing your Steam library</small>
                              </div>
                              <input
                                type="password"
                                placeholder="Enter Steam API Key"
                                value={config.apiKey}
                                onChange={e => handleNestedSettingChange('platforms', platform, 'apiKey', e.target.value)}
                              />
                            </div>
                          )}

                          {platform === 'xbox' && (
                            <label className="setting-item">
                              <div className="setting-info">
                                <span>Show Game Pass games</span>
                                <small>Include Xbox Game Pass library</small>
                              </div>
                              <input
                                type="checkbox"
                                checked={config.showGamePass}
                                onChange={e => handleNestedSettingChange('platforms', platform, 'showGamePass', e.target.checked)}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* Download Settings */}
                {activeTab === 'downloads' && (
                  <motion.div 
                    key="downloads"
                    className="settings-section"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h3>Download Settings</h3>
                    
                    <div className="setting-group">
                      <div className="setting-item">
                        <div className="setting-info">
                          <span>Download folder</span>
                          <small>Where to save downloaded games and updates</small>
                        </div>
                        <div className="path-input">
                          <input
                            type="text"
                            value={settings.downloads.downloadPath}
                            onChange={e => handleSettingChange('downloads', 'downloadPath', e.target.value)}
                            placeholder="Choose download folder..."
                          />
                          <button className="browse-button">
                            <HardDrive size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="setting-item">
                        <div className="setting-info">
                          <span>Concurrent downloads</span>
                          <small>Maximum number of simultaneous downloads</small>
                        </div>
                        <select
                          value={settings.downloads.maxConcurrentDownloads}
                          onChange={e => handleSettingChange('downloads', 'maxConcurrentDownloads', parseInt(e.target.value))}
                        >
                          {[1, 2, 3, 4, 5].map(num => (
                            <option key={num} value={num}>{num} download{num > 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>

                      <div className="setting-item">
                        <div className="setting-info">
                          <span>Bandwidth limit</span>
                          <small>0 = unlimited</small>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={settings.downloads.bandwidthLimit}
                          onChange={e => handleSettingChange('downloads', 'bandwidthLimit', parseInt(e.target.value))}
                          placeholder="MB/s"
                        />
                      </div>

                      <label className="setting-item">
                        <div className="setting-info">
                          <span>Pause on game launch</span>
                          <small>Pause downloads when launching games</small>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.downloads.pauseOnGameLaunch}
                          onChange={e => handleSettingChange('downloads', 'pauseOnGameLaunch', e.target.checked)}
                        />
                      </label>
                    </div>
                  </motion.div>
                )}

                {/* Privacy Settings */}
                {activeTab === 'privacy' && (
                  <motion.div 
                    key="privacy"
                    className="settings-section"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h3>Privacy & Data</h3>
                    
                    <div className="setting-group">
                      <label className="setting-item">
                        <div className="setting-info">
                          <span>Share usage data</span>
                          <small>Help improve Quark Launcher by sharing anonymous usage statistics</small>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.privacy.shareUsageData}
                          onChange={e => handleSettingChange('privacy', 'shareUsageData', e.target.checked)}
                        />
                      </label>

                      <label className="setting-item">
                        <div className="setting-info">
                          <span>Enable crash reports</span>
                          <small>Automatically send crash reports to help fix bugs</small>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.privacy.enableCrashReports}
                          onChange={e => handleSettingChange('privacy', 'enableCrashReports', e.target.checked)}
                        />
                      </label>

                      <div className="setting-item">
                        <div className="setting-info">
                          <span>Log level</span>
                          <small>Amount of logging information to store</small>
                        </div>
                        <select
                          value={settings.privacy.logLevel}
                          onChange={e => handleSettingChange('privacy', 'logLevel', e.target.value)}
                        >
                          <option value="error">Error only</option>
                          <option value="warn">Warnings & Errors</option>
                          <option value="info">Info & above</option>
                          <option value="debug">Debug (verbose)</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="settings-footer">
            <div className="settings-actions">
              <button 
                className="btn-secondary"
                onClick={handleReset}
                disabled={!hasChanges}
              >
                <RotateCcw size={16} />
                Reset
              </button>
              <button 
                className="btn-primary"
                onClick={handleSave}
                disabled={!hasChanges}
              >
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Settings;