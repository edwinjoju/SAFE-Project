import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './App.css'
import FullPageLoader from './components/FullPageLoader'
import Sidebar from './components/Sidebar'
import SkincareModule from './components/SkincareModule'
import CommutePlanner from './components/CommutePlanner'
import HomeDashboard from './components/HomeDashboard'
import EnvironmentalNews from './components/EnvironmentalNews'

/** Convert a 24h integer (0-23) to "12 AM", "8 AM", "5 PM", etc. */
const formatHour = (h) => {
  if (h === 0) return '12 AM'
  if (h < 12)  return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

// Hardcoded default data for instant loading
const defaultLondonWeather = {
  current: {
    temp: 15,
    humidity: 70,
    uv: 3,
    aqi: 45,
    pressure: 1012,
    precip_prob: 20,
    wind: 18,
    condition_text: "Partly cloudy",
    condition_icon: "⛅",
    high: 18,
    low: 10,
    dew_point: 9,
    visibility: 10000,
    feels_like: 14,
    sunrise: new Date().toISOString().split('T')[0] + "T05:50",
    sunset: new Date().toISOString().split('T')[0] + "T18:45",
    moon_phase: "Waxing Gibbous",
    moon_icon: "🌔",
    moon_illumination: 80,
  },
  skincare: [
    { icon: "🧴", label: "Sunscreen", text: "Moderate UV — SPF 30 is enough." },
    { icon: "💧", label: "Hydration", text: "Light moisturizer is recommended." }
  ],
  forecast: [10, 10, 11, 12, 14, 15, 17, 18, 18, 17, 16, 15, 14, 13, 12, 11, 11, 10, 10, 9, 9, 9, 9, 9, 10, 10, 11, 12, 14, 15, 17, 18, 18, 17, 16, 15, 14, 13, 12, 11, 11, 10, 10, 9, 9, 9, 9, 9]
};

const defaultCity = {
  latitude: 51.5074,
  longitude: -0.1278,
  name: "London",
  country: "UK"
};

function App() {
  const [appMode, setAppMode] = useState('home'); 
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);


  const [theme, setTheme] = useState(() => localStorage.getItem('safe_theme') || 'dark');
  const [currentWeather, setCurrentWeather] = useState(() => {
    const cached = localStorage.getItem('safe_weather');
    return cached ? JSON.parse(cached) : null;
  });
  
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState([])
  const [selectedCity, setSelectedCity] = useState(() => {
    const cached = localStorage.getItem('safe_city');
    return cached ? JSON.parse(cached) : null;
  });
  const [searching, setSearching] = useState(false)
  
  // Independent search states for each module
  const [planSearchMode, setPlanSearchMode] = useState(false)
  const [skincareSearchMode, setSkincareSearchMode] = useState(false)

  const [error, setError] = useState(null)
  const [locating, setLocating] = useState(() => {
    return localStorage.getItem('safe_city') ? false : true;
  });
  const [apiStatus, setApiStatus] = useState(null)


  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('safe_theme', newTheme);
      return newTheme;
    });
  };
  
  const initRef = useRef(false)
  const userInteractedRef = useRef(false)

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

  const fetchCurrentWeatherForCity = async (lat, lon, name, country, isBackground = false) => {
    // if (!isBackground) setLocating(true); // Removed to prevent full page reload on city change
    try {
      const resp = await axios.get('http://localhost:8000/current-weather', { params: { lat, lon } });
      
      // Prevent delayed background fetches from overwriting active user selections
      if (isBackground && userInteractedRef.current) return;

      const newCity = { latitude: lat, longitude: lon, name, country };
      setCurrentWeather(resp.data);
      setSelectedCity(newCity);
      
      localStorage.setItem('safe_weather', JSON.stringify(resp.data));
      localStorage.setItem('safe_city', JSON.stringify(newCity));
      
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
    if (initRef.current) return;
    initRef.current = true;

    // Check if we have a cached city. If so, just quietly update its weather!
    const cachedCityStr = localStorage.getItem('safe_city');
    if (cachedCityStr) {
      const cachedCity = JSON.parse(cachedCityStr);
      // Quiet background fetch to update the cached values
      fetchCurrentWeatherForCity(cachedCity.latitude, cachedCity.longitude, cachedCity.name, cachedCity.country, true);
      return; // Skip geolocation if we already have a cached city!
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Ask the backend to turn coordinates into a real city name
            const geoResp = await axios.get('http://localhost:8000/reverse-geocode', { 
              params: { lat: latitude, lon: longitude } 
            });
            const cityName = geoResp.data.name || "Current Location";
            const country = geoResp.data.country || "";
            
            // Now update the weather with the actual name
            fetchCurrentWeatherForCity(latitude, longitude, cityName, country, true);
          } catch (e) {
            // Fallback if reverse geocoding fails
            fetchCurrentWeatherForCity(latitude, longitude, "Current Location", "", true);
          }
        },
        (err) => {
          console.log("Geolocation denied or failed", err);
          setLocating(false);
        },
        { timeout: 10000 }
      );
    }
  }, []);



  // STEP 1: Search for city matches
  const searchCity = async (e) => {
    e.preventDefault()
    if (!cityQuery.trim()) return

    userInteractedRef.current = true
    setSearching(true)
    setCityResults([])
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
        if (appMode === 'home' || appMode === 'skincare') {
          fetchCurrentWeatherForCity(results[0].latitude, results[0].longitude, results[0].name, results[0].country);
        } else {
          setSelectedCity(results[0])
        }
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
    setPlanSearchMode(false)
    setSkincareSearchMode(false)
    
    // Always fetch weather and update selected city globally to keep tabs in sync
    fetchCurrentWeatherForCity(city.latitude, city.longitude, city.name, city.country);
  }

  const clearCity = () => {
    userInteractedRef.current = true
    setSelectedCity(null)
    setCurrentWeather(null)
    setCityResults([])
    setCityQuery('')
    setError(null)
    setLocating(false)
  }



  const handleNav = (mode) => {
    setAppMode(mode);
    setPlanSearchMode(false);
    setSkincareSearchMode(false);
    setCityResults([]);
    setCityQuery('');
    setError(null);
  };

  // ── 4K Dynamic Wallpaper Engine ──────────────────────────────
  // Matrix: 7 weather conditions × 4 time-of-day segments = 28 unique wallpapers
  // All images: Unsplash CDN @ 3840px width (4K)
  const WALLPAPER_MATRIX = {
    clear: {
      morning: "photo-1470252649378-9c29740c9fa8",   // Golden sunrise over meadow
      day:     "photo-1502082553048-f009c37129b9",   // Bright sunlit forest canopy
      evening: "photo-1495616811223-4d98c6e9c869",   // Golden sunset horizon
      night:   "photo-1507400492013-162706c8c05e",   // Clear starry night sky
    },
    cloudy: {
      morning: "photo-1504608524841-42fe6f032b4b",   // Soft clouds at dawn
      day:     "photo-1534088568595-a066f410bcda",   // Scattered clouds over landscape
      evening: "photo-1499346030926-9a72daac6c63",   // Dramatic sunset clouds
      night:   "photo-1532978379173-523e16f371f2",   // Moonlit cloudy sky
    },
    overcast: {
      morning: "photo-1501630834273-4b5604d2ee31",   // Grey moody morning
      day:     "photo-1501426026826-31c667bdf23d",   // Overcast skies over hills
      evening: "photo-1504253163759-c23fccaebb55",   // Heavy clouds at dusk
      night:   "photo-1519608487953-e999c86e7455",   // Overcast city night
    },
    rain: {
      morning: "photo-1515694346937-94d85e39e29c",   // Rainy morning mist
      day:     "photo-1519692938311-59b7a7c7aead",   // Rainy day city streets
      evening: "photo-1493397212122-2b85def82820",   // Rain on glass at dusk
      night:   "photo-1534274988757-a28bf1a57c17",   // Rainy night neon reflections
    },
    thunder: {
      morning: "photo-1605727216801-e27ce1d0cc28",   // Storm clouds gathering
      day:     "photo-1472145246862-b24cf25c4a36",   // Dark storm over field
      evening: "photo-1429552077091-836152271555",   // Lightning at sunset
      night:   "photo-1461511669078-d46bf351cd6b",   // Lightning night sky
    },
    snow: {
      morning: "photo-1491002052546-bf38f186af56",   // Snowy morning landscape
      day:     "photo-1478265409131-1f65c88f965c",   // Snow-covered mountain peaks
      evening: "photo-1548777123-e216912df7d8",   // Snowy twilight village
      night:   "photo-1457269449834-928af64c684d",   // Snow falling at night
    },
    fog: {
      morning: "photo-1487621167305-5d248087c724",   // Misty morning forest
      day:     "photo-1485236715568-ddc5ee6ca227",   // Foggy day in the woods
      evening: "photo-1543968996-ee822b8176ba",   // Misty evening landscape
      night:   "photo-1508739773434-c26b3d09e071",   // Foggy night lights
    },
  };

  const getBackgroundUrl = () => {
    const hour = (currentWeather && currentWeather.current && typeof currentWeather.current.local_hour === 'number') 
                 ? currentWeather.current.local_hour 
                 : new Date().getHours();
    const timeSlot =
      (hour >= 5 && hour < 10) ? "morning" :
      (hour >= 10 && hour < 17) ? "day" :
      (hour >= 17 && hour < 20) ? "evening" : "night";

    let weatherKey = "clear"; // default
    if (currentWeather) {
      const c = currentWeather.current.condition_text.toLowerCase();
      if (c.includes('thunder') || c.includes('lightning'))           weatherKey = "thunder";
      else if (c.includes('snow') || c.includes('sleet') || c.includes('blizzard')) weatherKey = "snow";
      else if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) weatherKey = "rain";
      else if (c.includes('fog') || c.includes('mist') || c.includes('haze'))       weatherKey = "fog";
      else if (c.includes('overcast'))                                               weatherKey = "overcast";
      else if (c.includes('cloud') || c.includes('partly'))                          weatherKey = "cloudy";
    }

    const photoId = WALLPAPER_MATRIX[weatherKey]?.[timeSlot] || WALLPAPER_MATRIX.clear[timeSlot];
    return `https://images.unsplash.com/${photoId}?q=80&w=3840&auto=format&fit=crop`;
  };

  const bgUrl = getBackgroundUrl();

  return (
    <div className="layout-wrapper">
      {/* Global Dynamic Weather Background */}
      {bgUrl && (
        <div className="dynamic-weather-bg" style={{ backgroundImage: `url('${bgUrl}')` }}>
          <div className="bg-overlay"></div>
        </div>
      )}

      {/* PERSISTENT LEFT SIDEBAR */}
      <Sidebar 
        appMode={appMode} 
        handleNav={handleNav} 
        sidebarCollapsed={sidebarCollapsed} 
        setSidebarCollapsed={setSidebarCollapsed} 
      />

      <div className={`app-container ${appMode === 'home' ? 'home-no-padding' : ''}`}>
        {appMode !== 'home' && (
          <div className="theme-toggle-wrapper">
            <button className="theme-toggle-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}>
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
          </div>
        )}
        {locating && <FullPageLoader />}

      {/* HOME MODE DASHBOARD */}
      {appMode === 'home' && currentWeather && (
        <HomeDashboard
          currentWeather={currentWeather}
          selectedCity={selectedCity}
          theme={theme}
          toggleTheme={toggleTheme}
          cityQuery={cityQuery}
          setCityQuery={setCityQuery}
          searching={searching}
          searchCity={searchCity}
          cityResults={cityResults}
          setCityResults={setCityResults}
          pickCity={pickCity}
          error={error}
        />
      )}

      {/* FALLBACK SEARCH (If location denied or they want to search another city) */}
      {!locating && (!currentWeather && !selectedCity || (appMode === 'skincare' && skincareSearchMode)) && (appMode === 'home' || appMode === 'skincare') && (
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
                {selectedCity && appMode === 'skincare' && skincareSearchMode && (
                  <button type="button" className="change-city-btn" onClick={() => { setSkincareSearchMode(false); setCityResults([]); }} style={{ height: '52px', padding: '0 1.5rem', borderRadius: '12px' }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>

          {error && (
            <div className="advice-text" style={{ color: '#ff6b6b', marginTop: '1rem' }}>{error}</div>
          )}

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

      {/* PLAN COMMUTE MODE */}
      {appMode === 'plan' && (
        <CommutePlanner
          selectedCity={selectedCity}
          planSearchMode={planSearchMode}
          setPlanSearchMode={setPlanSearchMode}
          cityQuery={cityQuery}
          setCityQuery={setCityQuery}
          searching={searching}
          searchCity={searchCity}
          cityResults={cityResults}
          setCityResults={setCityResults}
          pickCity={pickCity}
        />
      )}

      {/* SKINCARE MODE */}
      {appMode === 'skincare' && (
        <SkincareModule 
          selectedCity={selectedCity} 
          currentWeather={currentWeather} 
          skincareSearchMode={skincareSearchMode} 
          setSkincareSearchMode={setSkincareSearchMode} 
        />
      )}

      {/* ENVIRONMENTAL NEWS MODE */}
      {appMode === 'alerts' && (
        <EnvironmentalNews
          selectedCity={selectedCity}
        />
      )}

      </div>
    </div>
  )
}

export default App
