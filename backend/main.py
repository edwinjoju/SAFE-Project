from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from weather import (
    fetch_weather,
    fetch_air_quality,
    search_city_results,
    find_best_commute,
)
import asyncio
import math
from datetime import datetime
from ai_assistant import get_full_commute_analysis, get_ai_skincare_tips, get_api_usage


def get_moon_phase(year: int, month: int, day: int) -> dict:
    """Calculate the moon phase for a given date using Conway's algorithm.
    Returns a dict with phase name, illumination percentage, and icon."""
    # Normalize to a known new-moon epoch (Jan 6, 2000)
    from datetime import date as _date
    diff = (_date(year, month, day) - _date(2000, 1, 6)).days
    lunation = 29.53058867
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
# CITY SEARCH
# ==========================================
@app.get("/search-city")
async def search_city(name: str):
    """Return up to 5 geocoding matches so the user can pick the right city."""
    matches = await search_city_results(name)
    return {"results": matches}

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
        fetch_weather(lat, lon),
        fetch_air_quality(lat, lon)
    )

    # Use current system hour to approximate current conditions from the hourly array
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
    h_data = weather_data.get("hourly", {})
    temp_list = h_data.get("temperature_2m", [0]*24)
    hum_list = h_data.get("relative_humidity_2m", [0]*24)
    uv_list = h_data.get("uv_index", [0]*24)
    press_list = h_data.get("surface_pressure", [0]*24)
    precip_list = h_data.get("precipitation_probability", [0]*24)
    wind_list = h_data.get("wind_speed_10m", [0]*24)
    code_list = h_data.get("weathercode", [0]*24)
    dewpoint_list = h_data.get("dewpoint_2m", [0]*24)
    visibility_list = h_data.get("visibility", [0]*24)
    feels_list = h_data.get("apparent_temperature", [0]*24)
    aqi_list = aqi_data.get("hourly", {}).get("european_aqi", [1]*24)

    # Ensure index is safe
    idx = min(current_hour, len(temp_list) - 1)
    
    code = code_list[idx]
    condition_text, condition_icon = wmo_codes.get(code, ("Unknown", "❓"))

    temp = temp_list[idx]
    humidity = hum_list[idx]
    uv = uv_list[idx]
    pressure = press_list[idx]
    precip = precip_list[idx]
    wind = wind_list[idx]
    dew_point = dewpoint_list[idx]
    visibility_m = visibility_list[idx]
    feels_like = feels_list[idx]
    aqi = aqi_list[idx] or 1

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
# COMMUTE PLANNER
# ==========================================
@app.get("/plan-trip")
async def plan_trip(lat: float, lon: float, city_name: str, travel_time: int, travel_day: int = 0):
    # Fetch external data
    weather_data = await fetch_weather(lat, lon)
    aqi_data = await fetch_air_quality(lat, lon)

    # Analyze commute
    best, target, opts = find_best_commute(travel_time, travel_day, weather_data, aqi_data)
    
    # Generate advice messages and skincare tips in a single optimized call
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
    }
