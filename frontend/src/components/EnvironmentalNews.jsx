import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import './EnvironmentalNews.css';

// ── Risk meta ────────────────────────────────────────────────
const RISK_META = {
  FLOOD:       { icon: '🌊', label: 'Flood',       stamp: 'URGENT' },
  HEAT:        { icon: '☀️',  label: 'Heat',        stamp: 'ADVISORY' },
  HEALTH:      { icon: '⚕️', label: 'Health',      stamp: 'BULLETIN' },
  AIR_QUALITY: { icon: '💨', label: 'Air Quality', stamp: 'NOTICE' },
  STORM:       { icon: '⛈️',  label: 'Storm',       stamp: 'ALERT' },
  WINTER:      { icon: '❄️',  label: 'Cold',        stamp: 'WARNING' },
  GENERAL:     { icon: '📰', label: 'General',     stamp: 'REPORT' },
};

const SEV_CLASS = { HIGH: 'sev-high', MEDIUM: 'sev-medium', LOW: 'sev-low' };
const SEV_STAMP = { HIGH: '⚠ CRITICAL', MEDIUM: '◈ ADVISORY', LOW: '○ NOTICE' };

function timeAgo(dateStr) {
  if (!dateStr) return '';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return ''; }
}

// ── Skeleton cards ───────────────────────────────────────────
function SkeletonCard({ size = 'normal' }) {
  return (
    <div className={`vn-card vn-card--skeleton vn-card--${size}`}>
      <div className="sk-rule" />
      <div className="sk-bar sk-bar--tag" />
      <div className="sk-bar sk-bar--title" />
      {size !== 'small' && <div className="sk-bar sk-bar--body" />}
      <div className="sk-rule sk-rule--bottom" />
    </div>
  );
}

// ── Alert Card ───────────────────────────────────────────────
function AlertCard({ alert, index, size = 'normal' }) {
  const [expanded, setExpanded] = useState(false);
  const meta = RISK_META[alert.risk_type] || RISK_META.GENERAL;

  return (
    <article
      className={`vn-card vn-card--${size} vn-card--${(alert.severity || 'low').toLowerCase()} animate-ink`}
      style={{ animationDelay: `${Math.min(index * 0.04, 1.5)}s` }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Severity stamp */}
      <div className={`vn-stamp ${SEV_CLASS[alert.severity] || 'sev-low'}`}>
        {SEV_STAMP[alert.severity] || '○ NOTICE'}
      </div>

      {/* Ruling lines top */}
      <div className="vn-rules-top">
        <div className="vn-rule" /><div className="vn-rule vn-rule--thin" />
      </div>

      {/* Category tag */}
      <div className="vn-tag-row">
        <span className="vn-tag-icon">{meta.icon}</span>
        <span className="vn-tag-label">{meta.label}</span>
        {alert.source && <span className="vn-tag-source">{alert.source}</span>}
      </div>

      {/* Headline */}
      <h3 className="vn-headline">{alert.title}</h3>

      {/* Deck (subheading) */}
      {size !== 'small' && (
        <p className="vn-deck">{alert.short_summary}</p>
      )}

      {/* Ruling line */}
      <div className="vn-rule vn-rule--body" />

      {/* Dateline */}
      <div className="vn-dateline">
        {timeAgo(alert.published_at) && (
          <span className="vn-dateline-time">⏱ {timeAgo(alert.published_at)}</span>
        )}
        <span className="vn-dateline-expand">{expanded ? '▲ less' : '▼ details'}</span>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="vn-body animate-ink-expand">
          <div className="vn-rule" />
          <div className="vn-body-cols">
            <div className="vn-body-col">
              <span className="vn-col-head">🚗 Commute</span>
              <p className="vn-col-text">{alert.commute_impact}</p>
            </div>
            <div className="vn-body-col-divider" />
            <div className="vn-body-col">
              <span className="vn-col-head">🧴 Skincare</span>
              <p className="vn-col-text">{alert.skincare_impact}</p>
            </div>
          </div>
          <div className="vn-rule" />
          <div className="vn-action-box">
            <span className="vn-action-head">⚡ RECOMMENDED ACTION</span>
            <p className="vn-action-text">{alert.action_plan}</p>
          </div>
        </div>
      )}
    </article>
  );
}

