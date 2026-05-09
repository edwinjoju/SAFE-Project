from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from weather import (
    get_cached_weather,
    get_cached_air_quality,
    search_city_results,
    find_best_commute,
    reverse_geocode,
    get_cached_tomorrow_nowcast,
    get_cached_tomorrow_alerts,
)
import asyncio
import math
from datetime import datetime
from ai_assistant import get_full_commute_analysis, get_ai_skincare_tips, get_api_usage
from news_engine import get_environmental_alerts



app = FastAPI()

# Allow the React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all ports for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# ==========================================
# API STATUS
# ==========================================
@app.get("/api-status")
async def api_status():
    """Return the current Gemini API usage status."""
    return get_api_usage()


# ==========================================
# CURRENT WEATHER
# ==========================================
@app.get("/current-weather")
async def get_current_weather(lat: float, lon: float):
    weather_data, aqi_data = await asyncio.gather(
        get_cached_weather(lat, lon), 
        get_cached_air_quality(lat, lon) 
    )

    # Get local current hour from Open-Meteo's timezone-adjusted current time, fallback to server time
    current_data = weather_data.get("current", {})
    current_time_str = current_data.get("time", "")
    if current_time_str and "T" in current_time_str:
        current_hour = int(current_time_str.split("T")[1].split(":")[0])
    else:
        current_hour = datetime.now().hour
    
    # WMO Weather interpretation codes
    wmo_codes = {
        0: ("Clear sky", "☀️"),
        1: ("Mainly clear", "🌤️"),
        2: ("Partly cloudy", "⛅"),
        3: ("Overcast", "☁️"),
        45: ("Fog", "🌫️"),
        48: ("Depositing rime fog", "🌫️"),
        51: ("Light drizzle", "🌧️"),
        53: ("Moderate drizzle", "🌧️"),
        55: ("Dense drizzle", "🌧️"),
        56: ("Light freezing drizzle", "🌧️"),
        57: ("Dense freezing drizzle", "🌧️"),
        61: ("Slight rain", "🌧️"),
        63: ("Moderate rain", "🌧️"),
        65: ("Heavy rain", "🌧️"),
        66: ("Light freezing rain", "🌧️"),
        67: ("Heavy freezing rain", "🌧️"),
        71: ("Slight snow fall", "🌨️"),
        73: ("Moderate snow fall", "🌨️"),
        75: ("Heavy snow fall", "🌨️"),
        77: ("Snow grains", "🌨️"),
        80: ("Slight rain showers", "🌦️"),
        81: ("Moderate rain showers", "🌦️"),
        82: ("Violent rain showers", "⛈️"),
        85: ("Slight snow showers", "🌨️"),
        86: ("Heavy snow showers", "🌨️"),
        95: ("Thunderstorm", "⛈️"),
        96: ("Thunderstorm with slight hail", "⛈️"),
        99: ("Thunderstorm with heavy hail", "⛈️"),
    }
    
    # Get lists with defaults
    h_data = weather_data.get("hourly", {}) # extract hourly section from API
    temp_list = h_data.get("temperature_2m", [0]*24) # gets hourly temperature values
    hum_list = h_data.get("relative_humidity_2m", [0]*24) # gets hourly humidity values
    uv_list = h_data.get("uv_index", [0]*24) # gets hourly UV index values
    press_list = h_data.get("surface_pressure", [0]*24) # gets hourly pressure values
    precip_list = h_data.get("precipitation_probability", [0]*24) # gets hourly rain chance values
    wind_list = h_data.get("wind_speed_10m", [0]*24) # gets hourly wind speed values
    code_list = h_data.get("weathercode", [0]*24) # gets hourly weather condition code values
    dewpoint_list = h_data.get("dewpoint_2m", [0]*24) # gets hourly dew point values
    visibility_list = h_data.get("visibility", [0]*24) # gets hourly visibility values
    feels_list = h_data.get("apparent_temperature", [0]*24) # gets hourly feels like values
    aqi_list = aqi_data.get("hourly", {}).get("european_aqi", [1]*24) # gets hourly AQI values

    # Ensure index is safe
    idx = min(current_hour, len(temp_list) - 1) if len(temp_list) > 0 else 0
    
    # Prioritize 'current' data for exact real-time accuracy, fallback to 'hourly' forecast
    code = current_data.get("weather_code", code_list[idx] if len(code_list) > idx else 0)
    condition_text, condition_icon = wmo_codes.get(code, ("Unknown", "❓"))

    temp = current_data.get("temperature_2m", temp_list[idx] if len(temp_list) > idx else 0)
    humidity = current_data.get("relative_humidity_2m", hum_list[idx] if len(hum_list) > idx else 0)
    wind = current_data.get("wind_speed_10m", wind_list[idx] if len(wind_list) > idx else 0)
    feels_like = current_data.get("apparent_temperature", feels_list[idx] if len(feels_list) > idx else 0)
    pressure = current_data.get("surface_pressure", press_list[idx] if len(press_list) > idx else 0)
    
    # Hourly-only fields
    uv = uv_list[idx] if len(uv_list) > idx else 0
    precip = precip_list[idx] if len(precip_list) > idx else 0
    dew_point = dewpoint_list[idx] if len(dewpoint_list) > idx else 0
    visibility_m = visibility_list[idx] if len(visibility_list) > idx else 0
    aqi = aqi_list[idx] if len(aqi_list) > idx else 1
    if aqi is None: aqi = 1

    # Daily data
    daily = weather_data.get("daily", {})
    sunrise = daily.get("sunrise", [None])[0]  # ISO-8601 string like "2026-04-28T05:52"
    sunset = daily.get("sunset", [None])[0]

    # Moon phase
    now = datetime.now()
    moon = get_moon_phase(now.year, now.month, now.day)

    skincare_tips = await get_ai_skincare_tips(temp, humidity, uv, aqi)

    return {
        "current": {
            "temp": temp,
            "humidity": humidity,
            "uv": uv,
            "aqi": aqi,
            "pressure": pressure,
            "precip_prob": precip,
            "wind": wind,
            "condition_text": condition_text,
            "condition_icon": condition_icon,
            "high": daily.get("temperature_2m_max", [None])[0],
            "low": daily.get("temperature_2m_min", [None])[0],
            "dew_point": dew_point,
            "visibility": visibility_m,
            "feels_like": feels_like,
            "sunrise": sunrise,
            "sunset": sunset,
            "moon_phase": moon["name"],
            "moon_icon": moon["icon"],
            "moon_illumination": moon["illumination"],
            "local_hour": current_hour,
        },
        "skincare": skincare_tips,
        "forecast": [
            {
                "temp": t,
                "uv": u,
                "humidity": h,
                "precip": p
            }
            for t, u, h, p in zip(
                weather_data["hourly"]["temperature_2m"][:48],
                weather_data["hourly"]["uv_index"][:48],
                weather_data["hourly"]["relative_humidity_2m"][:48],
                weather_data["hourly"]["precipitation_probability"][:48]
            )
        ]
    }

