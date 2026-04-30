import httpx


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
# 1. THE BRAIN (Risk Scoring Engine)
# ==========================================

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
# 2. SMART COMMUTE ADVISOR LOGIC
# ==========================================

def find_best_commute(target_time: int, target_day: int, weather_data, aqi_data):
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
        
        # Scoring system: LOW=0, MEDIUM=1, HIGH=2. 
        # Temp is added as a decimal tie-breaker (cooler is better)
        severity = 0
        if result["level"] == "MEDIUM": severity = 1
        elif result["level"] == "HIGH": severity = 2
        
        score = severity + (temp / 100.0)
        
        wind = weather_data.get("hourly", {}).get("wind_speed_10m", [0]*48)[idx]
        precip = weather_data.get("hourly", {}).get("precipitation_probability", [0]*48)[idx]

        options.append({
            "hour": i,
            "level": result["level"],
            "details": ", ".join(result["details"]),
            "score": score,
            "severity": severity,
            "temp": temp,
            "humidity": humidity,
            "uv": uv,
            "aqi": aqi,
            "wind": wind,
            "precip_prob": precip
        })
        
    # Find the data for the exact hour they originally wanted
    target_option = next(opt for opt in options if opt["hour"] == target_time)
    
    # Sort options from best to worst to find the absolute best
    options.sort(key=lambda x: x["score"])
    absolute_best = options[0]
    
    # Is it worth changing their schedule?
    # Only suggest a change if the Risk Level drops OR it's at least 3 degrees cooler
    is_worth_changing = False
    if absolute_best["severity"] < target_option["severity"]:
        is_worth_changing = True
    elif (target_option["temp"] - absolute_best["temp"]) >= 3.0:
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
    else:  # inbound
        if best["hour"] != target["hour"]:
            if best["level"] == "HIGH":
                return (
                    f"⚠️ The heat's relentless — your {format_hour(original_hour)} return means "
                    f"{target['details'].lower()}. Heading back at "
                    f"{format_hour(best['hour'])} would be a bit easier "
                    f"({best['details'].lower()}), but arrange a ride if you can."
                )
            else:
                return (
                    f"Heading back at {format_hour(original_hour)} won't be ideal — "
                    f"{target['details'].lower()}. Shifting to "
                    f"{format_hour(best['hour'])} would make the trip home more comfortable "
                    f"({best['details'].lower()})."
                )
        elif best["level"] == "HIGH":
            return (
                f"⚠️ The evening heat is no joke — it's rough across the board "
                f"({best['details'].lower()}). Stay in a bit longer or arrange a ride if possible."
            )
        else:
            return (
                f"Good news — {format_hour(original_hour)} is the best window to head back. "
                f"Expect {best['details'].lower()}. Safe travels!"
            )


# ==========================================
# 3. API FETCHING
# ==========================================

async def fetch_weather(lat: float, lon: float) -> dict:
    """Fetch hourly weather forecast from Open-Meteo."""
    async with httpx.AsyncClient() as client:
        weather_url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}"
            f"&hourly=temperature_2m,relative_humidity_2m,uv_index,surface_pressure,precipitation_probability,weathercode,wind_speed_10m,dewpoint_2m,visibility,apparent_temperature"
            f"&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset"
            f"&forecast_days=2&timezone=auto"
        )
        resp = await client.get(weather_url)
        return resp.json()


async def fetch_air_quality(lat: float, lon: float) -> dict:
    """Fetch hourly air quality data from Open-Meteo."""
    async with httpx.AsyncClient() as client:
        aqi_url = (
            f"https://air-quality-api.open-meteo.com/v1/air-quality?"
            f"latitude={lat}&longitude={lon}"
            f"&hourly=european_aqi"
            f"&forecast_days=2&timezone=auto"
        )
        resp = await client.get(aqi_url)
        return resp.json()


async def search_city_results(name: str) -> list:
    """Return up to 5 geocoding matches for a city name."""
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
