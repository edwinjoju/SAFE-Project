import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

/** Convert a 24h integer (0-23) to "12 AM", "8 AM", "5 PM", etc. */
const formatHour = (h) => {
  if (h === 0) return '12 AM'
  if (h < 12)  return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

const getTimeOfDay = (hourStr) => {
  const h = parseInt(hourStr, 10);
  if (h >= 5 && h < 12) return 'Morning';
  if (h >= 12 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 21) return 'Evening';
  return 'Night';
};

const generateActionPlan = (details) => {
  const actions = [];
  
  // Heat / Dehydration
  if (details.temp >= 35) {
    actions.push({ icon: "🚰", text: "Drink at least 500ml of water before heading out." });
    actions.push({ icon: "🧢", text: "Wear a cap or wide-brimmed hat to protect your head." });
  } else if (details.temp >= 28) {
    actions.push({ icon: "💧", text: "Carry a water bottle to stay hydrated." });
  }

  // Humidity / Skin
  if (details.humidity < 45) {
    actions.push({ icon: "🧴", text: "Apply a rich moisturizer to prevent skin dehydration." });
  } else if (details.humidity > 70) {
    actions.push({ icon: "👕", text: "Wear breathable cotton clothing to avoid sweat buildup." });
  }

  // UV Protection
  if (details.uv >= 6) {
    actions.push({ icon: "☀️", text: "Apply broad-spectrum SPF 50+ sunscreen." });
    actions.push({ icon: "🛡️", text: "Use UV-protectant hair serum or a hat to protect your hair." });
  } else if (details.uv >= 2) {
    actions.push({ icon: "🧴", text: "Apply SPF 30+ sunscreen to exposed skin." });
  }

  // Air Quality
  if (details.aqi >= 80) {
    actions.push({ icon: "😷", text: "Wear an N95 mask to filter out severe pollutants." });
  } else if (details.aqi >= 60) {
    actions.push({ icon: "😷", text: "Consider wearing a mask if you have sensitive lungs." });
  }
  
  // Rain
  if (details.precip_prob >= 40) {
    actions.push({ icon: "☂️", text: "Carry an umbrella or raincoat." });
  }

  if (actions.length === 0) {
    actions.push({ icon: "✨", text: "Conditions are pleasant! Just follow your regular routine." });
  }

  return actions;
};

const hourOptions = Array.from({ length: 24 }, (_, i) => i)

const AD_CATEGORIES = [
  { id: 'sunscreen', name: 'Sunscreen', icon: '☀️' },
  { id: 'moisturizer', name: 'Moisturizer', icon: '🧴' },
  { id: 'facewash', name: 'Face Wash', icon: '🫧' },
  { id: 'serums', name: 'Hair Serums', icon: '✨' },
];

const AD_PRODUCTS = {
  sunscreen: [
    {
      id: 11,
      name: "Multi-Vitamin SPF 50 Sunscreen",
      brand: "Minimalist",
      url: "https://beminimalist.co/products/multi-vitamin-spf-50",
      image: "http://beminimalist.co/cdn/shop/files/SPF50New.jpg?v=1756795782",
      whatItIs: "A broad-spectrum SPF 50 PA++++ sunscreen.",
      whatItHas: "Loaded with Vitamins A, B3, B5, E and F.",
      whyUseIt: "Provides maximum protection against UV rays while repairing skin."
    },
    {
      id: 12,
      name: "Gel Sunscreen SPF 55+ PA+++",
      brand: "Deconstruct",
      url: "https://thedeconstruct.in/products/gel-sunscreen-for-oily-skin",
      image: "https://thedeconstruct.in/cdn/shop/files/1_d2fdd635-c8c3-4d0f-8706-e7e29eb0e060_400x.jpg?v=1720610996",
      whatItIs: "A lightweight, oil-free gel sunscreen.",
      whatItHas: "New-age UV filters, Niacinamide.",
      whyUseIt: "No white cast, mattifying finish perfect for oily/combination skin."
    },
    {
      id: 13,
      name: "Vitamin C + E Super Bright Sunscreen",
      brand: "Dot & Key",
      url: "https://www.dotandkey.com/products/dot-key-vitamin-c-e-spf-50-pa-face-sunscreen-for-glowing-skin-uv-protection-for-dull-skin",
      image: "https://www.dotandkey.com/cdn/shop/files/1_8d8b948c-9b76-47b2-bd7d-08b6aeb6325f_1800x1800.webp",
      whatItIs: "A glow-boosting liquid sunscreen SPF 50 PA++++.",
      whatItHas: "Vitamin C, Vitamin E, Sicilian Blood Orange.",
      whyUseIt: "Provides broad spectrum UV protection while fading dullness and boosting radiance."
    }
  ],
  moisturizer: [
    {
      id: 21,
      name: "Marula Oil 5% Moisturizer",
      brand: "Minimalist",
      url: "https://www.amazon.in/Minimalist-Moisturizer-Hyaluronic-Nourishment-Hydration/dp/B09Q3MJZQB",
      image: "https://m.media-amazon.com/images/I/51h1eNlD+HL._SL1500_.jpg",
      whatItIs: "A deep nourishment daily face moisturizer.",
      whatItHas: "5% Marula Oil, Hyaluronic Acid, Vitamin E & F.",
      whyUseIt: "Provides multi-level hydration and intense nourishment to dry or damaged skin."
    },
    {
      id: 22,
      name: "Korean Rice Water Hydra Glow Gel Moisturizer",
      brand: "Pilgrim",
      url: "https://www.nykaa.com/pilgrim-korean-rice-water-hydra-glow-light-gel-moisturizer/p/20648699",
      image: "https://images-static.nykaa.com/media/catalog/product/tr:w-200,h-200,cm-pad_resize/4/1/41ec627PILGR00000216_1.jpg",
      whatItIs: "A lightweight, gel-based glow moisturizer.",
      whatItHas: "Rice Water, Niacinamide, Aloe Vera.",
      whyUseIt: "Hydrates the skin instantly without a greasy feel, giving a glass-skin glow."
    }
  ],
  facewash: [
    {
      id: 31,
      name: "Kind to Skin Refreshing Facial Wash",
      brand: "Simple",
      url: "https://www.simpleskincare.in/products/simple-kind-to-skin-refreshing-facial-wash-150ml",
      image: "https://m.media-amazon.com/images/I/51oZ5l1e7YL._SX679_.jpg",
      whatItIs: "A 100% soap-free, gentle daily cleanser.",
      whatItHas: "Triple Purified Water, Pro-Vitamin B5, and Vitamin E.",
      whyUseIt: "Thoroughly washes away makeup, dirt, and impurities leaving skin clean and revived."
    }
  ],
  serums: [
    {
      id: 41,
      name: "Hair Growth Serum Concentrate",
      brand: "WishCare",
      url: "https://www.purplle.com/product/wishcare-hair-growth-serum-concentrate-resdensyl-anagain-caffeine-biotin-keratin-and-rice-water",
      image: "https://m.media-amazon.com/images/I/51w9hE7b0CL._SX679_.jpg",
      whatItIs: "A powerful hair growth serum concentrate.",
      whatItHas: "Redensyl, Anagain, Caffeine, Biotin.",
      whyUseIt: "Promotes hair growth, reduces hair fall, and increases hair density."
    }
  ]
};

function App() {
  const [appMode, setAppMode] = useState('home') // 'home' | 'plan'
  const [currentWeather, setCurrentWeather] = useState(null)
  
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState([])
  const [selectedCity, setSelectedCity] = useState(null)
  const [searching, setSearching] = useState(false)

  const [outTime, setOutTime] = useState('08')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [skincareDialog, setSkincareDialog] = useState(null)
  const [weatherDialog, setWeatherDialog] = useState(null)
  const [locating, setLocating] = useState(true)
  const [apiStatus, setApiStatus] = useState(null)
  const [adsDialog, setAdsDialog] = useState(false)
  const [selectedAdCategory, setSelectedAdCategory] = useState(null)

  // Fetch API status periodically
  useEffect(() => {
    const fetchApiStatus = async () => {
      try {
        const resp = await axios.get('http://localhost:8000/api-status')
        setApiStatus(resp.data)
      } catch (e) {}
    }
    fetchApiStatus()
    const interval = setInterval(fetchApiStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchCurrentWeatherForCity = async (lat, lon, name, country) => {
    setLocating(true);
    try {
      const resp = await axios.get('http://localhost:8000/current-weather', { params: { lat, lon } });
      setCurrentWeather(resp.data);
      setSelectedCity({ latitude: lat, longitude: lon, name, country });
      setCityQuery('');
    } catch (e) {
      console.error(e);
      setError("Failed to load weather for that location.");
    } finally {
      setLocating(false);
    }
  };

  // STEP 0: Geolocation on Mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchCurrentWeatherForCity(position.coords.latitude, position.coords.longitude, "Current Location", "");
        },
        (err) => {
          console.log("Geolocation denied or failed", err);
          fetchCurrentWeatherForCity(28.6139, 77.2090, "New Delhi", "India");
        },
        { timeout: 5000 } // 5 second timeout before falling back
      );
    } else {
      fetchCurrentWeatherForCity(28.6139, 77.2090, "New Delhi", "India");
    }
  }, []);

  // STEP 1: Search for city matches
  const searchCity = async (e) => {
    e.preventDefault()
    if (!cityQuery.trim()) return

    setSearching(true)
    setCityResults([])
    setSelectedCity(null)
    setData(null)
    setError(null)

    try {
      const resp = await axios.get('http://localhost:8000/search-city', {
        params: { name: cityQuery.trim() }
      })

      const results = resp.data.results
      if (results.length === 0) {
        setError("No cities found matching that name. Try a different spelling?")
      } else if (results.length === 1) {
        // Only one match — auto-select it
        setSelectedCity(results[0])
      } else {
        // Multiple matches — let the user choose
        setCityResults(results)
      }
    } catch (err) {
      setError("Failed to connect to the S.A.F.E Backend. Is it running?")
    } finally {
      setSearching(false)
    }
  }

  const pickCity = (city) => {
    setCityResults([])
    if (appMode === 'home') {
      fetchCurrentWeatherForCity(city.latitude, city.longitude, city.name, city.country);
    } else {
      setSelectedCity(city)
    }
  }

  const clearCity = () => {
    setSelectedCity(null)
    setCurrentWeather(null)
    setCityResults([])
    setCityQuery('')
    setData(null)
    setError(null)
  }

  // STEP 2: Plan commute using selected city's coordinates
  const fetchAdvice = async (e) => {
    e.preventDefault()
    if (!selectedCity) return

    setLoading(true)
    setError(null)
    
    try {
      const response = await axios.get('http://localhost:8000/plan-trip', {
        params: {
          lat: selectedCity.latitude,
          lon: selectedCity.longitude,
          city_name: `${selectedCity.name}, ${selectedCity.country}`,
          travel_time: parseInt(outTime)
        }
      })
      
      if (response.data.error) {
        setError(response.data.error)
      } else {
        setData(response.data)
      }
    } catch (err) {
      setError("Failed to connect to the S.A.F.E Backend. Is it running?")
    } finally {
      setLoading(false)
    }
  }

  // Helper to determine the glow color of the card based on the advice text
  const getSeverityClass = (text) => {
    if (!text) return "safe";
    const lowerText = text.toLowerCase();
    if (lowerText.includes("danger") || lowerText.includes("stroke") || lowerText.includes("dehydration")) return "danger";
    if (lowerText.includes("caution") || lowerText.includes("warm") || lowerText.includes("sweaty") || lowerText.includes("exhaustion")) return "caution";
    return "safe";
  }

  const getPillStatusClass = (level) => {
    if (level === "HIGH") return "status-high";
    if (level === "MEDIUM") return "status-medium";
    return "status-low";
  }

  return (
    <div className="layout-wrapper">
      {/* PERSISTENT LEFT SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>S.A.F.E.</h1>
          <p>Smart Atmospheric Forecast Engine</p>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`sidebar-nav-item ${appMode === 'home' ? 'active' : ''}`}
            onClick={() => {
              setAppMode('home');
              if (!currentWeather) setLocating(true);
            }}
          >
            <span className="sidebar-icon">🏠</span> Today
          </button>
          
          <button 
            className={`sidebar-nav-item ${appMode === 'plan' ? 'active' : ''}`}
            onClick={() => setAppMode('plan')}
          >
            <span className="sidebar-icon">🚗</span> Commute Advisor
          </button>

          <button 
            className="sidebar-nav-item"
            onClick={() => setAdsDialog(true)}
          >
            <span className="sidebar-icon">🛍️</span> Shop Skincare
          </button>
        </nav>
      </aside>

      <div className="app-container">
        {locating && !currentWeather && (
          <div className="glass-card animate-fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
            <h2>Locating you...</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Allow location access to get started.</p>
          </div>
        )}

      {/* HOME MODE DASHBOARD */}
      {!locating && appMode === 'home' && currentWeather && (() => {
        // Pre-compute sunrise/sunset arc values
        const cw = currentWeather.current;
        const sunriseStr = cw.sunrise; // e.g. "2026-04-28T05:52"
        const sunsetStr = cw.sunset;
        let sunArcProgress = 0;
        let sunriseTime = '--:--';
        let sunsetTime = '--:--';
        let isDaytime = false;

        if (sunriseStr && sunsetStr) {
          const rise = new Date(sunriseStr);
          const set = new Date(sunsetStr);
          const now = new Date();
          sunriseTime = rise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          sunsetTime = set.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          isDaytime = now >= rise && now <= set;
          if (isDaytime) {
            sunArcProgress = (now - rise) / (set - rise);
          } else if (now > set) {
            sunArcProgress = 1;
          }
        }

        // SVG arc parameters
        const arcCx = 140, arcCy = 110, arcR = 90;
        // Arc goes from left (pi) to right (0), i.e. semicircle
        const startAngle = Math.PI;
        const endAngle = 0;
        const sunAngle = startAngle - sunArcProgress * (startAngle - endAngle);
        const sunX = arcCx + arcR * Math.cos(sunAngle);
        const sunY = arcCy - arcR * Math.sin(sunAngle);

        // UV label helper
        const getUvLabel = (uv) => {
          if (uv <= 2) return { text: `${uv} of 11`, color: '#4caf50' };
          if (uv <= 5) return { text: `${uv} of 11`, color: '#ffeb3b' };
          if (uv <= 7) return { text: `${uv} of 11`, color: '#ff9800' };
          if (uv <= 10) return { text: `${uv} of 11`, color: '#f44336' };
          return { text: `${uv} of 11`, color: '#9c27b0' };
        };
        const uvInfo = getUvLabel(cw.uv);

        // Visibility in km
        const visKm = cw.visibility ? (cw.visibility / 1000).toFixed(1) : '--';

        return (
        <div className="glass-card dashboard-card animate-fade-in" style={{ padding: '2.5rem' }}>
          
          {/* Top Hero Section */}
          <div className="hero-top-centered" style={{ position: 'relative' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {selectedCity?.name || "Your Location"}{selectedCity?.country ? `, ${selectedCity.country}` : ''}
              <button 
                onClick={clearCity} 
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1rem' }}
                title="Change Location"
              >
                ✏️
              </button>
            </h2>
            <p className="hero-time-centered">As of {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          <div className="hero-middle-centered">
            <div className="hero-icon-centered">{cw.condition_icon}</div>
            <div className="hero-temp-centered">{Math.round(cw.temp)}°</div>
          </div>

          <div className="hero-condition-centered">{cw.condition_text}</div>
          <div className="hero-high-low-centered">
            Feels like {Math.round(cw.feels_like)}° &nbsp;•&nbsp; Day {Math.round(cw.high)}° &nbsp;•&nbsp; Night {Math.round(cw.low)}°
          </div>

          {/* ── Sunrise / Sunset Arc ── */}
          <div className="sun-arc-section">
            <svg viewBox="0 0 280 140" className="sun-arc-svg">
              {/* Dashed horizon line */}
              <line x1="20" y1="112" x2="260" y2="112" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />
              
              {/* Background arc (grey track) */}
              <path
                d={`M ${arcCx - arcR} ${arcCy} A ${arcR} ${arcR} 0 0 1 ${arcCx + arcR} ${arcCy}`}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="2.5"
                strokeDasharray="4 3"
              />
              
              {/* Progress arc (orange) */}
              {sunArcProgress > 0 && (
                <path
                  d={`M ${arcCx - arcR} ${arcCy} A ${arcR} ${arcR} 0 0 1 ${sunX} ${sunY}`}
                  fill="none"
                  stroke="url(#sunGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              )}
              
              {/* Gradient definition */}
              <defs>
                <linearGradient id="sunGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ff9800" />
                  <stop offset="100%" stopColor="#ffeb3b" />
                </linearGradient>
                <radialGradient id="sunGlow">
                  <stop offset="0%" stopColor="rgba(255,193,7,0.5)" />
                  <stop offset="100%" stopColor="rgba(255,193,7,0)" />
                </radialGradient>
              </defs>

              {/* Sun circle + glow */}
              {isDaytime && (
                <>
                  <circle cx={sunX} cy={sunY} r="14" fill="url(#sunGlow)" />
                  <circle cx={sunX} cy={sunY} r="7" fill="#ffc107" />
                  {/* Rays */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
                    const rad = angle * Math.PI / 180;
                    return (
                      <line
                        key={angle}
                        x1={sunX + 10 * Math.cos(rad)}
                        y1={sunY + 10 * Math.sin(rad)}
                        x2={sunX + 14 * Math.cos(rad)}
                        y2={sunY + 14 * Math.sin(rad)}
                        stroke="#ffc107"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        opacity="0.7"
                      />
                    );
                  })}
                </>
              )}

              {/* Sunrise icon + label (left) */}
              <text x="30" y="132" fill="#ff9800" fontSize="11" fontFamily="Inter" fontWeight="600">☀↑</text>
              <text x="25" y="107" fill="rgba(255,255,255,0.6)" fontSize="9" fontFamily="Inter">{sunriseTime}</text>

              {/* Sunset icon + label (right) */}
              <text x="230" y="132" fill="#ff9800" fontSize="11" fontFamily="Inter" fontWeight="600">☀↓</text>
              <text x="225" y="107" fill="rgba(255,255,255,0.6)" fontSize="9" fontFamily="Inter">{sunsetTime}</text>
            </svg>
          </div>

          {/* ── Detailed Weather Grid ── */}
          <div className="weather-details-grid dashboard-quick-stats">
            <div className="weather-detail-item">
              <div className="weather-detail-left">
                <div className="weather-detail-icon">🌡️</div>
                <div className="weather-detail-label">High/Low</div>
              </div>
              <div className="weather-detail-val">{Math.round(cw.high)}° / {Math.round(cw.low)}°</div>
            </div>
            <div className="weather-detail-item">
              <div className="weather-detail-left">
                <div className="weather-detail-icon">💨</div>
                <div className="weather-detail-label">Wind</div>
              </div>
              <div className="weather-detail-val">↑ {Math.round(cw.wind)} km/h</div>
            </div>
            <div className="weather-detail-item">
              <div className="weather-detail-left">
                <div className="weather-detail-icon">💧</div>
                <div className="weather-detail-label">Humidity</div>
              </div>
              <div className="weather-detail-val">{cw.humidity}%</div>
            </div>
            <div className="weather-detail-item">
              <div className="weather-detail-left">
                <div className="weather-detail-icon">🌡</div>
                <div className="weather-detail-label">Dew Point</div>
              </div>
              <div className="weather-detail-val">{Math.round(cw.dew_point)}°</div>
            </div>
            <div className="weather-detail-item">
              <div className="weather-detail-left">
                <div className="weather-detail-icon">📊</div>
                <div className="weather-detail-label">Pressure</div>
              </div>
              <div className="weather-detail-val">↑ {Math.round(cw.pressure)} mb</div>
            </div>
            <div className="weather-detail-item">
              <div className="weather-detail-left">
                <div className="weather-detail-icon">☀️</div>
                <div className="weather-detail-label">UV Index</div>
              </div>
              <div className="weather-detail-val" style={{ color: uvInfo.color }}>{uvInfo.text}</div>
            </div>
            <div className="weather-detail-item">
              <div className="weather-detail-left">
                <div className="weather-detail-icon">👁️</div>
                <div className="weather-detail-label">Visibility</div>
              </div>
              <div className="weather-detail-val">{visKm} km</div>
            </div>
            <div className="weather-detail-item">
              <div className="weather-detail-left">
                <div className="weather-detail-icon">{cw.moon_icon}</div>
                <div className="weather-detail-label">Moon Phase</div>
              </div>
              <div className="weather-detail-val moon-val">{cw.moon_phase}</div>
            </div>
            <div className="weather-detail-item">
              <div className="weather-detail-left">
                <div className="weather-detail-icon">🌧️</div>
                <div className="weather-detail-label">Rain Chance</div>
              </div>
              <div className="weather-detail-val">{cw.precip_prob}%</div>
            </div>
            <div className="weather-detail-item">
              <div className="weather-detail-left">
                <div className="weather-detail-icon">🏭</div>
                <div className="weather-detail-label">AQI</div>
              </div>
              <div className={`weather-detail-val ${cw.aqi > 60 ? 'text-warn' : 'text-good'}`}>{cw.aqi}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="dashboard-actions-centered">
            <button className="submit-btn primary-action-btn" onClick={() => setAppMode('plan')}>
              🧭 Plan Commute
            </button>
            <button 
              className="skincare-dialog-btn dashboard-skincare-btn-centered"
              onClick={() => setSkincareDialog({ tips: currentWeather.skincare, title: 'Current' })}
            >
              <span className="skincare-face-icon">🧑‍🦰</span>
              <span>Skincare</span>
            </button>
          </div>

          {/* Forecast */}
          {currentWeather.forecast && (
            <div className="forecast-section" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '2rem', paddingTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '1.1rem', textAlign: 'left' }}>Today's Forecast</h3>
              <div className="timeline">
                {currentWeather.forecast.map((temp, idx) => {
                  const currentHour = new Date().getHours();
                  if (idx < currentHour || idx > currentHour + 12) return null;
                  return (
                    <div className="timeline-pill" key={idx}>
                      <div className="pill-time">{formatHour(idx)}</div>
                      <div className="pill-temp">{Math.round(temp)}°</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {/* FALLBACK SEARCH (If location denied or they want to search another city) */}
      {!locating && !selectedCity && appMode === 'home' && (
        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <form className="city-search-form" onSubmit={searchCity}>
            <div className="input-group">
              <label>Search Your City</label>
              <div className="search-row">
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="e.g. Hyderabad, Kochi, London..." 
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  required
                />
                <button type="submit" className="submit-btn" disabled={searching}>
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* PLAN COMMUTE MODE */}
      {appMode === 'plan' && (
        <>
          {/* City Search inside Plan Mode if no city is selected yet */}
          {!selectedCity && (
            <div className="glass-card animate-fade-in">
              <form className="city-search-form" onSubmit={searchCity}>
                <div className="input-group">
                  <label>Search Your City</label>
                  <div className="search-row">
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="e.g. Hyderabad, Kochi, London..." 
                      value={cityQuery}
                      onChange={(e) => setCityQuery(e.target.value)}
                      required
                    />
                    <button type="submit" className="submit-btn" disabled={searching}>
                      {searching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Disambiguation results */}
              {cityResults.length > 1 && (
                <div className="city-results animate-fade-in">
                  <p className="city-results-label">Multiple cities found — pick yours:</p>
                  <div className="city-options">
                    {cityResults.map((c, idx) => (
                      <button 
                        key={idx} 
                        className="city-option-btn" 
                        onClick={() => pickCity(c)}
                      >
                        <span className="city-option-name">{c.name}</span>
                        <span className="city-option-detail">
                          {c.admin1 ? `${c.admin1}, ` : ''}{c.country}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selected city + commute form */}
          {selectedCity && (
            <div className="glass-card animate-fade-in">
              <div className="selected-city-bar">
                <div className="selected-city-info">
                  <span className="selected-city-icon">📍</span>
                  <span className="selected-city-name">{selectedCity.name}</span>
                  <span className="selected-city-detail">
                    {selectedCity.admin1 ? `${selectedCity.admin1}, ` : ''}{selectedCity.country}
                  </span>
                </div>
                <button className="change-city-btn" onClick={clearCity}>Change</button>
              </div>

              <form className="form-grid" onSubmit={fetchAdvice}>
                <div className="input-group">
                  <label>Travel Time</label>
                  <select 
                    className="glass-input" 
                    value={outTime}
                    onChange={(e) => setOutTime(e.target.value)}
                    required
                  >
                    {hourOptions.map(h => (
                      <option key={h} value={String(h).padStart(2, '0')}>{formatHour(h)}</option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="submit-btn" disabled={loading} style={{ gridColumn: '1 / -1' }}>
                  {loading ? 'Scanning...' : 'Plan Travel'}
                </button>
              </form>
            </div>
          )}

          {error && (
            <div className="glass-card advice-card danger animate-fade-in">
              <div className="advice-text">{error}</div>
            </div>
          )}

          {data && !error && (
            <div className="results-container">
              {/* Trip Card */}
              <div className={`glass-card advice-card ${getSeverityClass(data.advice)} animate-fade-in`} style={{ animationDelay: '0.2s' }}>
                <div className="advice-header">
                  <h2>{getTimeOfDay(outTime)} Travel</h2>
                </div>
                <p className="advice-text">{data.advice}</p>
                
                <div className="timeline">
                  {data.comparison.map((opt, idx) => (
                    <div className="timeline-pill" key={idx}>
                      <div className="pill-time">{formatHour(opt.hour)}</div>
                      <div className="pill-temp">{opt.temp}°</div>
                      <div className={`pill-status ${getPillStatusClass(opt.level)}`}>{opt.level}</div>
                    </div>
                  ))}
                  
                  {data.comparison.length > 0 && (
                    <button 
                      className="weather-dialog-btn animate-fade-in"
                      onClick={() => {
                        const targetOpt = data.comparison.find(o => String(o.hour).padStart(2, '0') === outTime) || data.comparison[1];
                        setWeatherDialog({ details: targetOpt, title: 'Travel' });
                      }}
                    >
                      <span className="weather-icon">☁️</span>
                      <span>Full Weather</span>
                    </button>
                  )}

                  {data.skincare && data.skincare.length > 0 && (
                    <button 
                      className="skincare-dialog-btn animate-fade-in"
                      onClick={() => setSkincareDialog({ tips: data.skincare, title: 'Travel' })}
                    >
                      <span className="skincare-face-icon">🧑‍🦰</span>
                      <span>Skincare Tips</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Skincare Dialog */}
      {skincareDialog && (
        <div className="dialog-overlay animate-fade-in" onClick={() => setSkincareDialog(null)}>
          <div className="dialog-content" onClick={e => e.stopPropagation()}>
            <button className="dialog-close" onClick={() => setSkincareDialog(null)}>&times;</button>
            <div className="skincare-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="skincare-face-icon">🧑‍🦰</span>
                <h3>{skincareDialog.title} Skincare Tips</h3>
              </div>
              <button 
                className="info-ads-btn"
                onClick={() => setAdsDialog(true)}
                title="View Recommended Products"
              >
                ℹ️ Recommended
              </button>
            </div>
            <div className="skincare-tips">
              {skincareDialog.tips.map((tip, idx) => (
                <div className="skincare-tip" key={idx}>
                  <span className="skincare-tip-icon">{tip.icon}</span>
                  <div className="skincare-tip-body">
                    <span className="skincare-tip-label">{tip.label}</span>
                    <span className="skincare-tip-text">{tip.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ads / Recommended Products Dialog */}
      {adsDialog && (
        <div className="dialog-overlay animate-fade-in" onClick={() => setAdsDialog(false)} style={{ zIndex: 1010 }}>
          <div className="dialog-content ads-dialog-content" onClick={e => e.stopPropagation()}>
            <button className="dialog-close" onClick={() => { setAdsDialog(false); setSelectedAdCategory(null); }}>&times;</button>
            
            {selectedAdCategory ? (
              <>
                <div className="skincare-header" style={{ marginBottom: '0.5rem' }}>
                  <button className="back-btn" onClick={() => setSelectedAdCategory(null)}>←</button>
                  <span className="skincare-face-icon">{AD_CATEGORIES.find(c => c.id === selectedAdCategory)?.icon}</span>
                  <h3>{AD_CATEGORIES.find(c => c.id === selectedAdCategory)?.name}</h3>
                </div>
                
                <div className="ads-scroll-container">
                  {AD_PRODUCTS[selectedAdCategory].map(product => (
                    <div key={product.id} className="ad-product-card">
                      <img src={product.image} alt={product.name} className="ad-product-image" />
                      <div className="ad-product-details">
                        <div className="ad-product-brand">{product.brand}</div>
                        <div className="ad-product-name">{product.name}</div>
                        <div className="ad-product-desc"><strong>What it is:</strong> {product.whatItIs}</div>
                        <div className="ad-product-desc"><strong>What it has:</strong> {product.whatItHas}</div>
                        <div className="ad-product-desc"><strong>Why use it:</strong> {product.whyUseIt}</div>
                        <a href={product.url} target="_blank" rel="noopener noreferrer" className="ad-product-buy-btn">
                          Buy Product 🛒
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="skincare-header" style={{ marginBottom: '0.5rem' }}>
                  <span className="skincare-face-icon">🛍️</span>
                  <h3>Shop by Category</h3>
                </div>
                
                <div className="ad-categories-grid">
                  {AD_CATEGORIES.map(cat => (
                    <button key={cat.id} className="ad-category-btn" onClick={() => setSelectedAdCategory(cat.id)}>
                      <span className="ad-category-icon">{cat.icon}</span>
                      <span className="ad-category-name">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Weather Dialog */}
      {weatherDialog && (
        <div className="dialog-overlay animate-fade-in" onClick={() => setWeatherDialog(null)}>
          <div className="dialog-content" onClick={e => e.stopPropagation()}>
            <button className="dialog-close" onClick={() => setWeatherDialog(null)}>&times;</button>
            <div className="skincare-header">
              <span className="skincare-face-icon">☁️</span>
              <h3 style={{ background: 'linear-gradient(135deg, #81d4fa, #29b6f6)', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>
                {weatherDialog.title} Weather Conditions
              </h3>
            </div>
            
            <div className="weather-details-grid">
              <div className="weather-detail-item">
                <div className="weather-detail-label">Temperature</div>
                <div className="weather-detail-val">{weatherDialog.details.temp}°C</div>
              </div>
              <div className="weather-detail-item">
                <div className="weather-detail-label">Humidity</div>
                <div className="weather-detail-val">{weatherDialog.details.humidity}%</div>
              </div>
              <div className="weather-detail-item">
                <div className="weather-detail-label">UV Index</div>
                <div className="weather-detail-val">{weatherDialog.details.uv}</div>
              </div>
              <div className="weather-detail-item">
                <div className="weather-detail-label">AQI</div>
                <div className="weather-detail-val">{weatherDialog.details.aqi}</div>
              </div>
              <div className="weather-detail-item">
                <div className="weather-detail-label">Wind Speed</div>
                <div className="weather-detail-val">{weatherDialog.details.wind} km/h</div>
              </div>
              <div className="weather-detail-item">
                <div className="weather-detail-label">Rain Chance</div>
                <div className="weather-detail-val">{weatherDialog.details.precip_prob}%</div>
              </div>
            </div>
            {weatherDialog.details.details && (
              <div className="weather-detail-summary" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div>
                  <span className="weather-detail-label">Summary:</span> {weatherDialog.details.details}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.2rem', borderRadius: '12px', marginTop: '0.5rem' }}>
                  <span style={{ display: 'block', marginBottom: '1rem', color: '#ce93d8', fontWeight: '600', letterSpacing: '0.5px' }}>⚡ QUICK ACTION PLAN</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {generateActionPlan(weatherDialog.details).map((action, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
                        <span style={{ fontSize: '1.2rem', lineHeight: '1.2' }}>{action.icon}</span>
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', lineHeight: '1.4' }}>{action.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Status Floating Icon */}
      {apiStatus && (
        <div className="api-status-floating" title={`${apiStatus.used} requests used in the last minute`}>
          <span className="api-icon">✨</span>
          <span>{apiStatus.remaining} left</span>
        </div>
      )}
      </div>
    </div>
  )
}

export default App