# ==========================================
# MOON PHASE
# ==========================================

def get_moon_phase(year: int, month: int, day: int) -> dict:
    """Calculate the moon phase for a given date using Conway's algorithm.
    Returns a dict with phase name, illumination percentage, and icon."""
    # Normalize to a known new-moon epoch (Jan 6, 2000)

    from datetime import date as _date
    diff = (_date(year, month, day) - _date(2000, 1, 6)).days
    lunation = 29.53058867 # every time a fullmoon appears
    phase_day = diff % lunation
    phase_pct = phase_day / lunation  # 0.0 to 1.0 through the cycle
    illumination = round((1 - math.cos(2 * math.pi * phase_pct)) / 2 * 100)

    if phase_pct < 0.0339:    name, icon = "New Moon", "🌑"
    elif phase_pct < 0.2161:  name, icon = "Waxing Crescent", "🌒"
    elif phase_pct < 0.2839:  name, icon = "First Quarter", "🌓"
    elif phase_pct < 0.4661:  name, icon = "Waxing Gibbous", "🌔"
    elif phase_pct < 0.5339:  name, icon = "Full Moon", "🌕"
    elif phase_pct < 0.7161:  name, icon = "Waning Gibbous", "🌖"
    elif phase_pct < 0.7839:  name, icon = "Last Quarter", "🌗"
    elif phase_pct < 0.9661:  name, icon = "Waning Crescent", "🌘"
    else:                     name, icon = "New Moon", "🌑"

    return {"name": name, "icon": icon, "illumination": illumination}

