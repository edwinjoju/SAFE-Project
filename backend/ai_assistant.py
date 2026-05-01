import os
import json
import time
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=API_KEY) if API_KEY else None

_api_calls = []

def record_api_call():
    global _api_calls
    now = time.time()
    _api_calls = [t for t in _api_calls if now - t < 60]
    _api_calls.append(now)

def get_api_usage() -> dict:
    global _api_calls
    now = time.time()
    _api_calls = [t for t in _api_calls if now - t < 60]
    used = len(_api_calls)
    limit = 15
    return {
        "used": used,
        "limit": limit,
        "remaining": max(0, limit - used)
    }

def format_hour(h: int) -> str:
    if h == 0:
        return "12 AM"
    elif h < 12:
        return f"{h} AM"
    elif h == 12:
        return "12 PM"
    else:
        return f"{h - 12} PM"

from pydantic import BaseModel, Field

class SkincareTip(BaseModel):
    icon: str = Field(description="An emoji representing the tip")
    label: str = Field(description="Short title for the tip")
    text: str = Field(description="The practical skincare advice")

class CommutePlanResponse(BaseModel):
    advice: str = Field(description="1-2 sentences advice for leaving home")
    skincare: list[SkincareTip] = Field(description="3 skincare tips for conditions")

_commute_analysis_cache = {}

async def get_full_commute_analysis(
    best: dict, target: dict, hour: int, weather: dict
) -> dict:
    """Generate commute advice and skincare tips in a single optimized Gemini API call."""
    
    # Round weather data in cache key to significantly increase cache hits and save quota
    weather_rounded = {
        "temp": round(weather.get("temp", 0), 1),
        "humidity": round(weather.get("humidity", 0) / 5) * 5, # Group by 5%
        "uv": round(weather.get("uv", 0), 1),
        "aqi": round(weather.get("aqi", 0) / 10) * 10, # Group by 10 units
    }
    
    cache_key = json.dumps({
        "b_h": best.get("hour"), "t_h": target.get("hour"), 
        "h": hour, "w": weather_rounded
    }, sort_keys=True)

    if cache_key in _commute_analysis_cache:
        return _commute_analysis_cache[cache_key]

    fallback_response = {
        "advice": "AI is disabled or an error occurred.",
        "skincare": [{"icon": "🤖", "label": "No AI", "text": "Set GEMINI_API_KEY in backend/.env"}]
    }

    if not client:
        return fallback_response

    prompt = (
        "Analyze the following commute data and generate advice and skincare tips.\n\n"
        f"--- COMMUTE DATA ---\n"
        f"Target time: {format_hour(hour)} | Conditions: {target['details']} (risk: {target['level']})\n"
        f"Best time: {format_hour(best['hour'])} | Conditions: {best['details']} (risk: {best['level']})\n"
        f"Weather: Temp: {weather['temp']}°C, Humidity: {weather['humidity']}%, UV: {weather['uv']}, AQI: {weather['aqi']}\n"
    )

    try:
        record_api_call()
        config = types.GenerateContentConfig(
            system_instruction="You are S.A.F.E, an empathetic weather and commute advisor. Provide short, engaging commute advice (max 2 sentences, no markdown) and 3 practical skincare tips.",
            response_mime_type="application/json",
            response_schema=CommutePlanResponse,
            temperature=0.7,
        )

        try:
            response = await client.aio.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt,
                config=config,
            )
        except Exception as inner_e:
            if "503" in str(inner_e) or "UNAVAILABLE" in str(inner_e) or "429" in str(inner_e):
                print(f"Model busy, falling back to gemini-flash-latest: {inner_e}")
                response = await client.aio.models.generate_content(
                    model='gemini-flash-latest',
                    contents=prompt,
                    config=config,
                )
            else:
                raise inner_e
        data = json.loads(response.text)
        _commute_analysis_cache[cache_key] = data
        return data
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return {
            "advice": "Our AI advisor is currently experiencing high traffic! Please rely on the timeline data above while we clear the queue.",
            "skincare": [
                {"icon": "💧", "label": "Hydrate", "text": "Drink plenty of water to keep your skin naturally moisturized."},
                {"icon": "🧴", "label": "Protect", "text": "Always apply SPF during the day, regardless of the weather."},
                {"icon": "🧼", "label": "Cleanse", "text": "Wash your face every evening to remove pollutants and sweat."}
            ]
        }

_current_skincare_cache = {}
AI_CACHE_TTL = 3600 # 1 hour for AI tips

async def get_ai_skincare_tips(temp: float, humidity: int, uv: float, aqi: int) -> list[dict]:
    """Cache AI tips based on rounded weather conditions."""
    
    # Rounding parameters to increase cache hits (e.g. 30.1 and 29.9 both map to 30)
    cache_key = (round(temp), humidity // 5 * 5, round(uv), aqi // 10 * 10)
    now = time.time()
    
    if cache_key in _current_skincare_cache:
        tips, ts = _current_skincare_cache[cache_key]
        if now - ts < AI_CACHE_TTL:
            print(f"🤖 [AI CACHE HIT] Skincare tips for {cache_key}")
            return tips

    if not client:
        return [{"icon": "🤖", "label": "No AI", "text": "Set GEMINI_API_KEY in backend/.env to use AI skincare."}]

    print(f"🧠 [AI CACHE MISS] Generating new tips for {cache_key}...")
    prompt = (
        f"Temperature: {temp}°C, Humidity: {humidity}%, UV Index: {uv}, European AQI: {aqi}.\n"
        f"Focus on practical advice (e.g., sunscreen, moisturizer type, pollution protection)."
    )

    class CurrentSkincareResponse(BaseModel):
        tips: list[SkincareTip] = Field(description="3 skincare tips based on current weather")

    try:
        record_api_call()
        config = types.GenerateContentConfig(
            system_instruction="You are a weather-aware skincare expert. Generate 3 short, punchy skincare tips based on the current conditions.",
            response_mime_type="application/json",
            response_schema=CurrentSkincareResponse,
        )

        try:
            response = await client.aio.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=config,
            )
        except Exception as inner_e:
            if "503" in str(inner_e) or "UNAVAILABLE" in str(inner_e) or "429" in str(inner_e):
                print(f"Model busy, falling back to gemini-2.5-flash for skincare: {inner_e}")
                response = await client.aio.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=config,
                )
            else:
                raise inner_e

        data = json.loads(response.text)
        tips = data.get("tips", [])
        _current_skincare_cache[cache_key] = (tips, now)
        return tips
    except Exception as e:
        print(f"Gemini API Error in Skincare: {e}")
        return [
            {"icon": "💧", "label": "Hydrate", "text": "Drink plenty of water to keep your skin naturally moisturized."},
            {"icon": "🧴", "label": "Protect", "text": "Always apply SPF during the day, regardless of the weather."},
            {"icon": "🧼", "label": "Cleanse", "text": "Wash your face every evening to remove pollutants and sweat."}
        ]
