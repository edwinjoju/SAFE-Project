# ==========================================
# SKINCARE MODULE
# ==========================================
# Weather-aware skincare recommendations
# based on UV, humidity, AQI, and temperature.
# ==========================================


def get_skincare_tips(temp: float, humidity: int, uv: float, aqi: int) -> list[dict]:
    """Return a list of skincare tip dicts for the given weather conditions.
    
    Each tip has:
        icon  – emoji for UI
        label – short category name
        text  – actionable advice
    """
    tips = []

    # ----- UV / Sunscreen -----
    if uv > 8:
        tips.append({
            "icon": "🧴",
            "label": "Sunscreen",
            "text": "UV is extreme — apply SPF 50+ and reapply every 90 min. Wear a hat & sunglasses."
        })
    elif uv > 5:
        tips.append({
            "icon": "🧴",
            "label": "Sunscreen",
            "text": "High UV — SPF 30+ is a must. Don't skip your ears and neck."
        })
    elif uv > 2:
        tips.append({
            "icon": "🧴",
            "label": "Sunscreen",
            "text": "Moderate UV — a light SPF 15-30 will keep you covered."
        })

    # ----- Humidity / Moisturizer -----
    if humidity >= 80:
        tips.append({
            "icon": "💧",
            "label": "Hydration",
            "text": "Super humid — use a light, water-based moisturizer. Skip heavy creams to avoid clogged pores."
        })
    elif humidity >= 60:
        tips.append({
            "icon": "💧",
            "label": "Hydration",
            "text": "Mildly humid — a gel moisturizer works great without feeling greasy."
        })
    elif humidity < 30:
        tips.append({
            "icon": "💧",
            "label": "Hydration",
            "text": "Very dry air — go for a rich, ceramide-based moisturizer to lock in hydration."
        })

    # ----- Air Quality / Skin Protection -----
    if aqi >= 80:
        tips.append({
            "icon": "🛡️",
            "label": "Pollution Shield",
            "text": "Air quality is terrible — use an antioxidant serum (Vitamin C) as a barrier. Cleanse thoroughly tonight."
        })
    elif aqi >= 60:
        tips.append({
            "icon": "🛡️",
            "label": "Pollution Shield",
            "text": "Poor air — a niacinamide serum can help protect your skin barrier from pollution damage."
        })

    # ----- Heat / Sweat -----
    if temp >= 38:
        tips.append({
            "icon": "🔥",
            "label": "Heat Care",
            "text": "Scorching — expect heavy sweating. Carry blotting sheets and avoid heavy makeup."
        })
    elif temp >= 32:
        tips.append({
            "icon": "🔥",
            "label": "Heat Care",
            "text": "Hot out — use mattifying primer if wearing makeup. Stay in shade when possible."
        })

    # Fallback: if weather is gentle
    if not tips:
        tips.append({
            "icon": "✨",
            "label": "Looking Good",
            "text": "Weather's kind to your skin today — just your regular routine is fine!"
        })

    return tips
