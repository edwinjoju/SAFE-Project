import os
import time
import json
import httpx
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

NEWSDATA_API_KEY = os.getenv("NEWSDATA_API_KEY", "")
GNEWS_API_KEY    = os.getenv("GNEWS_API_KEY", "")

# ── Cache stores ──────────────────────────────────────────────
_news_raw_cache     = {}
_summary_cache      = {}
_sitrep_cache       = {}
NEWS_CACHE_TTL      = 600   # 10 minutes
SUMMARY_CACHE_TTL   = 1800  # 30 minutes
SITREP_CACHE_TTL    = 1800  # 30 minutes

# ── Indian city → state mapping for broader regional searches ──
CITY_STATE_MAP = {
    "thrissur": "Kerala", "kochi": "Kerala", "trivandrum": "Kerala",
    "thiruvananthapuram": "Kerala", "kozhikode": "Kerala", "kannur": "Kerala",
    "palakkad": "Kerala", "malappuram": "Kerala", "ernakulam": "Kerala",
    "hyderabad": "Telangana", "warangal": "Telangana", "secunderabad": "Telangana",
    "bengaluru": "Karnataka", "bangalore": "Karnataka", "mysuru": "Karnataka",
    "mysore": "Karnataka", "mangalore": "Karnataka", "hubli": "Karnataka",
    "chennai": "Tamil Nadu", "coimbatore": "Tamil Nadu", "madurai": "Tamil Nadu",
    "mumbai": "Maharashtra", "pune": "Maharashtra", "nagpur": "Maharashtra",
    "thane": "Maharashtra", "nashik": "Maharashtra",
    "delhi": "Delhi", "new delhi": "Delhi", "noida": "UP",
    "gurgaon": "Haryana", "gurugram": "Haryana",
    "kolkata": "West Bengal", "howrah": "West Bengal",
    "ahmedabad": "Gujarat", "surat": "Gujarat", "vadodara": "Gujarat",
    "jaipur": "Rajasthan", "udaipur": "Rajasthan", "jodhpur": "Rajasthan",
    "lucknow": "UP", "kanpur": "UP", "varanasi": "UP", "agra": "UP",
    "bhopal": "Madhya Pradesh", "indore": "Madhya Pradesh",
    "chandigarh": "Punjab", "amritsar": "Punjab", "ludhiana": "Punjab",
    "patna": "Bihar", "ranchi": "Jharkhand",
    "bhubaneswar": "Odisha", "cuttack": "Odisha",
    "guwahati": "Assam", "imphal": "Manipur", "shillong": "Meghalaya",
    "dehradun": "Uttarakhand", "shimla": "Himachal Pradesh",
    "srinagar": "Jammu and Kashmir", "jammu": "Jammu and Kashmir",
    "visakhapatnam": "Andhra Pradesh", "vijayawada": "Andhra Pradesh",
    "goa": "Goa", "panaji": "Goa",
}

def _get_state(city: str) -> str:
    """Get the Indian state for a city, or return empty string."""
    clean_city = city.split(',')[0].lower().strip()
    return CITY_STATE_MAP.get(clean_city, "")


# ══════════════════════════════════════════════════════════════
# 1.  DYNAMIC QUERY BUILDER
# ══════════════════════════════════════════════════════════════

def build_dynamic_queries(city: str, weather_snapshot: dict) -> list[str]:
    """
    Build city-specific + condition-based search queries.
    Always includes the city/state name to keep results local.
    """
    temp     = weather_snapshot.get("temp", 20)
    humidity = weather_snapshot.get("humidity", 50)
    uv       = weather_snapshot.get("uv", 3)
    aqi      = weather_snapshot.get("aqi", 30)
    precip   = weather_snapshot.get("precip_prob", 0)
    wind     = weather_snapshot.get("wind", 0)
    state    = _get_state(city)
    region   = state if state else city  # fallback to city name

    clean_city = city.split(',')[0].strip()
    state = _get_state(clean_city)
    region = state if state else clean_city

    # Simplified, high-probability queries (Avoid long strings which some APIs treat as 'AND')
    queries = [
        f"{clean_city} weather",
        f"{region} weather",
        "India weather alert",
    ]

    # Condition-specific queries (Simplified)
    if precip >= 30:
        queries.append(f"{region} rain")
        queries.append(f"{clean_city} flood")
    if temp >= 33:
        queries.append(f"{region} heat")
        queries.append(f"{clean_city} heatwave")
    if aqi >= 70:
        queries.append(f"{region} pollution")
    if temp <= 15:
        queries.append(f"{region} fog")

    # Deduplicate
    seen, unique = set(), []
    for q in queries:
        if q not in seen:
            seen.add(q)
            unique.append(q)

    return unique[:8] # Increased cap to 8 for better coverage


