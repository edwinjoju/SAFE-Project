import httpx
import os
from dotenv import load_dotenv

load_dotenv()
TOMORROW_API_KEY = os.getenv("TOMORROW_API_KEY", "")


# ==========================================
# HELPERS
# ==========================================

def format_hour(h: int) -> str:
    """Convert 24h integer (0-23) to a friendly 12-hour string like '5 PM'."""
    if h == 0:
        return "12 AM"
    elif h < 12:
        return f"{h} AM"
    elif h == 12:
        return "12 PM"
    else:
        return f"{h - 12} PM"

# ==========================================
# 1. API FETCHING
# ==========================================

import time

# In-memory caches
_weather_cache = {}
_aqi_cache = {}
_tomorrow_cache = {}
CACHE_TTL = 600 # 10 minutes

"""Fetch hourly weather forecast from Open-Meteo."""
async def fetch_weather(lat: float, lon: float) -> dict:
    async with httpx.AsyncClient() as client:
        weather_url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,surface_pressure"
            f"&hourly=temperature_2m,relative_humidity_2m,uv_index,surface_pressure,precipitation_probability,weathercode,wind_speed_10m,dewpoint_2m,visibility,apparent_temperature"
            f"&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset"
            f"&forecast_days=2&timezone=auto"
        )
        resp = await client.get(weather_url)
        return resp.json()

"""Fetch hourly AQI from Open-Meteo."""
async def fetch_air_quality(lat: float, lon: float) -> dict:
    async with httpx.AsyncClient() as client:
        aqi_url = (
            f"https://air-quality-api.open-meteo.com/v1/air-quality?"
            f"latitude={lat}&longitude={lon}"
            f"&hourly=european_aqi"
            f"&forecast_days=2&timezone=auto"
        )
        resp = await client.get(aqi_url)
        return resp.json()

async def get_cached_weather(lat: float, lon: float) -> dict:
    """Check cache before calling API. Keyed by lat/lon (rounded to 3 decimals)."""
    key = (round(lat, 3), round(lon, 3))
    now = time.time()
    if key in _weather_cache:
        data, ts = _weather_cache[key]
        if now - ts < CACHE_TTL:
            print(f"🏠 [CACHE HIT] Weather for {key}")
            return data
    print(f"☁️ [CACHE MISS] Fetching Weather for {key}...")
    data = await fetch_weather(lat, lon)
    _weather_cache[key] = (data, now)
    return data

async def get_cached_air_quality(lat: float, lon: float) -> dict:
    """Check cache before calling AQI API."""
    key = (round(lat, 3), round(lon, 3))
    now = time.time()
    if key in _aqi_cache:
        data, ts = _aqi_cache[key]
        if now - ts < CACHE_TTL:
            print(f"🌫️ [CACHE HIT] AQI for {key}")
            return data
    print(f"🏭 [CACHE MISS] Fetching AQI for {key}...")
    data = await fetch_air_quality(lat, lon)
    _aqi_cache[key] = (data, now)
    return data


# ==========================================
# TOMORROW.IO — NOWCAST & ALERTS
# ==========================================