// ── Filter bar ───────────────────────────────────────────────
const FILTERS = ['ALL', 'HIGH', 'MEDIUM', 'LOW', 'FLOOD', 'HEAT', 'AIR_QUALITY', 'STORM', 'HEALTH'];

function FilterBar({ active, onChange, counts }) {
  return (
    <div className="vn-filter-bar">
      {FILTERS.map(f => (
        <button
          key={f}
          className={`vn-filter-btn ${active === f ? 'active' : ''}`}
          onClick={() => onChange(f)}
        >
          {f === 'ALL' ? `ALL (${counts.total || 0})` : f}
          {counts[f] ? <span className="vn-filter-count">{counts[f]}</span> : null}
        </button>
      ))}
    </div>
  );
}

function EnvironmentalNews({ selectedCity }) {
  const [alerts,    setAlerts]    = useState([]);
  const [sitrep,    setSitrep]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [filter,    setFilter]    = useState('ALL');
  const [layout,    setLayout]    = useState('broadsheet'); // broadsheet | tabloid
  const [lastCity,  setLastCity]  = useState(null);
  const [edition,   setEdition]   = useState('');
  const fetchedRef = useRef(false);

  const fetchAlerts = useCallback(async (city) => {
    if (!city) return;
    setLoading(true);
    setError(null);
    fetchedRef.current = true;
    try {
      const resp = await axios.get('http://localhost:8000/environmental-news', {
        params: { lat: city.latitude, lon: city.longitude, city: city.name },
        timeout: 30000,
      });
      // Handle the new nested response { sitrep, alerts }
      setAlerts(resp.data.alerts || []);
      setSitrep(resp.data.sitrep || null);
      // Vintage edition dateline
      const now = new Date();
      setEdition(now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase());
    } catch (e) {
      setError('Dispatches could not be retrieved. The intelligence wire may be down.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedCity) return;
    const key = `${selectedCity.latitude},${selectedCity.longitude}`;
    if (key === lastCity) return;
    setLastCity(key);
    fetchAlerts(selectedCity);
  }, [selectedCity, fetchAlerts, lastCity]);

  // Filter logic
  const filtered = alerts.filter(a => {
    if (filter === 'ALL') return true;
    if (['HIGH','MEDIUM','LOW'].includes(filter)) return a.severity === filter;
    return a.risk_type === filter;
  });

  // Count badges
  const counts = { total: alerts.length };
  alerts.forEach(a => {
    counts[a.severity] = (counts[a.severity] || 0) + 1;
    counts[a.risk_type] = (counts[a.risk_type] || 0) + 1;
  });

  // Layout: broadsheet = masonry 3-col, tabloid = 2-col dense
  const isTableoid = layout === 'tabloid';

  // Split cards for broadsheet layout (featured + grid)
  const featured = filtered.slice(0, 3);
  const rest      = filtered.slice(3);

  return (
    <div className="vn-root">
      {/* Masthead */}
      <header className="vn-masthead">
        <div className="vn-masthead-ornament">— ✦ —</div>
        <h1 className="vn-masthead-title">THE ENVIRONMENTAL DISPATCH</h1>
        <p className="vn-masthead-tagline">
          "All the Environmental Intelligence Fit to Act Upon"
        </p>
        <div className="vn-masthead-ornament">— ✦ —</div>
        <div className="vn-masthead-meta">
          <span>{edition || 'ENVIRONMENTAL INTELLIGENCE BUREAU'}</span>
          <span className="vn-masthead-sep">·</span>
          <span>{selectedCity ? `${selectedCity.name.toUpperCase()}, ${selectedCity.country?.toUpperCase() || ''}` : 'LOCATION UNKNOWN'}</span>
          <span className="vn-masthead-sep">·</span>
          <span className="vn-masthead-live">
            <span className="vn-live-dot" /> LIVE EDITION
          </span>
        </div>
        <div className="vn-masthead-rule-group">
          <div className="vn-masthead-rule" />
          <div className="vn-masthead-rule vn-masthead-rule--thick" />
          <div className="vn-masthead-rule" />
        </div>
      </header>

      {/* Controls row */}
      <div className="vn-controls-row">
        <div className="vn-controls-left">
          {!loading && alerts.length > 0 && (
            <span className="vn-dispatch-count">{filtered.length} dispatches</span>
          )}
        </div>
        <div className="vn-controls-right">
          <button className={`vn-layout-btn ${layout === 'broadsheet' ? 'active' : ''}`} onClick={() => setLayout('broadsheet')} title="Broadsheet">▦</button>
          <button className={`vn-layout-btn ${layout === 'tabloid' ? 'active' : ''}`} onClick={() => setLayout('tabloid')} title="Tabloid">▤</button>
          {selectedCity && (
            <button className="vn-refresh-btn" onClick={() => fetchAlerts(selectedCity)}>↺ Refresh</button>
          )}
        </div>
      </div>

      {/* Editor's Situation Report (SitRep) */}
      {!loading && sitrep && (
        <div className="vn-sitrep-box animate-ink">
          <div className="vn-sitrep-head">
            <span className="vn-sitrep-title">EDITOR'S SITUATION REPORT</span>
            <span className="vn-sitrep-author">BY THE INTELLIGENCE DESK</span>
          </div>
          <div className="vn-sitrep-body">
            <span className="vn-sitrep-dropcap">{sitrep.charAt(0)}</span>
            {sitrep.substring(1)}
          </div>
        </div>
      )}

      {/* Filter bar */}
      {alerts.length > 0 && (
        <FilterBar active={filter} onChange={setFilter} counts={counts} />
      )}

      {/* States */}
      {!selectedCity && (
        <div className="vn-empty-state">
          <div className="vn-empty-ornament">✦</div>
          <p className="vn-empty-head">NO LOCATION ON FILE</p>
          <p className="vn-empty-sub">Select a city to receive local dispatches from our intelligence network.</p>
        </div>
      )}

      {selectedCity && loading && (
        <div>
          {/* Featured skeleton row */}
          <div className="vn-featured-row">
            {[0,1,2].map(i => <SkeletonCard key={i} size={i === 0 ? 'large' : 'normal'} />)}
          </div>
          <div className="vn-grid vn-grid--broadsheet">
            {Array.from({length: 9}).map((_, i) => <SkeletonCard key={i} size="small" />)}
          </div>
        </div>
      )}

      {selectedCity && !loading && error && (
        <div className="vn-error-box">
          <span className="vn-error-rule">— WIRE DISRUPTION —</span>
          <p>{error}</p>
        </div>
      )}

      {selectedCity && !loading && !error && filtered.length === 0 && (
        <div className="vn-empty-state">
          <div className="vn-empty-ornament">✦</div>
          <p className="vn-empty-head">NO DISPATCHES FOR THIS FILTER</p>
          <p className="vn-empty-sub">Try "ALL" to view all environmental intelligence reports.</p>
        </div>
      )}

      {/* Content */}
      {selectedCity && !loading && !error && filtered.length > 0 && (
        <>
          {/* Column header */}
          <div className="vn-section-header">
            <div className="vn-section-rule" />
            <span className="vn-section-label">PRINCIPAL DISPATCHES</span>
            <div className="vn-section-rule" />
          </div>

          {/* Featured row — top 3 cards large */}
          {!isTableoid && (
            <div className="vn-featured-row">
              {featured.map((a, i) => (
                <AlertCard key={i} alert={a} index={i} size={i === 0 ? 'large' : 'normal'} />
              ))}
            </div>
          )}

          {/* Remaining grid */}
          {rest.length > 0 && (
            <>
              <div className="vn-section-header vn-section-header--sub">
                <div className="vn-section-rule" />
                <span className="vn-section-label">FURTHER INTELLIGENCE</span>
                <div className="vn-section-rule" />
              </div>
              <div className={`vn-grid ${isTableoid ? 'vn-grid--tabloid' : 'vn-grid--broadsheet'}`}>
                {(isTableoid ? filtered : rest).map((a, i) => (
                  <AlertCard key={i + 3} alert={a} index={i + 3} size="small" />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Footer */}
      <footer className="vn-footer">
        <div className="vn-footer-rules">
          <div className="vn-rule" /><div className="vn-rule vn-rule--thick" /><div className="vn-rule" />
        </div>
        <p className="vn-footer-text">
          S.A.F.E INTELLIGENCE ENGINE · AI-PROCESSED · {alerts.length} DISPATCHES IN THIS EDITION
        </p>
        <p className="vn-footer-sub">Intelligence sourced from NewsData.io & GNews · Enriched by Gemini AI</p>
      </footer>
    </div>
  );
}

export default EnvironmentalNews;
