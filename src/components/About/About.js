import React from 'react';
import { motion } from 'framer-motion';
import { 
  Info, 
  Github, 
  Star, 
  Heart, 
  Monitor, 
  Zap, 
  Shield,
  ExternalLink
} from 'lucide-react';
import './About.css';

const About = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const features = [
    {
      icon: Monitor,
      title: 'Multi-Platform Support',
      description: 'Steam, Xbox Game Pass, Epic Games Store, and custom games in one place'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Built with React and Electron for optimal performance and responsiveness'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data stays on your device. No tracking, no ads, no data collection'
    }
  ];

  return (
    <motion.div 
      className="about-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div 
        className="about-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="about-header">
          <div className="about-logo">
            <img src="/l/logo/256x256.png" alt="Quark Launcher" />
          </div>
          <div className="about-title">
            <h1>Quark Launcher</h1>
            <p className="version">Version 2.0.0 Beta</p>
            <p className="tagline">The Ultimate Gaming Hub</p>
          </div>
          <button className="about-close" onClick={onClose}>×</button>
        </div>

        <div className="about-content">
          <div className="about-description">
            <p>
              Quark Launcher is a next-generation game launcher designed to unify your gaming experience 
              across multiple platforms. Built with modern web technologies, it offers a sleek, 
              Steam-inspired interface while providing powerful features for managing your game library.
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                className="feature-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="feature-icon">
                  <feature.icon size={24} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="tech-stack">
            <h3>Built With</h3>
            <div className="tech-items">
              <div className="tech-item">
                <span className="tech-name">React 18</span>
                <span className="tech-description">Modern UI framework</span>
              </div>
              <div className="tech-item">
                <span className="tech-name">Electron</span>
                <span className="tech-description">Cross-platform desktop app</span>
              </div>
              <div className="tech-item">
                <span className="tech-name">Framer Motion</span>
                <span className="tech-description">Smooth animations</span>
              </div>
              <div className="tech-item">
                <span className="tech-name">Lucide Icons</span>
                <span className="tech-description">Beautiful icon set</span>
              </div>
            </div>
          </div>

          <div className="about-stats">
            <div className="stat-item">
              <Star size={16} />
              <span>Open Source</span>
            </div>
            <div className="stat-item">
              <Heart size={16} />
              <span>Made with Love</span>
            </div>
            <div className="stat-item">
              <Shield size={16} />
              <span>Privacy First</span>
            </div>
          </div>
        </div>

        <div className="about-footer">
          <div className="about-links">
            <button className="about-link">
              <Github size={16} />
              <span>View on GitHub</span>
              <ExternalLink size={14} />
            </button>
            <button className="about-link">
              <Info size={16} />
              <span>Documentation</span>
              <ExternalLink size={14} />
            </button>
          </div>
          <div className="about-copyright">
            <p>&copy; 2024 Quark Launcher. All rights reserved.</p>
            <p>Built for gamers, by gamers.</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default About;