async def fetch_tomorrow_nowcast(lat: float, lon: float) -> dict:
    """Fetch minute-by-minute precipitation nowcast for the next 60 min from Tomorrow.io.
    Returns a list of {minuteOffset, rainIntensity (mm/hr), precipitationProbability} dicts,
    plus a top-level 'is_raining_now' boolean and 'current_intensity' float.
    Falls back gracefully if the key is missing or the API errors.
    """
    if not TOMORROW_API_KEY or TOMORROW_API_KEY == "your_tomorrow_io_key_here":
        return {"available": False, "is_raining_now": False, "current_intensity": 0.0, "timeline": []}

    url = "https://api.tomorrow.io/v4/timelines"
    params = {
        "location": f"{lat},{lon}",
        "fields": ["precipitationIntensity", "precipitationProbability", "rainAccumulation"],
        "timesteps": ["1m"],
        "startTime": "now",
        "endTime": "nowPlus60m",
        "units": "metric",
        "apikey": TOMORROW_API_KEY,
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            raw = resp.json()

        intervals = (raw.get("data", {}).get("timelines", [{}])[0].get("intervals", []))

        timeline = []
        for i, interval in enumerate(intervals):
            v = interval.get("values", {})
            timeline.append({
                "minuteOffset": i,
                "rainIntensity": v.get("precipitationIntensity", 0.0),
                "precipProb": v.get("precipitationProbability", 0),
            })

        current = timeline[0] if timeline else {"rainIntensity": 0.0, "precipProb": 0}
        is_raining = current["rainIntensity"] > 0.1 or current["precipProb"] > 40

        # Peak intensity in the next 30 minutes (most relevant for commute decision)
        peak_30 = max((t["rainIntensity"] for t in timeline[:30]), default=0.0)

        print(f"🌧️ [TOMORROW] Nowcast OK — raining={is_raining}, intensity={current['rainIntensity']} mm/hr, peak_30min={peak_30}")
        return {
            "available": True,
            "is_raining_now": is_raining,
            "current_intensity": current["rainIntensity"],
            "current_precip_prob": current["precipProb"],
            "peak_intensity_30min": peak_30,
            "timeline": timeline[:60],  # Keep max 60 data points
        }

    except Exception as e:
        print(f"⚠️ [TOMORROW] Nowcast fetch failed: {e}")
        return {"available": False, "is_raining_now": False, "current_intensity": 0.0, "timeline": []}


async def fetch_tomorrow_alerts(lat: float, lon: float) -> list:
    """Fetch active severe weather alerts from Tomorrow.io.
    Returns a list of alert dicts with title, severity, description.
    Falls back to [] gracefully.
    """
    if not TOMORROW_API_KEY or TOMORROW_API_KEY == "your_tomorrow_io_key_here":
        return []

    url = "https://api.tomorrow.io/v4/events"
    params = {
        "location": f"{lat},{lon}",
        "insights": "air,fires,wind,floods",
        "buffer": 20,  # km radius
        "apikey": TOMORROW_API_KEY,
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            raw = resp.json()

        alerts = []
        for event in raw.get("data", {}).get("events", []):
            props = event.get("properties", {})
            alerts.append({
                "title": props.get("eventName", "Weather Alert"),
                "severity": props.get("severity", "Unknown"),
                "description": props.get("description", ""),
                "startTime": props.get("startTime", ""),
                "endTime": props.get("endTime", ""),
            })

        print(f"🚨 [TOMORROW] Alerts fetched — {len(alerts)} active alert(s)")
        return alerts

    except Exception as e:
        print(f"⚠️ [TOMORROW] Alerts fetch failed: {e}")
        return []


async def get_cached_tomorrow_nowcast(lat: float, lon: float) -> dict:
    """Cache wrapper for Tomorrow.io nowcast (10-min TTL)."""
    key = ("nowcast", round(lat, 3), round(lon, 3))
    now = time.time()
    if key in _tomorrow_cache:
        data, ts = _tomorrow_cache[key]
        if now - ts < CACHE_TTL:
            print(f"🌧️ [CACHE HIT] Tomorrow nowcast for {key[1:]}")
            return data
    print(f"🌧️ [CACHE MISS] Fetching Tomorrow nowcast for {key[1:]}...")
    data = await fetch_tomorrow_nowcast(lat, lon)
    _tomorrow_cache[key] = (data, now)
    return data


async def get_cached_tomorrow_alerts(lat: float, lon: float) -> list:
    """Cache wrapper for Tomorrow.io alerts (10-min TTL)."""
    key = ("alerts", round(lat, 3), round(lon, 3))
    now = time.time()
    if key in _tomorrow_cache:
        data, ts = _tomorrow_cache[key]
        if now - ts < CACHE_TTL:
            print(f"🚨 [CACHE HIT] Tomorrow alerts for {key[1:]}")
            return data
    print(f"🚨 [CACHE MISS] Fetching Tomorrow alerts for {key[1:]}...")
    data = await fetch_tomorrow_alerts(lat, lon)
    _tomorrow_cache[key] = (data, now)
    return data


"""Return up to 5 geocoding matches for a city name."""
async def search_city_results(name: str) -> list:
    async with httpx.AsyncClient() as client:
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={name}&count=5&language=en"
        geo_resp = await client.get(geo_url)
        geo_data = geo_resp.json()
    
    if "results" not in geo_data:
        return []
    
    matches = []
    for r in geo_data["results"]:
        matches.append({
            "name": r.get("name", name),
            "country": r.get("country", "Unknown"),
            "admin1": r.get("admin1", ""),  # State/Province
            "latitude": r["latitude"],
            "longitude": r["longitude"],
        })
    
    return matches

"""Reverse Geocode: Convert lat/lon into a city name using OpenStreetMap (Nominatim)."""
async def reverse_geocode(lat: float, lon: float) -> dict:
    """Convert lat/lon into a city name using multiple fallback services."""
    headers = {"User-Agent": "SAFE-Weather-App/1.0"}
    
    # SERVICE 1: Nominatim (OpenStreetMap)
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            rev_url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lon}&zoom=10"
            resp = await client.get(rev_url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                address = data.get("address", {})
                name = address.get("city") or address.get("town") or address.get("village") or address.get("suburb") or address.get("county")
                if name:
                    return {"name": name, "country": address.get("country", "")}
    except Exception as e:
        print(f"Nominatim Error: {e}")

    # SERVICE 2: BigDataCloud (Fast Fallback, no key needed for client-side/basic requests)
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            bdc_url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=en"
            resp = await client.get(bdc_url)
            if resp.status_code == 200:
                data = resp.json()
                name = data.get("city") or data.get("locality") or data.get("principalSubdivision")
                if name:
                    return {"name": name, "country": data.get("countryName", "")}
    except Exception as e:
        print(f"BigDataCloud Error: {e}")

    # Final Fallback
    return {"name": "Current Location", "country": ""}

# ==========================================
# 2. THE BRAIN (Risk Scoring Engine) - 
# ==========================================

""" ROTHFUSZ HEAT INDEX EQUATION """
def calculate_heat_index(T: float, RH: int) -> float:
    if T < 27 or RH < 40:
        return T 
        
    HI = (-8.784 
          + 1.611 * T 
          + 2.339 * RH 
          - 0.146 * T * RH 
          - 0.0123 * (T**2) 
          - 0.0164 * (RH**2) 
          + 0.00221 * (T**2) * RH 
          + 0.000725 * T * (RH**2) 
          - 0.00000358 * (T**2) * (RH**2))
    return round(HI, 1)


def calculate_risk(temp: float, humidity: int, uv: float, aqi: int):
    conditions = []
    risk_level = "LOW"
    
    feels_like = calculate_heat_index(temp, humidity)
    
    if feels_like >= 41:
        conditions.append(f"Extreme Heat! (Feels like {feels_like}°C)")
        risk_level = "HIGH"
    elif feels_like >= 32:
        if humidity < 40:
            conditions.append(f"Dry Heat! Dehydration risk (Feels like {feels_like}°C)")
        else:
            conditions.append(f"Humid Heat! Exhaustion risk (Feels like {feels_like}°C)")
        risk_level = "HIGH"
    elif feels_like >= 27:
        if humidity >= 70:
            conditions.append(f"Humid Heat (Feels like {feels_like}°C)")
        elif humidity <= 45:
            conditions.append(f"Dry Heat (Feels like {feels_like}°C)")
        else:
            conditions.append(f"Warm (Feels like {feels_like}°C)")
        risk_level = "MEDIUM"
        
    if uv > 8:
        conditions.append("Extreme UV")
        risk_level = "HIGH"
    elif uv > 5:
        conditions.append("High UV")
        if risk_level == "LOW": risk_level = "MEDIUM"
        
    if aqi >= 80:
        conditions.append("Severe Air Pollution")
        risk_level = "HIGH"
    elif aqi >= 60:
        conditions.append("Poor Air")
        if risk_level == "LOW": risk_level = "MEDIUM"
        
    if len(conditions) == 0:
        conditions.append("Pleasant")
        
    return {"level": risk_level, "details": conditions}


# ==========================================
# 3. SMART COMMUTE ADVISOR LOGIC
# ==========================================

def find_best_commute(target_time: int, target_day: int, weather_data, aqi_data, nowcast: dict = None):
    """Find the best commute window within ±1 hour of the requested time.

    Args:
        target_time:  Hour (0-23) the user wants to travel.
        target_day:   0 = today, 1 = tomorrow.
        weather_data: Open-Meteo forecast payload.
        aqi_data:     Open-Meteo AQI payload.
        nowcast:      Optional Tomorrow.io nowcast dict (only meaningful for today).
                      Keys: is_raining_now, current_intensity, peak_intensity_30min.
    """
    # Check 1 hour before, the exact hour, and 1 hour after
    offset = target_day * 24
    check_hours = [
        max(0, target_time - 1),
        target_time,
        min(23, target_time + 1)
    ]
    # Remove duplicates (e.g. if target is 0)
    check_hours = list(set(check_hours))
    check_hours.sort()
    
    options = []
    
    for i in check_hours:
        idx = i + offset
        temp = weather_data["hourly"]["temperature_2m"][idx]
        humidity = weather_data["hourly"]["relative_humidity_2m"][idx]
        uv = weather_data["hourly"]["uv_index"][idx]
        aqi = aqi_data["hourly"]["european_aqi"][idx]
        if aqi is None: aqi = 1
            
        result = calculate_risk(temp, humidity, uv, aqi)
        
        # Derive the base severity bucket
        severity = 0
        if result["level"] == "MEDIUM": severity = 1
        elif result["level"] == "HIGH": severity = 2

        wind = weather_data.get("hourly", {}).get("wind_speed_10m", [0]*48)[idx]
        precip = weather_data.get("hourly", {}).get("precipitation_probability", [0]*48)[idx]

        # ── Multi-Factor Weighted Risk Score ───────────────────────────────
        # Every factor contributes a normalised 0-N penalty.
        # Lower score = safer / more comfortable hour to travel.
        #
        # Factor                    Weight   Rationale
        # ─────────────────────────────────────────────────────────────────
        # Severity bucket           ×100     Hard gate: LOW/MED/HIGH dominates
        # Feels-like temp            ×0.10   Each extra °C of heat costs 0.10
        # UV index                   ×0.50   UV 8 → +4.0, UV 5 → +2.5
        # AQI                        ×0.05   AQI 100 → +5.0, AQI 60 → +3.0
        # Rain probability (OM)      ×0.04   50% rain → +2.0
        # High wind (>40 km/h)       ×0.10   Wind 60 → +2.0 extra penalty
        # Tomorrow.io rain intensity ×2.00   0.5mm/hr → +1.0, 5mm/hr → +10.0
        # ─────────────────────────────────────────────────────────────────

        feels_like = calculate_heat_index(temp, humidity)
        heat_penalty = max(0.0, feels_like - 20.0) * 0.10
        uv_penalty   = uv * 0.50
        aqi_penalty  = aqi * 0.05
        rain_penalty = (precip or 0) * 0.04
        wind_penalty = max(0.0, (wind or 0) - 40.0) * 0.10

        # Tomorrow.io nowcast penalty — applied to the target hour only (real-time data)
        nowcast_intensity = 0.0
        is_raining_now = False
        if nowcast and nowcast.get("available") and target_day == 0 and i == target_time:
            nowcast_intensity = nowcast.get("peak_intensity_30min", 0.0)
            is_raining_now = nowcast.get("is_raining_now", False)

        nowcast_penalty = nowcast_intensity * 2.0

        score = (severity * 100.0
                 + heat_penalty
                 + uv_penalty
                 + aqi_penalty
                 + rain_penalty
                 + wind_penalty
                 + nowcast_penalty)

        options.append({
            "hour": i,
            "level": result["level"],
            "details": ", ".join(result["details"]),
            "score": round(score, 3),
            "severity": severity,
            "temp": temp,
            "humidity": humidity,
            "uv": uv,
            "aqi": aqi,
            "wind": wind,
            "precip_prob": precip,
            # Tomorrow.io enrichment (only populated for the target hour on today)
            "rain_intensity_now": round(nowcast_intensity, 2),
            "is_raining_now": is_raining_now,
        })
        
    # Find the data for the exact hour they originally wanted
    target_option = next(opt for opt in options if opt["hour"] == target_time)
    
    # Sort options from best to worst to find the absolute best
    options.sort(key=lambda x: x["score"])
    absolute_best = options[0]
    
    # Is it worth changing their schedule?
    # Suggest a shift if:
    #   a) The risk level bucket drops (HIGH→MED, MED→LOW), OR
    #   b) The multi-factor score is meaningfully better (>5 pts difference)
    is_worth_changing = False
    if absolute_best["severity"] < target_option["severity"]:
        is_worth_changing = True
    elif (target_option["score"] - absolute_best["score"]) >= 5.0:
        is_worth_changing = True
        
    if is_worth_changing:
        best_option = absolute_best
    else:
        best_option = target_option  # Stick to the original plan!
        
    return best_option, target_option, options


def generate_commute_advice(best, target, original_hour: int, direction: str) -> str:
    """Generate a natural-language advice message for one leg of the commute.
    
    Args:
        best:           The recommended hour option dict.
        target:         The user's originally-requested hour option dict.
        original_hour:  The raw hour int the user passed in.
        direction:      Either 'outbound' or 'inbound'.
    """
    if direction == "outbound":
        if best["hour"] != target["hour"]:
            if best["level"] == "HIGH":
                return (
                    f"⚠️ It's going to be intense — your {format_hour(original_hour)} slot means "
                    f"{target['details'].lower()}. Leaving "
                    f"{'earlier' if best['hour'] < original_hour else 'later'} at "
                    f"{format_hour(best['hour'])} would take some edge off "
                    f"({best['details'].lower()}), though consider working from home if you can."
                )
            else:
                return (
                    f"Your {format_hour(original_hour)} departure looks a bit harsh — "
                    f"{target['details'].lower()}. Leaving an hour "
                    f"{'earlier' if best['hour'] < original_hour else 'later'} at "
                    f"{format_hour(best['hour'])} would be noticeably better "
                    f"({best['details'].lower()})."
                )
        elif best["level"] == "HIGH":
            return (
                f"⚠️ Heads up — it's going to be rough no matter when you leave "
                f"({best['details'].lower()}). If you can work from home, today's a good day for it."
            )
        else:
            return (
                f"You're all set! {format_hour(original_hour)} is already the sweet spot — "
                f"{best['details'].lower()}. Have a good commute!"
            )
  


