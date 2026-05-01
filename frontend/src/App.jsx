import { useState, useEffect, useRef } from 'react'
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
  const [skincareModal, setSkincareModal] = useState(null);

  const skincareDetails = {
    "Wear Sunscreen Daily": {
      more: "Sunscreen is the single most important step in any skincare routine. It protects against UV radiation which causes 90% of skin aging and increases skin cancer risk.",
      info: "Look for 'Broad Spectrum' on the label to ensure protection against both UVA (aging) and UVB (burning) rays. Reapply every 2 hours if you're outdoors.",
      quote: "Your future self will thank you for the SPF you wear today."
    },
    "Stay Hydrated": {
      more: "Drinking water is essential for maintaining skin elasticity and flushing out toxins. Dehydrated skin often looks dull and can emphasize fine lines.",
      info: "Try to carry a reusable bottle. If you find plain water boring, infuse it with cucumber, lemon, or mint for a refreshing antioxidant boost.",
      quote: "Invest in your skin. It is going to represent you for a long time."
    },
    "Keep it Light": {
      more: "In warmer weather, heavy creams can trap sweat and bacteria, leading to breakouts. Switching to gel-based or water-based formulas allows your skin to breathe.",
      info: "Look for ingredients like Hyaluronic Acid or Glycerin which provide intense hydration without the heavy, oily feel of traditional creams.",
      quote: "Simplicity is the ultimate sophistication in skincare."
    },
    "Cleanse Gently": {
      more: "Over-washing can strip your skin of its natural oils, leading to irritation. A gentle cleanser removes pollutants without disrupting your skin barrier.",
      info: "If you've been wearing sunscreen or makeup, try 'Double Cleansing'—start with an oil-based cleanser followed by a water-based one.",
      quote: "Clean skin is the best canvas for a healthy glow."
    },
    "Moisturize Always": {
      more: "Even oily skin needs moisture! Skipping moisturizer can actually cause your skin to produce *more* oil to compensate for the dryness.",
      info: "Apply your moisturizer while your skin is still slightly damp from cleansing to lock in as much hydration as possible.",
      quote: "Hydrated skin is happy skin."
    },
    "Protect Your Eyes": {
      more: "The skin around your eyes is the thinnest on your body and often the first to show signs of damage. UV rays can also lead to cataracts and other eye issues.",
      info: "Invest in sunglasses with UV400 protection and consider a wide-brimmed hat when the sun is at its peak (10 AM - 4 PM).",
      quote: "The eyes are the windows to the soul; keep the frames looking fresh."
    },
    "Don't Skip Antioxidants": {
      more: "Antioxidants like Vitamin C and E act as a shield against environmental damage and pollution, preventing dark spots and boosting brightness.",
      info: "Apply a Vitamin C serum in the morning before your sunscreen to double up on protection against free radicals from the sun.",
      quote: "Glow is the essence of beauty."
    },
    "Night Care Matters": {
      more: "While you sleep, your skin goes into 'repair mode'. This is the best time to use targeted treatments like Retinol or overnight masks.",
      info: "Ensure you get 7-9 hours of beauty sleep. Your skin produces new collagen when you sleep, which prevents sagging.",
      quote: "Sleep is the best meditation—and the best beauty treatment."
    },
    "Eat Skin Loving Food": {
      more: "What you put *inside* your body is just as important as what you put *on* it. Foods rich in Omega-3s and antioxidants support skin repair.",
      info: "Load up on berries, walnuts, spinach, and fatty fish. These contain nutrients that fight inflammation and keep skin supple.",
      quote: "Beautiful skin starts from within."
    },
    "Be Kind to Yourself": {
      more: "Stress is a major trigger for skin conditions like acne and eczema. Taking time for mental health directly impacts your physical appearance.",
      info: "Practice mindfulness, yoga, or simply take a 5-minute breather. Your skin reflects your inner state of peace.",
      quote: "Beauty begins the moment you decide to be yourself."
    },
    "Limit Sun Exposure": {
      more: "The sun's rays are most intense during the middle of the day. Even with sunscreen, prolonged exposure can lead to sun damage and heat stroke.",
      info: "Seek shade under trees or umbrellas. If you must be out, wear light, long-sleeved clothing to physically block the rays.",
      quote: "A sun-kissed look is nice, but sun-safe skin is forever."
    },
    "Stress Less": {
      more: "Cortisol (the stress hormone) can increase oil production and break down collagen. Finding ways to manage stress is a skincare secret.",
      info: "Try a simple 4-7-8 breathing technique when you feel overwhelmed. Lowering your heart rate helps lower skin inflammation.",
      quote: "Peace of mind is the ultimate skincare routine."
    }
  };

  const [theme, setTheme] = useState('dark')
  const [currentWeather, setCurrentWeather] = useState(defaultLondonWeather)
  
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState([])
  const [selectedCity, setSelectedCity] = useState(defaultCity)
  const [searching, setSearching] = useState(false)
  
  // Independent search states for each module
  const [planSearchMode, setPlanSearchMode] = useState(false)
  const [skincareSearchMode, setSkincareSearchMode] = useState(false)

  const [outTime, setOutTime] = useState(String(Math.min(23, new Date().getHours() + 1)).padStart(2, '0'))
  const [travelDay, setTravelDay] = useState(0)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [weatherDialog, setWeatherDialog] = useState(null)
  const [locating, setLocating] = useState(false)
  const [apiStatus, setApiStatus] = useState(null)
  const [adsDialog, setAdsDialog] = useState(false)
  const [selectedAdCategory, setSelectedAdCategory] = useState(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  
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
    if (!isBackground) setLocating(true);
    try {
      const resp = await axios.get('http://localhost:8000/current-weather', { params: { lat, lon } });
      
      // Prevent delayed background fetches from overwriting active user selections
      if (isBackground && userInteractedRef.current) return;

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
    if (initRef.current) return;
    initRef.current = true;

    // We no longer fetch REAL London weather here to avoid the "triple jump".
    // The app will stay on the hardcoded 15°C placeholder until Geolocation finds your real city.

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
        },
        { timeout: 10000 }
      );
    }
  }, []);

  // Clear stale commute data whenever the city changes
  useEffect(() => {
    if (selectedCity) {
      setData(null);
      setError(null);
    }
  }, [selectedCity]);

  // STEP 1: Search for city matches
  const searchCity = async (e) => {
    e.preventDefault()
    if (!cityQuery.trim()) return

    userInteractedRef.current = true
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
    setData(null)
    setError(null)
    setLocating(false)
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
          travel_time: parseInt(outTime),
          travel_day: travelDay
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

  const handleNav = (mode) => {
    setAppMode(mode);
    setPlanSearchMode(false);
    setSkincareSearchMode(false);
    setCityResults([]);
    setCityQuery('');
    setError(null);
  };

  return (
    <div className="layout-wrapper">
      {/* Animated Background (Homepage only) */}
      {appMode === 'home' && (
        <div className="animated-bg-container">
          <div className="animated-bg-overlay"></div>
          <div className="animated-bg-image"></div>
          
          {/* Extra floating clouds for Light Mode */}
          {theme === 'light' && (
            <div className="floating-clouds">
              <div className="cloud-float c1">
                <svg viewBox="0 0 24 24"><path d="M17.5,19c-3.037,0-5.5-2.463-5.5-5.5c0-0.035,0.002-0.069,0.003-0.104C11.309,13.25,10.669,13.125,10,13.125c-2.416,0-4.375,1.959-4.375,4.375s1.959,4.375,4.375,4.375h7.5c1.726,0,3.125-1.399,3.125-3.125S19.226,15.625,17.5,15.625L17.5,19z M19,10.625c0-3.107-2.518-5.625-5.625-5.625c-2.164,0-4.043,1.222-4.996,3.018C7.818,7.391,7,8.232,7,9.25c0,1.243,1.007,2.25,2.25,2.25h9.75V10.625z"/></svg>
              </div>
              <div className="cloud-float c2">
                <svg viewBox="0 0 24 24"><path d="M17.5,19c-3.037,0-5.5-2.463-5.5-5.5c0-0.035,0.002-0.069,0.003-0.104C11.309,13.25,10.669,13.125,10,13.125c-2.416,0-4.375,1.959-4.375,4.375s1.959,4.375,4.375,4.375h7.5c1.726,0,3.125-1.399,3.125-3.125S19.226,15.625,17.5,15.625L17.5,19z M19,10.625c0-3.107-2.518-5.625-5.625-5.625c-2.164,0-4.043,1.222-4.996,3.018C7.818,7.391,7,8.232,7,9.25c0,1.243,1.007,2.25,2.25,2.25h9.75V10.625z"/></svg>
              </div>
              <div className="cloud-float c3">
                <svg viewBox="0 0 24 24"><path d="M17.5,19c-3.037,0-5.5-2.463-5.5-5.5c0-0.035,0.002-0.069,0.003-0.104C11.309,13.25,10.669,13.125,10,13.125c-2.416,0-4.375,1.959-4.375,4.375s1.959,4.375,4.375,4.375h7.5c1.726,0,3.125-1.399,3.125-3.125S19.226,15.625,17.5,15.625L17.5,19z M19,10.625c0-3.107-2.518-5.625-5.625-5.625c-2.164,0-4.043,1.222-4.996,3.018C7.818,7.391,7,8.232,7,9.25c0,1.243,1.007,2.25,2.25,2.25h9.75V10.625z"/></svg>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PERSISTENT LEFT SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>S.A.F.E.</h1>
          <p>Smart Atmospheric Forecast Engine</p>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`sidebar-nav-item ${appMode === 'home' ? 'active' : ''}`}
            onClick={() => handleNav('home')}
          >
            <span className="sidebar-icon">🏠</span> Today
          </button>
          
          <button 
            className={`sidebar-nav-item ${appMode === 'plan' ? 'active' : ''}`}
            onClick={() => handleNav('plan')}
          >
            <span className="sidebar-icon">🚗</span> Commute Advisor
          </button>

          <button 
            className={`sidebar-nav-item ${appMode === 'skincare' ? 'active' : ''}`}
            onClick={() => handleNav('skincare')}
          >
            <span className="sidebar-icon">🧑‍🦰</span> Skincare
          </button>
        </nav>
      </aside>

      <div className="app-container">
        <div className="theme-toggle-wrapper">
          <button className="theme-toggle-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}>
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
        {locating && !currentWeather && (
          <div className="glass-card animate-fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
            <h2>Locating you...</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Allow location access to get started.</p>
          </div>
        )}

      {/* HOME MODE DASHBOARD */}
      {appMode === 'home' && currentWeather && (() => {
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
        <div className="glass-card dashboard-card animate-fade-in" style={{ padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
          
          {/* Day / Night Illustration */}
          <div style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.75, pointerEvents: 'none' }}>
            {isDaytime ? (
              <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 25px rgba(255, 167, 38, 0.4))', animation: 'spin-slow 60s linear infinite' }}>
                <circle cx="50" cy="50" r="20" fill="url(#sunGrad)" />
                <g stroke="url(#sunGrad)" strokeWidth="4" strokeLinecap="round">
                  <line x1="50" y1="10" x2="50" y2="20" />
                  <line x1="50" y1="80" x2="50" y2="90" />
                  <line x1="10" y1="50" x2="20" y2="50" />
                  <line x1="80" y1="50" x2="90" y2="50" />
                  <line x1="21.7" y1="21.7" x2="28.8" y2="28.8" />
                  <line x1="71.2" y1="71.2" x2="78.3" y2="78.3" />
                  <line x1="21.7" y1="78.3" x2="28.8" y2="71.2" />
                  <line x1="71.2" y1="28.8" x2="78.3" y2="21.7" />
                </g>
                <defs>
                  <radialGradient id="sunGrad" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFF9C4" />
                    <stop offset="50%" stopColor="#FFC107" />
                    <stop offset="100%" stopColor="#FF9800" />
                  </radialGradient>
                </defs>
              </svg>
            ) : (
              <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 0 25px rgba(144, 202, 249, 0.4))', animation: 'float-slow 6s ease-in-out infinite' }}>
                <path d="M60 20C40.67 20 25 35.67 25 55C25 74.33 40.67 90 60 90C64.67 90 69.1 89.1 73.16 87.45C60.28 84.14 50.5 72.33 50.5 58C50.5 42.42 61.64 29.5 76 26.65C71.22 22.42 65.86 20 60 20Z" fill="url(#moonGrad)" />
                <circle cx="25" cy="35" r="2" fill="#FFF" opacity="0.6" />
                <circle cx="85" cy="45" r="1.5" fill="#FFF" opacity="0.4" />
                <circle cx="75" cy="80" r="2.5" fill="#FFF" opacity="0.8" />
                <circle cx="20" cy="85" r="1.5" fill="#FFF" opacity="0.5" />
                <defs>
                  <linearGradient id="moonGrad" x1="25" y1="20" x2="76" y2="90" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#E3F2FD" />
                    <stop offset="100%" stopColor="#64B5F6" />
                  </linearGradient>
                </defs>
              </svg>
            )}
          </div>
          
          {/* Top Header Bar */}
          <div className="hero-header-bar">
            <div className="hero-search-wrapper">
              <div className="hero-search-input-group">
                <span className="hero-search-icon">🔍</span>
                <input 
                  type="text" 
                  className="hero-search-input"
                  placeholder="Search city..." 
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchCity(e)}
                />
                {searching && <div className="searching-loader-mini"></div>}
              </div>
              
              {cityResults.length > 0 && (
                <div className="hero-search-results-dropdown animate-fade-in">
                  {cityResults.map((city, idx) => (
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
                  ))}
                </div>
              )}
            </div>

            <div className="hero-location-display">
              <h2 className="hero-city-name">
                {selectedCity?.name || "Your Location"}{selectedCity?.country ? `, ${selectedCity.country}` : ''}
              </h2>
              <p className="hero-time-centered">As of {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
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
              {/* Background arc (track) */}
              <path
                d={`M ${arcCx - arcR} ${arcCy} A ${arcR} ${arcR} 0 0 1 ${arcCx + arcR} ${arcCy}`}
                fill="none"
                stroke="var(--glass-border)"
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
              <text x="25" y="107" fill="var(--text-muted)" fontSize="9" fontFamily="Inter">{sunriseTime}</text>

              {/* Sunset icon + label (right) */}
              <text x="230" y="132" fill="#ff9800" fontSize="11" fontFamily="Inter" fontWeight="600">☀↓</text>
              <text x="225" y="107" fill="var(--text-muted)" fontSize="9" fontFamily="Inter">{sunsetTime}</text>
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



          {/* Forecast */}
          {currentWeather.forecast && (
            <div className="forecast-section" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '2rem', paddingTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '1.1rem', textAlign: 'left' }}>Next 24 Hours</h3>
              <div className="timeline">
                {currentWeather.forecast.map((item, idx) => {
                  const currentHour = new Date().getHours();
                  // item is now { temp, uv, humidity, precip }
                  if (idx < currentHour || idx > currentHour + 24) return null;
                  
                  const displayHour = idx % 24;
                  const isTomorrow = idx >= 24;

                  const getPillRiskBg = () => {
                    if (item.temp >= 35 || item.uv > 7 || item.precip > 60) return 'var(--risk-high-bg)';
                    if (item.temp >= 28 || item.uv > 4 || item.precip > 20) return 'var(--risk-med-bg)';
                    return 'var(--risk-low-bg)';
                  };
                  
                  return (
                    <div 
                      className="timeline-pill" 
                      key={idx} 
                      style={{ 
                        position: 'relative',
                        background: getPillRiskBg(),
                        border: '1px solid var(--glass-border)',
                        paddingTop: '1.25rem'
                      }}
                    >
                      {isTomorrow && displayHour === 0 && (
                        <div style={{ position: 'absolute', top: '-18px', fontSize: '0.75rem', color: '#00c6ff', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>Tomorrow</div>
                      )}
                      
                      {/* Top Left: UV */}
                      {item.uv > 0 && (
                        <div style={{ position: 'absolute', top: '5px', left: '8px', fontSize: '0.7rem', opacity: 0.8 }} title={`UV Index: ${item.uv}`}>
                          ☀️{item.uv}
                        </div>
                      )}

                      {/* Top Right: Rain */}
                      {item.precip > 0 && (
                        <div style={{ position: 'absolute', top: '5px', right: '8px', fontSize: '0.7rem', opacity: 0.8 }} title={`Rain Chance: ${item.precip}%`}>
                          💧{item.precip}%
                        </div>
                      )}

                      <div className="pill-time">{formatHour(displayHour)}</div>
                      <div className="pill-temp">{Math.round(item.temp)}°</div>

                      {/* Bottom Right: Humidity (if > 60%) */}
                      {item.humidity > 60 && (
                        <div style={{ position: 'absolute', bottom: '5px', right: '8px', fontSize: '0.7rem', opacity: 0.6 }} title={`Humidity: ${item.humidity}%`}>
                          ☁️
                        </div>
                      )}
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
      {!locating && (!selectedCity || (appMode === 'skincare' && skincareSearchMode)) && (appMode === 'home' || appMode === 'skincare') && (
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
        <>
          {/* City Search inside Plan Mode if no city is selected yet */}
          {(!selectedCity || planSearchMode) && (
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
          {(selectedCity && !planSearchMode) && (
            <div className="glass-card animate-fade-in">
              <div className="selected-city-bar">
                <div className="selected-city-info">
                  <span className="selected-city-icon">📍</span>
                  <span className="selected-city-name">{selectedCity.name}</span>
                  <span className="selected-city-detail">
                    {selectedCity.admin1 ? `${selectedCity.admin1}, ` : ''}{selectedCity.country}
                  </span>
                </div>
                <button className="change-city-btn" onClick={() => setPlanSearchMode(true)}>Change</button>
              </div>

              <form className="form-grid" onSubmit={fetchAdvice}>
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <div className="day-toggle">
                    <button 
                      type="button" 
                      className={`toggle-btn ${travelDay === 0 ? 'active' : ''}`} 
                      onClick={() => { 
                        setTravelDay(0); 
                        setOutTime(String(Math.max(new Date().getHours(), parseInt(outTime))).padStart(2, '0')); 
                      }}
                    >
                      Today
                    </button>
                    <button 
                      type="button" 
                      className={`toggle-btn ${travelDay === 1 ? 'active' : ''}`} 
                      onClick={() => setTravelDay(1)}
                    >
                      Tomorrow
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label>Travel Time</label>
                  <select 
                    className="glass-input custom-select" 
                    value={outTime}
                    onChange={(e) => setOutTime(e.target.value)}
                    required
                  >
                    {(travelDay === 0 ? hourOptions.filter(h => h >= new Date().getHours()) : hourOptions).map(h => (
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
                </div>

                {data.comparison && data.comparison.length > 0 && (() => {
                  const targetOpt = data.comparison.find(o => String(o.hour).padStart(2, '0') === String(outTime).padStart(2, '0')) || data.comparison[1] || data.comparison[0];
                  const actionPlan = targetOpt ? generateActionPlan(targetOpt) : [];
                  return (
                    <div className="skincare-section animate-fade-in" style={{ width: '100%', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      {actionPlan.length > 0 && (
                        <>
                          <div className="skincare-header" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span className="skincare-face-icon" style={{ fontSize: '1.5rem' }}>⚡</span>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--accent-purple)', margin: 0 }}>Quick Action Plan</h3>
                          </div>
                          <div className="skincare-tips" style={{ display: 'grid', gap: '0.8rem', marginBottom: '2rem' }}>
                            {actionPlan.map((action, idx) => (
                              <div key={`action-${idx}`} className="skincare-tip" style={{ display: 'flex', gap: '1rem', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '12px', alignItems: 'center' }}>
                                <div className="skincare-tip-icon" style={{ fontSize: '1.5rem' }}>{action.icon}</div>
                                <div className="skincare-tip-body" style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span className="skincare-tip-text" style={{ color: 'var(--text-main)', fontSize: '1.05rem', lineHeight: '1.4' }}>{action.text}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </>
      )}

      {/* SKINCARE MODE */}
      {appMode === 'skincare' && (
        <>
          {(selectedCity && currentWeather && !skincareSearchMode) && (
              <div className="glass-card animate-fade-in" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02))' }}>
                <div className="selected-city-bar" style={{ marginBottom: '1rem' }}>
                  <div className="selected-city-info">
                    <span className="selected-city-icon">📍</span>
                    <span className="selected-city-name">{selectedCity.name}</span>
                    <span className="selected-city-detail">
                      {selectedCity.admin1 ? `${selectedCity.admin1}, ` : ''}{selectedCity.country}
                    </span>
                  </div>
                  <button className="change-city-btn" onClick={() => setSkincareSearchMode(true)}>Change Location</button>
                </div>
                
                <div className="skincare-magazine-container">
                  <header className="skincare-magazine-header">
                    <h1>How to take care of your</h1>
                    <p className="main-title">SKIN</p>
                    <span className="sub-title">in the {currentWeather.current.temp > 25 ? 'Summer' : 'Current Weather'}</span>
                    <div className="skincare-magazine-banner">
                      SUNSHINE, GOOD HABITS, GLOWING YOU
                    </div>
                  </header>

                  <div className="skincare-grid">
                    {[
                      { icon: "☀️", label: "Wear Sunscreen Daily", text: "SPF 30+ is your skin's BFF." },
                      { icon: "💧", label: "Stay Hydrated", text: "Drink lots of water, glowing skin starts from within." },
                      { icon: "🧴", label: "Keep it Light", text: "Use lightweight, non-comedogenic products." },
                      { icon: "🧼", label: "Cleanse Gently", text: "Sweat, dirt & oil can clog pores. Cleanse twice a day." },
                      { icon: "🌸", label: "Moisturize Always", text: "Even in summer, hydration keeps your skin barrier happy." },
                      { icon: "🕶️", label: "Protect Your Eyes", text: "Wear hats, sunglasses & seek shade when possible." },
                      { icon: "🍊", label: "Don't Skip Antioxidants", text: "Ingredients like Vitamin C help fight sun damage & brighten skin." },
                      { icon: "🌙", label: "Night Care Matters", text: "Repair & refresh your skin while you sleep." },
                      { icon: "🥗", label: "Eat Skin Loving Food", text: "Fruits, veggies, nuts & seeds = healthy, glowing skin." },
                      { icon: "❤️", label: "Be Kind to Yourself", text: "Healthy skin is not about perfection, it's about care." },
                      { icon: "⛱️", label: "Limit Sun Exposure", text: "Avoid the harsh sun between 10am and 4pm." },
                      { icon: "🧘", label: "Stress Less", text: "High stress can lead to skin breakouts and dullness." }
                    ].map((tip, idx) => (
                      <div 
                        key={idx} 
                        className={`skincare-card card-pastel-${idx % 6}`}
                        onClick={() => setSkincareModal({ ...tip, ...skincareDetails[tip.label] })}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="skincare-card-icon">{tip.icon}</div>
                        <h4 className="skincare-card-title">{idx + 1}. {tip.label}</h4>
                        <p className="skincare-card-text">{tip.text}</p>
                        <div className="card-click-hint">Click for more ✨</div>
                      </div>
                    ))}
                  </div>

                  <div className="skincare-bottom-row">
                    <div className="sticky-note">
                      <div className="sticky-content-wrapper" style={{ display: 'flex', gap: '2rem', width: '100%' }}>
                        <div className="checklist-column" style={{ flex: 1 }}>
                          <div className="checklist-item">
                            <div className="checklist-dot" style={{ background: 'rgba(251, 191, 36, 0.4)' }}>✓</div>
                            <span>Sunscreen</span>
                          </div>
                          <div className="checklist-item">
                            <div className="checklist-dot" style={{ background: 'rgba(59, 130, 246, 0.4)' }}>✓</div>
                            <span>Water</span>
                          </div>
                          <div className="checklist-item">
                            <div className="checklist-dot" style={{ background: 'rgba(167, 139, 250, 0.4)' }}>✓</div>
                            <span>Healthy Food</span>
                          </div>
                          <div className="checklist-item">
                            <div className="checklist-dot" style={{ background: 'rgba(52, 211, 153, 0.4)' }}>✓</div>
                            <span>Good Sleep</span>
                          </div>
                          <div className="checklist-item">
                            <div className="checklist-dot" style={{ background: 'rgba(244, 114, 182, 0.4)' }}>✓</div>
                            <span>Self Love</span>
                          </div>
                        </div>
                        
                        <div className="notes-column" style={{ flex: 1.5, borderLeft: '1px dashed rgba(0,0,0,0.1)', paddingLeft: '2rem' }}>
                          <textarea 
                            className="sticky-textarea" 
                            placeholder="Type your personal skin goals or today's notes here..."
                            spellCheck="false"
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <button 
                      className="submit-btn" 
                      onClick={() => setAdsDialog(true)}
                      style={{ height: 'auto', padding: '1rem 2.5rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #f8bbd0, #ce93d8)', color: '#4a148c', fontWeight: '900', border: 'none', boxShadow: '0 10px 25px rgba(248, 187, 208, 0.4)' }}
                    >
                      🛍️ Shop Recommended Products
                    </button>
                  </div>
                </div>
              </div>
          )}
        </>
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* Skincare Detail Modal - MOVED TO TOP LEVEL FOR BETTER POSITIONING */}
      {skincareModal && (
        <div className="modal-overlay" onClick={() => setSkincareModal(null)}>
          <div className="modal-content glass-card animate-scale-up" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSkincareModal(null)}>×</button>
            <div className="modal-header">
              <span className="modal-icon">{skincareModal.icon}</span>
              <h2>{skincareModal.label}</h2>
            </div>
            <div className="modal-body">
              <div className="modal-section">
                <h3>The Explanation</h3>
                <p>{skincareModal.more}</p>
              </div>
              <div className="modal-section">
                <h3>Expert Tip</h3>
                <p className="informative-text">{skincareModal.info}</p>
              </div>
              <div className="modal-quote">
                <span className="quote-mark">“</span>
                <p>{skincareModal.quote}</p>
                <span className="quote-mark bottom">”</span>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default App
