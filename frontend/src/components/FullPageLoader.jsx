import React, { useState, useEffect } from 'react';
import './FullPageLoader.css';

const icons = ['☀️', '☁️', '🌧️', '⚡', '❄️'];
const messages = [
  "Gathering current weather conditions...",
  "Consulting the AI for your advice...",
  "Checking the UV index for skincare...",
  "Almost ready...",
  "Analyzing atmospheric data..."
];

export default function FullPageLoader() {
  const [iconIndex, setIconIndex] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const iconInterval = setInterval(() => {
      setIconIndex((prev) => (prev + 1) % icons.length);
    }, 800);
    
    const msgInterval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    
    return () => {
      clearInterval(iconInterval);
      clearInterval(msgInterval);
    };
  }, []);

  return (
    <div className="full-page-loader-overlay animate-fade-in">
      <div className="loader-glass-card">
        <div className="loader-icon-container">
          <span className="loader-icon pulse-animation">{icons[iconIndex]}</span>
        </div>
        <h3 className="loader-title">Please wait</h3>
        <p className="loader-message">{messages[msgIndex]}</p>
      </div>
    </div>
  );
}