# ==========================================
# CITY SEARCH
# ==========================================
@app.get("/search-city")
async def search_city(name: str):
    """Return up to 5 geocoding matches so the user can pick the right city."""
    matches = await search_city_results(name)
    return {"results": matches}


@app.get("/reverse-geocode")
async def get_geo_name(lat: float, lon: float):
    """Convert coordinates into a friendly city name."""
    return await reverse_geocode(lat, lon)


# ==========================================
# COMMUTE PLANNER
# ==========================================
@app.get("/plan-trip")
async def plan_trip(lat: float, lon: float, city_name: str, travel_time: int, travel_day: int = 0):
    # Fetch Open-Meteo data (always — no quota cost)
    weather_data, aqi_data = await asyncio.gather(
        get_cached_weather(lat, lon),
        get_cached_air_quality(lat, lon)
    )

    # Fetch Tomorrow.io data selectively:
    # Only call if it's TODAY and the travel hour is within the next 3 hours
    # (nowcasting is irrelevant for tomorrow or hours far in the future)
    current_hour = datetime.now().hour
    nowcast = None
    alerts = []
    use_nowcast = (travel_day == 0 and abs(travel_time - current_hour) <= 3)

    if use_nowcast:
        nowcast, alerts = await asyncio.gather(
            get_cached_tomorrow_nowcast(lat, lon),
            get_cached_tomorrow_alerts(lat, lon)
        )

    # Analyze commute — pass nowcast for enriched scoring
    best, target, opts = find_best_commute(travel_time, travel_day, weather_data, aqi_data, nowcast=nowcast)
    
    # Generate advice messages and skincare tips 
    analysis = await get_full_commute_analysis(
        best=best,
        target=target,
        hour=travel_time,
        weather={
            "temp": best["temp"],
            "humidity": best["humidity"],
            "uv": best["uv"],
            "aqi": best["aqi"],
        }
    )

    return {
        "city": city_name,
        "advice": analysis.get("advice", ""),
        "comparison": opts,
        "skincare": analysis.get("skincare", []),
        # Tomorrow.io extras
        "nowcast": {
            "available": nowcast.get("available", False) if nowcast else False,
            "is_raining_now": nowcast.get("is_raining_now", False) if nowcast else False,
            "current_intensity": nowcast.get("current_intensity", 0.0) if nowcast else 0.0,
            "peak_intensity_30min": nowcast.get("peak_intensity_30min", 0.0) if nowcast else 0.0,
            "timeline": nowcast.get("timeline", []) if nowcast else [],
        },
        "alerts": alerts,
    }


# ==========================================
# RAIN NOW (Tomorrow.io Nowcast Sparkline)
# ==========================================
@app.get("/rain-now")
async def rain_now(lat: float, lon: float):
    """Return the minute-by-minute rain nowcast for the next 60 minutes.
    Used by the frontend to render the rain sparkline chart.
    Returns the Tomorrow.io nowcast payload directly (with graceful fallback).
    """
    nowcast = await get_cached_tomorrow_nowcast(lat, lon)
    return nowcast
# ==========================================
# ENVIRONMENTAL NEWS INTELLIGENCE
# ==========================================
@app.get("/environmental-news")
async def environmental_news(lat: float, lon: float, city: str):
    """Return AI-processed environmental alerts based on current weather + local news."""
    # Get current weather snapshot to build smart queries
    weather_data, aqi_data = await asyncio.gather(
        get_cached_weather(lat, lon),
        get_cached_air_quality(lat, lon)
    )

    # Extract a flat snapshot for the query builder
    h_data  = weather_data.get("hourly", {})
    idx     = min(datetime.now().hour, 23)
    aqi_list = aqi_data.get("hourly", {}).get("european_aqi", [30] * 24)

    weather_snapshot = {
        "city":        city,
        "temp":        h_data.get("temperature_2m",           [20]*24)[idx],
        "humidity":    h_data.get("relative_humidity_2m",     [50]*24)[idx],
        "uv":          h_data.get("uv_index",                 [3]*24)[idx],
        "aqi":         aqi_list[idx] if aqi_list[idx] is not None else 30,
        "precip_prob": h_data.get("precipitation_probability",[0]*24)[idx],
        "wind":        h_data.get("wind_speed_10m",           [0]*24)[idx],
    }

    response_data = await get_environmental_alerts(city=city, weather_snapshot=weather_snapshot)
    return response_data
