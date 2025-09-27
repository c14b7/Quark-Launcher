import React from 'react';
import { motion } from 'framer-motion';
import { Minus, Square, X } from 'lucide-react';
import './TitleBar.css';

const TitleBar = () => {
  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.windowMinimize();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.windowMaximize();
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.windowClose();
    }
  };

  return (
    <div className="titlebar">
      <div className="titlebar-drag-region">
        <div className="titlebar-content">
          <div className="titlebar-title">
            <span className="app-name">QUARK LAUNCHER</span>
            <span className="app-version">v2.0</span>
          </div>
        </div>
      </div>
      
      <div className="titlebar-controls">
        <motion.button
          className="titlebar-button titlebar-minimize"
          onClick={handleMinimize}
          whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          whileTap={{ scale: 0.95 }}
        >
          <Minus size={14} />
        </motion.button>
        
        <motion.button
          className="titlebar-button titlebar-maximize"
          onClick={handleMaximize}
          whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          whileTap={{ scale: 0.95 }}
        >
          <Square size={12} />
        </motion.button>
        
        <motion.button
          className="titlebar-button titlebar-close"
          onClick={handleClose}
          whileHover={{ backgroundColor: '#e81123' }}
          whileTap={{ scale: 0.95 }}
        >
          <X size={14} />
        </motion.button>
      </div>
    </div>
  );
};

export default TitleBar;