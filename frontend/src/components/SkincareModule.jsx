import React, { useState } from 'react';
import './SkincareModule.css';

// ── Season definitions ────────────────────────────────────
const SEASONS = [
  { id: 'summer',  label: 'Summer',  icon: '☀️',  gradient: 'linear-gradient(135deg,#ff9a3c,#ffcd3c)', glow: '#ffcd3c' },
  { id: 'monsoon', label: 'Monsoon', icon: '🌧️', gradient: 'linear-gradient(135deg,#4fc3f7,#1565c0)', glow: '#4fc3f7' },
  { id: 'winter',  label: 'Winter',  icon: '❄️',  gradient: 'linear-gradient(135deg,#b3e5fc,#7986cb)', glow: '#b3e5fc' },
];

const SEASON_TIPS = {
  summer: [
    { icon: '☀️', label: 'Wear Sunscreen Daily',     text: 'SPF 30+ is your skin\'s BFF.' },
    { icon: '💧', label: 'Stay Hydrated',             text: 'Drink lots of water, glowing skin starts from within.' },
    { icon: '🧴', label: 'Keep it Light',             text: 'Use lightweight, non-comedogenic products.' },
    { icon: '🧼', label: 'Cleanse Gently',            text: 'Sweat, dirt & oil can clog pores. Cleanse twice a day.' },
    { icon: '🌸', label: 'Moisturize Always',         text: 'Even in summer, hydration keeps your skin barrier happy.' },
    { icon: '🕶️', label: 'Protect Your Eyes',        text: 'Wear hats, sunglasses & seek shade when possible.' },
    { icon: '🍊', label: "Don't Skip Antioxidants",  text: 'Vitamin C helps fight sun damage & brighten skin.' },
    { icon: '🌙', label: 'Night Care Matters',        text: 'Repair & refresh your skin while you sleep.' },
    { icon: '🥗', label: 'Eat Skin Loving Food',      text: 'Fruits, veggies, nuts & seeds = healthy, glowing skin.' },
    { icon: '❤️', label: 'Be Kind to Yourself',      text: 'Healthy skin is not about perfection, it\'s about care.' },
    { icon: '⛱️', label: 'Limit Sun Exposure',       text: 'Avoid the harsh sun between 10am and 4pm.' },
    { icon: '🧘', label: 'Stress Less',               text: 'High stress can lead to skin breakouts and dullness.' },
  ],
  monsoon: [
    { icon: '🫧', label: 'Double Cleanse Daily',      text: 'Humidity breeds bacteria. Cleanse morning and night.' },
    { icon: '🌿', label: 'Use Antifungal Products',   text: 'Monsoon humidity can trigger fungal infections.' },
    { icon: '🧴', label: 'Lightweight Moisturizer',   text: 'Switch to gel-based moisturizer to prevent breakouts.' },
    { icon: '☂️', label: 'Keep Skin Dry',             text: 'Pat skin dry after rain contact to avoid infections.' },
    { icon: '💊', label: 'Take Vitamin C',            text: 'Boost immunity and skin glow with antioxidants.' },
    { icon: '🚿', label: 'Shower After Rain',         text: 'Rainwater carries pollutants — rinse off after exposure.' },
    { icon: '🍵', label: 'Hydrate with Herbal Teas',  text: 'Warm teas flush toxins and support skin clarity.' },
    { icon: '🧼', label: 'Exfoliate Weekly',          text: 'Remove dead skin buildup caused by humidity.' },
    { icon: '👁️', label: 'Watch for Infections',      text: 'Eye and skin infections spike during monsoon.' },
    { icon: '💧', label: 'Use Toner',                 text: 'Toner balances pH and tightens pores opened by heat.' },
    { icon: '🌱', label: 'Go Minimal Makeup',         text: 'Heavy makeup + humidity = clogged pores and breakouts.' },
    { icon: '🛌', label: 'Sleep Hygiene',             text: 'Change pillowcases frequently — they trap monsoon humidity.' },
  ],
  winter: [
    { icon: '🧴', label: 'Rich Moisturizer',          text: 'Cold air strips skin moisture. Use heavier creams.' },
    { icon: '💋', label: 'Don\'t Forget Lips',        text: 'Apply lip balm throughout the day to prevent chapping.' },
    { icon: '🫱', label: 'Moisturize Hands',          text: 'Hands dry out fastest in cold. Apply cream after washing.' },
    { icon: '☀️', label: 'Sunscreen Still Matters',   text: 'UV rays persist in winter — SPF 30 is still required.' },
    { icon: '🚿', label: 'Lukewarm Showers Only',     text: 'Hot showers strip your natural oils. Keep it lukewarm.' },
    { icon: '💧', label: 'Hydrate More',              text: 'Cold air dehydrates from within. Drink warm water often.' },
    { icon: '🛢️', label: 'Use Face Oil at Night',    text: 'Face oils seal in moisture overnight during dry winters.' },
    { icon: '🧣', label: 'Cover Up Outdoors',         text: 'Protect skin from cold wind with scarves and gloves.' },
    { icon: '🌫️', label: 'Manage Indoor Heating',    text: 'Heaters dry indoor air — use a humidifier if possible.' },
    { icon: '🥑', label: 'Eat Healthy Fats',          text: 'Avocado, nuts & olive oil support skin\'s lipid barrier.' },
    { icon: '🍵', label: 'Warm Teas & Soups',         text: 'Internal hydration shows on your skin surface.' },
    { icon: '🌙', label: 'Overnight Masks',           text: 'Sleeping masks lock in maximum moisture on cold nights.' },
  ],
};

