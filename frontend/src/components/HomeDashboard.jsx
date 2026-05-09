import React, { useState, useRef } from 'react';
import './HomeDashboard.css';
import profilePic from '../assets/edwin_dp.png';

function HomeDashboard({
  currentWeather,
  selectedCity,
  theme,
  cityQuery,
  setCityQuery,
  searching,
  searchCity,
  cityResults,
  setCityResults,
  pickCity,
  toggleTheme,
  error
}) {
  const [profileImage, setProfileImage] = useState(localStorage.getItem('user-dp') || profilePic);
  const fileInputRef = useRef(null);

  if (!currentWeather) return null;

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setProfileImage(base64String);
        localStorage.setItem('user-dp', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const cw = currentWeather.current;
  
  // UV label helper
  const getUvLabel = (uv) => {
    if (uv <= 2) return "Low";
    if (uv <= 5) return "Moderate";
    if (uv <= 7) return "High";
    if (uv <= 10) return "Very High";
    return "Extreme";
  };

  // Curve SVG Generator
  const renderForecastCurve = () => {
    if (!currentWeather.forecast || currentWeather.forecast.length === 0) return null;
    
    // Get next 6 hours starting from the city's local current hour
    const currentHourIdx = cw.local_hour || 0;
    const next6Hours = currentWeather.forecast.slice(currentHourIdx, currentHourIdx + 6);
    if (next6Hours.length < 6) return null; // Fallback if data is short
    
    const temps = next6Hours.map(item => typeof item === 'object' ? item.temp : item); 
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const tempRange = maxTemp - minTemp || 1; // avoid division by zero

    const svgWidth = 900;
    const svgHeight = 200;
    const paddingY = 50; // padding top and bottom for text/icons
    const innerHeight = svgHeight - (paddingY * 2);

    const points = temps.map((t, i) => {
      const x = i === 0 ? 40 : i === temps.length - 1 ? svgWidth - 40 : (i / (temps.length - 1)) * svgWidth;
      const normalizedTemp = (t - minTemp) / tempRange;
      const y = paddingY + innerHeight - (normalizedTemp * innerHeight);
      return { x, y, temp: t };
    });

    let pathD = `M ${points[0].x},${points[0].y} `;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const cpX = (p1.x + p2.x) / 2;
      pathD += `C ${cpX},${p1.y} ${cpX},${p2.y} ${p2.x},${p2.y} `;
    }

    const fillPathD = `${pathD} L ${points[points.length-1].x},${svgHeight} L ${points[0].x},${svgHeight} Z`;

    return (
      <div className="forecast-curve-wrapper">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="curve-svg">
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
              <stop offset="50%" stopColor="rgba(255,255,255,1)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
            </linearGradient>
          </defs>
          
          <path d={fillPathD} fill="url(#curveGradient)" />
          <path d={pathD} fill="none" stroke="url(#lineGradient)" strokeWidth="3" />
          
          {points.map((p, i) => {
            const hour = (currentHourIdx + i) % 24;
            const hourStr = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
            
            const forecastItem = next6Hours[i] || {};
            let icon = '☁️';
            if (forecastItem.precip > 30) icon = '🌧️';
            else if (forecastItem.uv > 4) icon = '☀️';
            else if (hour < 6 || hour > 18) icon = '🌙';

            return (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#fff" />
                {i === 2 && <circle cx={p.x} cy={p.y} r="12" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" className="pulse-ring" />}
                
                <text x={p.x} y={p.y - 15} fill="#fff" fontSize="16" fontWeight="700" textAnchor="middle">
                  {Math.round(p.temp)}°
                  <tspan fontSize="12" dy="-2" dx="4">{icon}</tspan>
                </text>
                
                <text x={p.x} y={svgHeight - 5} fill="rgba(255,255,255,0.8)" fontSize="13" fontWeight="600" textAnchor="middle">
                  {i === 0 ? 'Now' : hourStr}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="home-dashboard-wrapper animate-fade-in" style={{ padding: '2rem' }}>
      
      <div className="home-grid">
        {/* LEFT COLUMN: Hero & Curve */}
        <div className="home-left-col">
          {/* Top Bar for Profile Greeting */}
          <div className="home-top-bar">
            <div className="welcome-text">
              Welcome<br/>
              <strong>Edwin Joju</strong>
            </div>
          </div>

          {/* Main Hero Condition */}
          <div className="hero-condition-container">
            <h1 className="massive-condition">{cw.condition_text}</h1>
            <p className="condition-subtext">
              Currently feels like {Math.round(cw.feels_like)}° with a high of {Math.round(cw.high)}°.
              {cw.precip_prob > 20 ? ` There is a ${cw.precip_prob}% chance of rain today.` : ' Enjoy the weather!'}
            </p>
          </div>

          {/* Temperature Curve */}
          <div className="forecast-curve-container glass-panel">
            {renderForecastCurve()}
          </div>
        </div>

        {/* RIGHT COLUMN: Metrics Stack */}
        <div className="home-right-col">
          {/* Top Right Actions Row */}
          <div className="top-right-actions">
            <button className="action-btn glass-panel" title="Add Location">➕</button>
            
            <div className="hero-search-wrapper">
              <div className="hero-search-input-group glass-panel">
                <span className="hero-search-icon">🔍</span>
                <input 
                  type="text" 
                  className="hero-search-input"
                  placeholder="Search..." 
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchCity(e)}
                />
                {searching && <div className="searching-loader-mini"></div>}
              </div>
              
              {/* Search Results / Error Dropdown */}
              {(cityResults.length > 0 || error) && (
                <div className="hero-search-results-dropdown glass-panel animate-fade-in" style={{ padding: error ? '1rem' : '0.5rem' }}>
                  {error ? (
                    <div style={{ color: '#ff8a8a', fontSize: '0.9rem', textAlign: 'center', fontWeight: '500' }}>
                      {error}
                    </div>
                  ) : (
                    cityResults.map((city, idx) => (
                      <div 
                        key={idx} 
                        className="hero-search-result-item"
                        onClick={() => pickCity(city)}
                      >
                        <span className="hero-search-result-name">{city.name}</span>
                        <span className="hero-search-result-country">
                          {city.admin1 ? `${city.admin1}, ` : ''}{city.country}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            <button className="action-btn glass-panel" title="Notifications">🔔</button>
            <button 
              className="action-btn glass-panel" 
              onClick={toggleTheme} 
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
            <div 
              className="profile-avatar-container" 
              onClick={() => fileInputRef.current?.click()}
              title="Click to upload profile picture"
            >
              <img src={profileImage} alt="Profile" className="profile-avatar" />
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleUpload} 
                style={{ display: 'none' }} 
                accept="image/*"
              />
              <div className="avatar-overlay">📷</div>
            </div>
          </div>

          {/* Main City Card */}
          <div className="primary-city-card glass-panel">
            <div className="city-header">
              <span className="icon">📍</span> {selectedCity?.name || "Your Location"}
            </div>
            <div className="city-temp">{Math.round(cw.temp)}°C</div>
            <div className="city-mini-stats">
              <span>💨 {Math.round(cw.wind)} km/h</span>
              <span>💧 {cw.precip_prob}%</span>
              <span>👁️ {(cw.visibility / 1000).toFixed(1)} km</span>
            </div>
          </div>

          {/* Detailed Metrics Stack */}
          <div className="metrics-stack">
            <div className="metric-box glass-panel">
              <span className="metric-label">High / Low</span>
              <span className="metric-value">{Math.round(cw.high)}° / {Math.round(cw.low)}°</span>
            </div>
            <div className="metric-box glass-panel">
              <span className="metric-label">Humidity</span>
              <span className="metric-value">{cw.humidity}%</span>
            </div>
            <div className="metric-box glass-panel">
              <span className="metric-label">Rain Chance</span>
              <span className="metric-value">{cw.precip_prob}%</span>
            </div>
            <div className="metric-box glass-panel">
              <span className="metric-label">UV Index</span>
              <span className="metric-value">{cw.uv} <small style={{ opacity: 0.7, fontWeight: 400 }}>({getUvLabel(cw.uv)})</small></span>
            </div>
            <div className="metric-box glass-panel">
              <span className="metric-label">AQI</span>
              <span className="metric-value">{cw.aqi}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeDashboard;