# ══════════════════════════════════════════════════════════════
# 2.  NEWS FETCHING
# ══════════════════════════════════════════════════════════════

def _normalize_newsdata(article: dict) -> dict:
    return {
        "title":        article.get("title", ""),
        "description":  article.get("description") or article.get("content", ""),
        "url":          article.get("link", ""),
        "source":       article.get("source_id", "Unknown"),
        "published_at": article.get("pubDate", ""),
        "image_url":    article.get("image_url", ""),
    }

def _normalize_gnews(article: dict) -> dict:
    return {
        "title":        article.get("title", ""),
        "description":  article.get("description", ""),
        "url":          article.get("url", ""),
        "source":       article.get("source", {}).get("name", "Unknown"),
        "published_at": article.get("publishedAt", ""),
        "image_url":    article.get("image", ""),
    }

async def _fetch_newsdata(query: str) -> list[dict]:
    """NewsData.io — primary source."""
    if not NEWSDATA_API_KEY or NEWSDATA_API_KEY == "your_newsdata_key_here":
        return []
    url = "https://newsdata.io/api/1/news"
    params = {
        "apikey":    NEWSDATA_API_KEY,
        "q":         query,
        "language":  "en",
        "size":      10,
        "timeframe": 48,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        if data.get("status") != "success":
            print(f"[NEWSDATA] API error for '{query}': {data}")
            return []
        articles = data.get("results", []) or []
        print(f"[NEWSDATA] '{query}' -> {len(articles)} articles")
        return [_normalize_newsdata(a) for a in articles if a.get("title")]
    except Exception as e:
        print(f"[NEWSDATA] Failed for '{query}': {e}")
        return []

async def _fetch_gnews(query: str) -> list[dict]:
    """GNews — secondary source."""
    if not GNEWS_API_KEY or GNEWS_API_KEY == "your_gnews_key_here":
        return []
    # Increase to 7 days for more volume on slow news days
    from_time = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
    url = "https://gnews.io/api/v4/search"
    params = {
        "token":  GNEWS_API_KEY,
        "q":      query,
        "lang":   "en",
        "max":    10,
        "sortby": "publishedAt",
        "from":   from_time,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        articles = data.get("articles", []) or []
        print(f"[GNEWS] '{query}' -> {len(articles)} articles")
        return [_normalize_gnews(a) for a in articles if a.get("title")]
    except Exception as e:
        print(f"[GNEWS] Failed for '{query}': {e}")
        return []


# ── Relevance check ───────────────────────────────────────────

WEATHER_KEYWORDS = {
    "flood", "heavy rain", "waterlogging", "flash flood", "urban flooding",
    "rainstorm", "monsoon", "landslide", "rainfall", "cloudburst", "thunderstorm",
    "heatwave", "heat wave", "extreme heat", "sunstroke", "dehydration",
    "hot weather", "heat advisory", "heat stroke", "scorching",
    "air pollution", "poor aqi", "smog", "hazardous air", "respiratory",
    "pollution alert", "dust storm", "wildfire smoke", "air quality",
    "cold wave", "winter storm", "fog alert", "dense fog", "snowfall",
    "freezing", "frost warning", "cold snap",
    "hospital heat", "dengue", "malaria", "heat exhaustion", "storm injur",
    "weather alert", "weather warning", "imd", "india meteorological",
    "cyclone", "storm", "tornado", "drizzle", "precipitation",
    "forecast", "weather", "rain", "sunny", "cloudy", "windy",
    "temperature", "humidity", "climate change", "met department",
    "flood relief", "rescue", "evacuation", "red alert", "orange alert",
    "yellow alert", "disaster", "calamity",
}

def _is_relevant(article: dict, city: str) -> bool:
    """Check if article is weather-relevant. Relaxed location check."""
    text = (
        (article.get("title", "") or "") + " " +
        (article.get("description", "") or "")
    ).lower()

    # 1. Must contain at least one weather keyword
    has_weather = any(kw in text for kw in WEATHER_KEYWORDS)
    if not has_weather:
        return False

    # 2. Location check: City, State, or India
    clean_city = city.split(',')[0].lower().strip()
    state = _get_state(city).lower()
    
    # If the article explicitly mentions the city or state, it's a keeper
    if clean_city in text or (state and state in text):
        return True
        
    # If it's a general India weather report, we'll take it as a fallback
    if "india" in text or "imd" in text or "met department" in text:
        return True

    return False


async def fetch_environmental_news(queries: list[str], city: str) -> list[dict]:
    """Fetch, deduplicate, filter, and return fresh environmental news."""
    # Use a simpler cache key to avoid query-order issues
    clean_city = city.split(',')[0].lower().strip()
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    cache_key = (clean_city, today_str)
    now = time.time()
    if cache_key in _news_raw_cache:
        cached, ts = _news_raw_cache[cache_key]
        if now - ts < NEWS_CACHE_TTL:
            return cached

    import asyncio as _asyncio
    tasks = []
    # Fetch all queries
    for q in queries:
        tasks.append(_fetch_newsdata(q))
        tasks.append(_fetch_gnews(q))

    # Add a guaranteed national fallback
    tasks.append(_fetch_newsdata("India weather"))
    tasks.append(_fetch_gnews("India weather"))

    results = await _asyncio.gather(*tasks, return_exceptions=True)

    all_articles: list[dict] = []
    seen_titles: set[str] = set()
    for batch in results:
        if isinstance(batch, Exception):
            continue
        for a in batch:
            key = a.get("title", "").lower()[:60]
            if key and key not in seen_titles:
                seen_titles.add(key)
                all_articles.append(a)

    # Relevance filter: must be weather + location related
    relevant = [a for a in all_articles if _is_relevant(a, city)]
    dropped = len(all_articles) - len(relevant)
    if dropped:
        print(f"[FILTER] Kept {len(relevant)}, dropped {dropped} irrelevant articles")

    print(f"[NEWS ENGINE] {len(relevant)} relevant articles for {city}")
    _news_raw_cache[cache_key] = (relevant, now)
    return relevant


# ══════════════════════════════════════════════════════════════
# 3.  RISK CLASSIFICATION
# ══════════════════════════════════════════════════════════════

_RISK_KEYWORDS = {
    "FLOOD":       ["flood", "waterlog", "inundation", "deluge", "submerge", "overflow", "drain"],
    "HEAT":        ["heatwave", "heat wave", "scorching", "dehydrat", "sunstroke", "heat stroke", "hot spell"],
    "HEALTH":      ["hospital", "respiratory", "lung", "illness", "outbreak", "disease", "health"],
    "AIR_QUALITY": ["pollution", "smog", "aqi", "air quality", "particulate", "pm2.5", "pm10", "toxic air"],
    "STORM":       ["storm", "cyclone", "typhoon", "hurricane", "thunder", "lightning", "wind speed", "gale"],
    "WINTER":      ["cold wave", "cold snap", "fog", "frost", "freeze", "snowfall", "winter storm"],
}

def classify_news_risk(article: dict) -> str:
    text = (article.get("title", "") + " " + article.get("description", "")).lower()
    for risk, keywords in _RISK_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return risk
    return "GENERAL"

def calculate_news_severity(article: dict) -> str:
    text = (article.get("title", "") + " " + article.get("description", "")).lower()
    high_words   = ["severe", "extreme", "deadly", "fatal", "catastrophic", "emergency", "crisis",
                    "red alert", "warning", "high alert", "danger", "evacuation", "deaths"]
    medium_words = ["advisory", "caution", "moderate", "disruption", "delay", "impact",
                    "concern", "risk", "reported", "expected", "forecast", "orange alert"]
    if any(w in text for w in high_words):
        return "HIGH"
    if any(w in text for w in medium_words):
        return "MEDIUM"
    return "LOW"


# ══════════════════════════════════════════════════════════════
# 4.  GEMINI ACTIONABLE SUMMARY
# ══════════════════════════════════════════════════════════════

from pydantic import BaseModel, Field

class ActionableSummary(BaseModel):
    title:           str = Field(description="Short, punchy alert title (max 8 words)")
    short_summary:   str = Field(description="One sentence describing the situation")
    risk_type:       str = Field(description="One of: FLOOD, HEAT, HEALTH, AIR_QUALITY, STORM, WINTER, GENERAL")
    severity:        str = Field(description="One of: LOW, MEDIUM, HIGH")
    commute_impact:  str = Field(description="One short actionable commute advice sentence")
    skincare_impact: str = Field(description="One short skincare recommendation sentence")
    action_plan:     str = Field(description="The single most important action the user should take")

_FALLBACK_SUMMARIES = {
    "FLOOD":       {
        "commute_impact":  "Avoid low-lying roads and waterlogged areas.",
        "skincare_impact": "Use waterproof sunscreen and cover up.",
        "action_plan":     "Avoid travel through flood-prone areas.",
    },
    "HEAT":        {
        "commute_impact":  "Travel early morning or after sunset to avoid peak heat.",
        "skincare_impact": "Apply SPF 50+ and reapply every 2 hours.",
        "action_plan":     "Stay hydrated and avoid direct sunlight.",
    },
    "AIR_QUALITY": {
        "commute_impact":  "Wear an N95 mask if commuting outdoors.",
        "skincare_impact": "Double-cleanse at night to remove pollutants.",
        "action_plan":     "Minimize outdoor exposure during peak pollution hours.",
    },
    "STORM":       {
        "commute_impact":  "Delay non-essential travel until the storm passes.",
        "skincare_impact": "Protect hair from wind damage with a serum.",
        "action_plan":     "Stay indoors and secure loose items around your home.",
    },
    "WINTER":      {
        "commute_impact":  "Allow extra travel time due to fog and slippery roads.",
        "skincare_impact": "Use a rich moisturizer and lip balm.",
        "action_plan":     "Layer up and keep a blanket in your vehicle.",
    },
    "HEALTH":      {
        "commute_impact":  "Wear a mask and carry hand sanitizer.",
        "skincare_impact": "Stay hydrated to support skin barrier health.",
        "action_plan":     "Avoid crowded public spaces if possible.",
    },
    "GENERAL":     {
        "commute_impact":  "Stay aware of local conditions before heading out.",
        "skincare_impact": "Adjust your routine based on today's weather.",
        "action_plan":     "Monitor local updates for the latest advisories.",
    },
}

async def generate_actionable_summary(article: dict, risk_type: str, severity: str) -> dict:
    """Uses Gemini to convert a raw article into a structured actionable summary."""
    url = article.get("url", "")
    if url in _summary_cache:
        cached, ts = _summary_cache[url]
        if time.time() - ts < SUMMARY_CACHE_TTL:
            return cached

    fallback = _FALLBACK_SUMMARIES.get(risk_type, _FALLBACK_SUMMARIES["GENERAL"])
    base_result = {
        "title":           article.get("title", "Environmental Alert")[:80],
        "short_summary":   article.get("description", "An environmental event has been reported.")[:200],
        "risk_type":       risk_type,
        "severity":        severity,
        "commute_impact":  fallback["commute_impact"],
        "skincare_impact": fallback["skincare_impact"],
        "action_plan":     fallback["action_plan"],
        "source":          article.get("source", ""),
        "published_at":    article.get("published_at", ""),
    }

    try:
        from google import genai
        from google.genai import types
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            _summary_cache[url] = (base_result, time.time())
            return base_result

        client = genai.Client(api_key=api_key)
        prompt = (
            f"Analyze this environmental news article and generate a structured safety alert.\n\n"
            f"Title: {article.get('title', '')}\n"
            f"Content: {article.get('description', '')[:400]}\n"
            f"Pre-classified risk: {risk_type} | Severity: {severity}\n\n"
            f"Generate concise, actionable output for a commuter/skincare safety app."
        )
        config = types.GenerateContentConfig(
            system_instruction=(
                "You are S.A.F.E, an environmental intelligence assistant. "
                "Transform news into ultra-concise safety alerts with commute and skincare impacts. "
                "Keep every field to 1 short sentence. No markdown."
            ),
            response_mime_type="application/json",
            response_schema=ActionableSummary,
            temperature=0.4,
        )
        response = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=config,
        )
        data = json.loads(response.text)
        result = {
            **data,
            "source":       article.get("source", ""),
            "published_at": article.get("published_at", ""),
        }
        _summary_cache[url] = (result, time.time())
        print(f"🧠 [GEMINI] Summary generated for: {article.get('title', '')[:50]}")
        return result

    except Exception as e:
        print(f"⚠️  [GEMINI NEWS] Failed: {e} — using fallback")
        _summary_cache[url] = (base_result, time.time())
        return base_result

async def generate_sitrep(city: str, alerts: list[dict]) -> str:
    """Generate a high-level Situation Report based on the top alerts."""
    if not alerts:
        return f"No major environmental disruptions reported for {city} today. Stay vigilant and monitor local conditions."

    cache_key = (city.lower(), datetime.utcnow().strftime("%Y-%m-%d"))
    if cache_key in _sitrep_cache:
        cached, ts = _sitrep_cache[cache_key]
        if time.time() - ts < SITREP_CACHE_TTL:
            return cached

    context = "\n".join([f"- [{a['severity']}] {a['title']} ({a['risk_type']})" for a in alerts[:5]])

    fallback_sitrep = f"Monitoring {len(alerts)} environmental alerts in {city}. Exercise caution during your daily commute."

    try:
        from google import genai
        from google.genai import types
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            return fallback_sitrep

        client = genai.Client(api_key=api_key)
        prompt = (
            f"Write a 2-3 sentence situation report for {city} based on these environmental headlines:\n"
            f"{context}\n\n"
            f"Tone: Authoritative, concise. Focus on the most critical risk and one actionable recommendation."
        )
        config = types.GenerateContentConfig(temperature=0.4)
        response = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=config,
        )
        sitrep = response.text.strip()
        _sitrep_cache[cache_key] = (sitrep, time.time())
        return sitrep
    except Exception as e:
        print(f"⚠️  [GEMINI SITREP] Failed: {e}")
        return fallback_sitrep