const SEASON_DETAILS = {
  // Summer
  'Wear Sunscreen Daily':    { more: 'Sunscreen blocks 90% of skin aging and cancer risk.', info: 'Look for Broad Spectrum SPF 50+. Reapply every 2 hours outdoors.', quote: 'Your future self will thank you for the SPF you wear today.' },
  'Stay Hydrated':           { more: 'Water flushes toxins and maintains skin elasticity.', info: 'Infuse water with cucumber or mint for an antioxidant boost.', quote: 'Invest in your skin. It is going to represent you for a long time.' },
  'Keep it Light':           { more: 'Heavy creams trap sweat and cause breakouts in heat.', info: 'Choose Hyaluronic Acid or Glycerin-based gels.', quote: 'Simplicity is the ultimate sophistication in skincare.' },
  'Cleanse Gently':          { more: 'Over-washing strips natural oils and damages your barrier.', info: 'Try double cleansing after sunscreen days.', quote: 'Clean skin is the best canvas for a healthy glow.' },
  'Moisturize Always':       { more: 'Even oily skin needs moisture — skipping it makes things worse.', info: 'Apply while skin is still damp for maximum absorption.', quote: 'Hydrated skin is happy skin.' },
  'Protect Your Eyes':       { more: 'Eye skin is the thinnest and first to show UV damage.', info: 'UV400 sunglasses + wide hat between 10 AM - 4 PM.', quote: 'The eyes are the windows to the soul; keep the frames looking fresh.' },
  "Don't Skip Antioxidants": { more: 'Vitamin C shields skin from environmental free radicals.', info: 'Apply Vitamin C serum before sunscreen each morning.', quote: 'Glow is the essence of beauty.' },
  'Night Care Matters':      { more: 'Skin repairs itself during sleep — use actives at night.', info: '7-9 hours of sleep = more collagen production.', quote: 'Sleep is the best meditation—and the best beauty treatment.' },
  'Eat Skin Loving Food':    { more: 'Omega-3s and antioxidants in food fight skin inflammation.', info: 'Berries, walnuts, spinach, and fatty fish are your allies.', quote: 'Beautiful skin starts from within.' },
  'Be Kind to Yourself':     { more: 'Stress triggers cortisol which worsens acne and eczema.', info: 'Practice 5-minute breathing or mindfulness daily.', quote: 'Beauty begins the moment you decide to be yourself.' },
  'Limit Sun Exposure':      { more: 'Prolonged sun exposure damages skin even with sunscreen.', info: 'Seek shade and wear long sleeves during peak hours.', quote: 'A sun-kissed look is nice, but sun-safe skin is forever.' },
  'Stress Less':             { more: 'Cortisol increases oil and breaks down collagen over time.', info: 'Try 4-7-8 breathing: in 4s, hold 7s, out 8s.', quote: 'Peace of mind is the ultimate skincare routine.' },
  // Monsoon
  'Double Cleanse Daily':    { more: 'Humidity encourages bacterial and fungal growth on skin.', info: 'Use a micellar water first, then a gentle foam cleanser.', quote: 'Clean skin breathes — let it breathe freely.' },
  'Use Antifungal Products': { more: 'Tinea and ringworm infections spike during monsoon season.', info: 'Look for tea tree oil or climbazole in body washes.', quote: 'Prevention is always better than cure.' },
  'Lightweight Moisturizer': { more: 'Heavy creams block pores in humid conditions.', info: 'Water-gel or aloe-based formulas work best for monsoon.', quote: 'Less is more, especially in humidity.' },
  'Keep Skin Dry':           { more: 'Prolonged moisture on skin breeds bacterial infections.', info: 'Always pat completely dry — especially between toes and skin folds.', quote: 'Dry skin is happy skin in the monsoon.' },
  'Take Vitamin C':          { more: 'Immunity drops during seasonal changes — vitamin C helps.', info: 'Apply topical Vitamin C serum + eat citrus daily.', quote: 'Strong immunity shows on your skin.' },
  'Shower After Rain':       { more: 'Monsoon rain carries pollutants, acid, and bacteria.', info: 'Use a gentle body wash and shampoo after rain exposure.', quote: 'Rinse off the storm, not just the rain.' },
  'Hydrate with Herbal Teas':{ more: 'Warm liquids support gut health which is linked to clear skin.', info: 'Try green tea, tulsi, or ginger tea twice daily.', quote: 'Heal from within, glow from outside.' },
  'Exfoliate Weekly':        { more: 'Dead cells build up faster in humidity, causing dullness.', info: 'Use a gentle chemical exfoliant like lactic acid weekly.', quote: 'Renewal is the secret to radiant skin.' },
  'Watch for Infections':    { more: 'Eye infections like conjunctivitis peak in monsoon season.', info: 'Avoid touching your face and wash hands frequently.', quote: 'Vigilance is a form of self-care.' },
  'Use Toner':               { more: 'Toner tightens enlarged pores that open in heat and humidity.', info: 'Look for witch hazel or niacinamide-based toners.', quote: 'Balance is the foundation of great skin.' },
  'Go Minimal Makeup':       { more: 'Makeup mixes with sweat and clogs pores in humid weather.', info: 'Tinted moisturizer + waterproof mascara is enough.', quote: 'Your natural skin is your best accessory.' },
  'Sleep Hygiene':           { more: 'Pillowcases absorb oils and humidity and transfer it to skin.', info: 'Change pillowcases every 2-3 days during monsoon.', quote: 'Good sleep is the original beauty secret.' },
  // Winter
  'Rich Moisturizer':        { more: 'Cold air has low humidity which rapidly dehydrates skin.', info: 'Look for ceramides, shea butter, or squalane in moisturizers.', quote: 'Nourish your skin like you nourish your soul.' },
  "Don't Forget Lips":       { more: 'Lips have no sebaceous glands so they dry out fastest.', info: 'Use an SPF lip balm — UV damage still occurs in winter.', quote: 'Beautiful lips speak kind words and wear good balm.' },
  'Moisturize Hands':        { more: 'Frequent washing in winter strips hand skin of all oils.', info: 'Keep a travel-size hand cream in every bag.', quote: 'Your hands do the most work — reward them.' },
  'Sunscreen Still Matters': { more: 'UVA rays penetrate clouds and cause aging year-round.', info: 'Apply SPF 30 every morning even on overcast winter days.', quote: 'Sun protection has no off-season.' },
  'Lukewarm Showers Only':   { more: 'Hot water dissolves skin\'s natural lipid barrier rapidly.', info: 'Keep showers under 10 minutes in lukewarm water.', quote: 'Gentle habits build lasting beauty.' },
  'Hydrate More':            { more: 'Cold suppresses thirst signals but dehydration is still real.', info: 'Set hydration reminders and drink warm water.', quote: 'Water is the elixir of radiant skin, in all seasons.' },
  'Use Face Oil at Night':   { more: 'Facial oils mimic skin\'s natural sebum and seal in moisture.', info: 'Apply 2-3 drops of rosehip or marula oil after moisturizer.', quote: 'Oil is not the enemy — dryness is.' },
  'Cover Up Outdoors':       { more: 'Cold wind causes micro-tears in the skin\'s surface.', info: 'Wear scarves over your face and gloves in cold winds.', quote: 'Protect your skin as you protect your peace.' },
  'Manage Indoor Heating':   { more: 'Central heating dries indoor air to below 30% humidity.', info: 'Place a humidifier near your bed to maintain skin moisture.', quote: 'Your environment shapes your skin.' },
  'Eat Healthy Fats':        { more: 'Omega-3 fatty acids strengthen the skin\'s lipid barrier.', info: 'Add avocado, walnuts, and fatty fish to your winter diet.', quote: 'Feed your skin from the inside out.' },
  'Warm Teas & Soups':       { more: 'Internal hydration is just as important as topical hydration.', info: 'Bone broth is rich in collagen — great for winter skin.', quote: 'Warmth from within radiates outward.' },
  'Overnight Masks':         { more: 'Night is when skin is most receptive to moisture absorption.', info: 'Apply a sleeping mask 3x a week for intense winter repair.', quote: 'While you dream, let your skin restore.' },
};

