import React, { useState, useEffect } from 'react';
import './CommutePlanner.css';
import axios from 'axios';

/** Convert a 24h integer (0-23) to "12 AM", "8 AM", "5 PM", etc. */
const formatHour = (h) => {
  if (h === 0) return '12 AM';
  if (h < 12)  return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
};

const getTimeOfDay = (hourStr) => {
  const h = parseInt(hourStr, 10);
  if (h >= 5 && h < 12) return 'Morning';
  if (h >= 12 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 21) return 'Evening';
  return 'Night';
};

const generateActionPlan = (details) => {
  const actions = [];
  if (details.temp >= 35) {
    actions.push({ icon: "🚰", text: "Drink at least 500ml of water before heading out." });
    actions.push({ icon: "🧢", text: "Wear a cap or wide-brimmed hat to protect your head." });
  } else if (details.temp >= 28) {
    actions.push({ icon: "💧", text: "Carry a water bottle to stay hydrated." });
  }
  if (details.humidity < 45) {
    actions.push({ icon: "🧴", text: "Apply a rich moisturizer to prevent skin dehydration." });
  } else if (details.humidity > 70) {
    actions.push({ icon: "👕", text: "Wear breathable cotton clothing to avoid sweat buildup." });
  }
  if (details.uv >= 6) {
    actions.push({ icon: "☀️", text: "Apply broad-spectrum SPF 50+ sunscreen." });
    actions.push({ icon: "🛡️", text: "Use UV-protectant hair serum or a hat to protect your hair." });
  } else if (details.uv >= 2) {
    actions.push({ icon: "🧴", text: "Apply SPF 30+ sunscreen to exposed skin." });
  }
  if (details.aqi >= 80) {
    actions.push({ icon: "😷", text: "Wear an N95 mask to filter out severe pollutants." });
  } else if (details.aqi >= 60) {
    actions.push({ icon: "😷", text: "Consider wearing a mask if you have sensitive lungs." });
  }
  if (details.precip_prob >= 40 || details.is_raining_now) {
    actions.push({ icon: "☂️", text: "Carry an umbrella or raincoat." });
  }
  if (actions.length === 0) {
    actions.push({ icon: "✨", text: "Conditions are pleasant! Just follow your regular routine." });
  }
  return actions;
};