# ══════════════════════════════════════════════════════════════
# 5.  MAIN ORCHESTRATOR
# ══════════════════════════════════════════════════════════════

async def get_environmental_alerts(
    city: str,
    weather_snapshot: dict,
    max_alerts: int = 100,
) -> dict:
    """
    Full pipeline: build queries → fetch news → filter → classify → AI-enrich top 3.
    """
    import asyncio as _asyncio

    queries  = build_dynamic_queries(city, weather_snapshot)
    print(f"[NEWS ENGINE] Queries for {city}: {queries}")

    articles = await fetch_environmental_news(queries, city)

    if not articles:
        print(f"[NEWS ENGINE] No articles found for {city}")
        return {"sitrep": f"No environmental dispatches for {city} at this time.", "alerts": []}

    # Classify all articles
    classified = []
    for article in articles[:max_alerts]:
        risk_type = classify_news_risk(article)
        severity  = calculate_news_severity(article)
        classified.append((article, risk_type, severity))

    # Sort HIGH → MEDIUM → LOW
    severity_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    classified.sort(key=lambda x: severity_order.get(x[2], 2))

    # Build fast keyword fallbacks for ALL, AI-enrich top 3
    GEMINI_LIMIT = 3
    fast_summaries = []
    gemini_candidates = []

    for i, (article, risk_type, severity) in enumerate(classified):
        fallback = _FALLBACK_SUMMARIES.get(risk_type, _FALLBACK_SUMMARIES["GENERAL"])
        base = {
            "title":           article.get("title", "")[:120],
            "short_summary":   article.get("description") or article.get("title", "")[:200],
            "risk_type":       risk_type,
            "severity":        severity,
            "commute_impact":  fallback["commute_impact"],
            "skincare_impact": fallback["skincare_impact"],
            "action_plan":     fallback["action_plan"],
            "source":          article.get("source", ""),
            "published_at":    article.get("published_at", ""),
        }
        fast_summaries.append(base)
        if len(gemini_candidates) < GEMINI_LIMIT and severity in ("HIGH", "MEDIUM"):
            gemini_candidates.append((i, article, risk_type, severity))

    # Gemini enrichment in parallel
    if gemini_candidates:
        gemini_tasks = [
            generate_actionable_summary(art, rt, sv)
            for _, art, rt, sv in gemini_candidates
        ]
        try:
            gemini_results = await _asyncio.wait_for(
                _asyncio.gather(*gemini_tasks, return_exceptions=True),
                timeout=8.0
            )
            for (idx, _, _, _), result in zip(gemini_candidates, gemini_results):
                if not isinstance(result, Exception):
                    fast_summaries[idx] = result
        except _asyncio.TimeoutError:
            print("[NEWS ENGINE] Gemini timed out — using keyword fallbacks")

    # Generate SitRep
    sitrep = await generate_sitrep(city, fast_summaries)

    print(f"[NEWS ENGINE] {len(fast_summaries)} alerts ready for {city}")
    return {
        "sitrep": sitrep,
        "alerts": fast_summaries
    }