const SEASON_BANNERS = {
  summer:  'SUNSHINE · GOOD HABITS · GLOWING YOU',
  monsoon: 'RAIN-PROOF · HEALTHY SKIN · MONSOON GLOW',
  winter:  'COZY SKIN · DEEP MOISTURE · WINTER RADIANCE',
};

const SEASON_CHECKLIST = {
  summer:  ['Sunscreen', 'Water', 'Healthy Food', 'Good Sleep', 'Self Love'],
  monsoon: ['Antifungal Wash', 'Light Moisturizer', 'Stay Dry', 'Vitamin C', 'Minimal Makeup'],
  winter:  ['Rich Cream', 'Lip Balm', 'Hand Cream', 'SPF Even Now', 'Face Oil'],
};

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

function SkincareModule({ selectedCity, currentWeather, skincareSearchMode, setSkincareSearchMode }) {
  const [skincareModal, setSkincareModal]   = useState(null);
  const [adsDialog, setAdsDialog]           = useState(false);
  const [selectedAdCategory, setSelectedAdCategory] = useState(null);
  const [season, setSeason]                 = useState('summer');

  if (!selectedCity || !currentWeather || skincareSearchMode) return null;

  const activeSeason = SEASONS.find(s => s.id === season);
  const tips         = SEASON_TIPS[season];
  const checklist    = SEASON_CHECKLIST[season];

  return (
    <>
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

          {/* ── Season Selector ── */}
          <div className="season-selector-wrapper">
            {SEASONS.map(s => (
              <button
                key={s.id}
                className={`season-btn ${season === s.id ? 'season-btn--active' : ''}`}
                style={season === s.id ? { background: s.gradient, boxShadow: `0 0 20px ${s.glow}55` } : {}}
                onClick={() => setSeason(s.id)}
              >
                <span className="season-btn-icon">{s.icon}</span>
                <span className="season-btn-label">{s.label}</span>
              </button>
            ))}
          </div>

          <header className="skincare-magazine-header">
            <h1>How to take care of your</h1>
            <p className="main-title">SKIN</p>
            <span className="sub-title">in the {activeSeason.label}</span>
            <div className="skincare-magazine-banner" style={{ background: activeSeason.gradient }}>
              {SEASON_BANNERS[season]}
            </div>
          </header>

          <div className="skincare-grid">
            {tips.map((tip, idx) => (
              <div
                key={idx}
                className={`skincare-card card-pastel-${idx % 6}`}
                onClick={() => setSkincareModal({ ...tip, ...(SEASON_DETAILS[tip.label] || {}) })}
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
                  {checklist.map((item, i) => (
                    <div className="checklist-item" key={i}>
                      <div className="checklist-dot" style={{ background: activeSeason.glow + '55' }}>✓</div>
                      <span>{item}</span>
                    </div>
                  ))}
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

      {/* Skincare Detail Modal */}
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
    </>
  );
}

export default SkincareModule;