/** Mini SVG sparkline for rain intensity */
const RainSparkline = ({ timeline }) => {
  if (!timeline || timeline.length === 0) return null;
  const w = 280, h = 60;
  const maxVal = Math.max(...timeline.map(t => t.rainIntensity), 0.5);
  const pts = timeline.map((t, i) => {
    const x = (i / (timeline.length - 1)) * w;
    const y = h - (t.rainIntensity / maxVal) * (h - 8);
    return `${x},${y}`;
  }).join(' ');
  const filled = timeline.map((t, i) => {
    const x = (i / (timeline.length - 1)) * w;
    const y = h - (t.rainIntensity / maxVal) * (h - 8);
    return `${x},${y}`;
  });
  filled.unshift(`0,${h}`);
  filled.push(`${w},${h}`);
  const fillPts = filled.join(' ');

  return (
    <div className="cp-sparkline">
      <div className="cp-sparkline-header">
        <span className="cp-sparkline-title">🌧️ Rain — Next 60 Min</span>
        <span className="cp-sparkline-val">{timeline[0]?.rainIntensity?.toFixed(1)} mm/hr now</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="cp-sparkline-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#29b6f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#29b6f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={fillPts} fill="url(#rainGrad)" />
        <polyline points={pts} fill="none" stroke="#29b6f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="cp-sparkline-labels">
        <span>Now</span><span>30 min</span><span>60 min</span>
      </div>
    </div>
  );
};

const hourOptions = Array.from({ length: 24 }, (_, i) => i);

function CommutePlanner({
  selectedCity,
  planSearchMode,
  setPlanSearchMode,
  cityQuery,
  setCityQuery,
  searching,
  searchCity,
  cityResults,
  setCityResults,
  pickCity
}) {
  const [outTime, setOutTime] = useState(String(Math.min(23, new Date().getHours() + 1)).padStart(2, '0'));
  const [travelDay, setTravelDay] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [weatherDialog, setWeatherDialog] = useState(null);

  useEffect(() => {
    if (selectedCity) {
      setData(null);
      setError(null);
    }
  }, [selectedCity]);

  const fetchAdvice = async (e) => {
    e.preventDefault();
    if (!selectedCity) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://localhost:8000/plan-trip', {
        params: {
          lat: selectedCity.latitude,
          lon: selectedCity.longitude,
          city_name: `${selectedCity.name}, ${selectedCity.country}`,
          travel_time: parseInt(outTime),
          travel_day: travelDay,
        }
      });
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setData(response.data);
      }
    } catch (err) {
      setError("Failed to connect to the S.A.F.E Backend. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityClass = (text) => {
    if (!text) return '';
    const l = text.toLowerCase();
    if (l.includes("danger") || l.includes("stroke") || l.includes("dehydration")) return 'danger';
    if (l.includes("caution") || l.includes("warm") || l.includes("sweaty") || l.includes("exhaustion")) return 'caution';
    return '';
  };

  const getPillBadgeClass = (level) => {
    if (level === 'HIGH') return 'high';
    if (level === 'MEDIUM') return 'medium';
    return 'low';
  };

  return (
    <div className="commute-page">
      {/* Page Header */}
      <div className="commute-page-header">
        <div>
          <div className="commute-page-title">🚗 Commute Advisor</div>
          <div className="commute-page-subtitle">Find the safest, most comfortable time to travel</div>
        </div>
      </div>

      {/* City Search */}
      {(!selectedCity || planSearchMode) && (
        <div className="cp-glass cp-search-card animate-fade-in">
          <div className="cp-search-label">📍 Set Your Location</div>
          <form onSubmit={searchCity}>
            <div className="cp-search-row">
              <input
                type="text"
                className="cp-search-input"
                placeholder="e.g. Hyderabad, London, New York..."
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                required
              />
              <button type="submit" className="cp-btn-primary" disabled={searching}>
                {searching ? 'Searching...' : 'Search'}
              </button>
              {selectedCity && planSearchMode && (
                <button type="button" className="cp-btn-ghost" onClick={() => { setPlanSearchMode(false); setCityResults([]); }}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          {cityResults.length > 1 && (
            <div className="cp-city-results">
              {cityResults.map((c, idx) => (
                <button key={idx} className="cp-city-option" onClick={() => pickCity(c)}>
                  <span className="cp-city-option-name">{c.name}</span>
                  <span className="cp-city-option-sub">{c.admin1 ? `${c.admin1}, ` : ''}{c.country}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active City Bar + Planner Form */}
      {selectedCity && !planSearchMode && (
        <>
          {/* City Bar */}
          <div className="cp-glass cp-city-bar animate-fade-in">
            <div className="cp-city-bar-left">
              <span className="cp-city-pin">📍</span>
              <div>
                <div className="cp-city-name">{selectedCity.name}</div>
                <div className="cp-city-country">
                  {selectedCity.admin1 ? `${selectedCity.admin1}, ` : ''}{selectedCity.country}
                </div>
              </div>
            </div>
            <button className="cp-btn-ghost" onClick={() => setPlanSearchMode(true)}>
              Change Location
            </button>
          </div>

          {/* Planner Form */}
          <div className="cp-glass cp-form-card animate-fade-in">
            <form onSubmit={fetchAdvice} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="cp-form-row">
                <div>
                  <label className="cp-field-label">Travel Day</label>
                  <div className="cp-day-toggle">
                    <button type="button" className={`cp-day-btn ${travelDay === 0 ? 'active' : ''}`} onClick={() => setTravelDay(0)}>
                      Today
                    </button>
                    <button type="button" className={`cp-day-btn ${travelDay === 1 ? 'active' : ''}`} onClick={() => setTravelDay(1)}>
                      Tomorrow
                    </button>
                  </div>
                </div>
                <div>
                  <label className="cp-field-label">Departure Time</label>
                  <select
                    className="cp-time-select"
                    value={outTime}
                    onChange={(e) => setOutTime(e.target.value)}
                    required
                  >
                    {(travelDay === 0 ? hourOptions.filter(h => h >= new Date().getHours()) : hourOptions).map(h => (
                      <option key={h} value={String(h).padStart(2, '0')}>{formatHour(h)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="cp-btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', padding: '0.9rem 2.5rem' }}>
                {loading ? '⏳ Analysing...' : '⚡ Plan My Trip'}
              </button>
            </form>
          </div>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="cp-error animate-fade-in">{error}</div>
      )}

      {/* Results */}
      {data && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Severe Alerts */}
          {data.alerts?.length > 0 && data.alerts.map((alert, i) => (
            <div key={i} className="cp-alert cp-alert--severe animate-fade-in">
              <span className="cp-alert-icon">🚨</span>
              <div className="cp-alert-body">
                <div className="cp-alert-title">{alert.title}</div>
                {alert.description && <div className="cp-alert-desc">{alert.description}</div>}
              </div>
              <span className="cp-severity-badge">{alert.severity}</span>
            </div>
          ))}

          {/* Rain Now Banner */}
          {data.nowcast?.is_raining_now && (
            <div className="cp-alert cp-alert--rain animate-fade-in">
              <span className="cp-alert-icon">🌧️</span>
              <div className="cp-alert-body">
                <div className="cp-alert-title">It's raining right now!</div>
                <div className="cp-alert-desc">
                  Current: {data.nowcast.current_intensity?.toFixed(1)} mm/hr · Peak in 30 min: {data.nowcast.peak_intensity_30min?.toFixed(1)} mm/hr
                </div>
              </div>
            </div>
          )}

          {/* Main Result Card */}
          <div className={`cp-glass cp-result-card ${getSeverityClass(data.advice)} animate-fade-in`}>
            <div className="cp-result-header">
              <div className="cp-result-title">
                {getTimeOfDay(outTime)} Travel · {formatHour(parseInt(outTime))}
              </div>
            </div>

            <p className="cp-result-advice">{data.advice}</p>

            {/* Timeline */}
            <div className="cp-timeline">
              {data.comparison.map((opt, idx) => (
                <div className="cp-pill" key={idx}>
                  <div className="cp-pill-time">{formatHour(opt.hour)}</div>
                  <div className="cp-pill-temp">{opt.temp}°</div>
                  <div className={`cp-pill-badge ${getPillBadgeClass(opt.level)}`}>{opt.level}</div>
                </div>
              ))}
              {data.comparison.length > 0 && (
                <button
                  className="cp-pill-btn"
                  onClick={() => {
                    const target = data.comparison.find(o => String(o.hour).padStart(2, '0') === outTime) || data.comparison[1];
                    setWeatherDialog({ details: target, title: 'Travel' });
                  }}
                >
                  <span className="cp-pill-btn-icon">☁️</span>
                  <span className="cp-pill-btn-label">Full Weather</span>
                </button>
              )}
            </div>

            {/* Rain Sparkline */}
            {data.nowcast?.available && data.nowcast.timeline.length > 0 && (
              <RainSparkline timeline={data.nowcast.timeline} />
            )}

            {/* Action Plan */}
            {(() => {
              const targetOpt = data.comparison.find(o => String(o.hour).padStart(2, '0') === String(outTime).padStart(2, '0')) || data.comparison[1] || data.comparison[0];
              const actions = targetOpt ? generateActionPlan(targetOpt) : [];
              return actions.length > 0 ? (
                <div className="cp-action-section">
                  <div className="cp-action-title">⚡ Quick Action Plan</div>
                  <div className="cp-action-grid">
                    {actions.map((a, i) => (
                      <div key={i} className="cp-action-item">
                        <span className="cp-action-icon">{a.icon}</span>
                        <span className="cp-action-text">{a.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* Weather Detail Dialog */}
      {weatherDialog && (
        <div className="cp-dialog-overlay animate-fade-in" onClick={() => setWeatherDialog(null)}>
          <div className="cp-dialog" onClick={e => e.stopPropagation()}>
            <button className="cp-dialog-close" onClick={() => setWeatherDialog(null)}>&times;</button>
            <div className="cp-dialog-title">
              ☁️ {weatherDialog.title} Weather Conditions
            </div>
            <div className="cp-dialog-grid">
              <div className="cp-dialog-item">
                <div className="cp-dialog-item-label">Temperature</div>
                <div className="cp-dialog-item-val">{weatherDialog.details.temp}°C</div>
              </div>
              <div className="cp-dialog-item">
                <div className="cp-dialog-item-label">Humidity</div>
                <div className="cp-dialog-item-val">{weatherDialog.details.humidity}%</div>
              </div>
              <div className="cp-dialog-item">
                <div className="cp-dialog-item-label">UV Index</div>
                <div className="cp-dialog-item-val">{weatherDialog.details.uv}</div>
              </div>
              <div className="cp-dialog-item">
                <div className="cp-dialog-item-label">AQI</div>
                <div className="cp-dialog-item-val">{weatherDialog.details.aqi}</div>
              </div>
              <div className="cp-dialog-item">
                <div className="cp-dialog-item-label">Wind Speed</div>
                <div className="cp-dialog-item-val">{weatherDialog.details.wind} km/h</div>
              </div>
              <div className="cp-dialog-item">
                <div className="cp-dialog-item-label">Rain Chance</div>
                <div className="cp-dialog-item-val">{weatherDialog.details.precip_prob}%</div>
              </div>
            </div>
            {weatherDialog.details.details && (
              <div className="cp-dialog-summary">
                <strong>Summary:</strong> {weatherDialog.details.details}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CommutePlanner;
