import urllib.request
import re

urls = [
    'https://beminimalist.co/products/multi-vitamin-spf-50',
    'https://beminimalist.co/collections/face-moisturizer/products/vitamin-b5-10-moisturizer',
    'https://www.simpleskincare.in/products/simple-kind-to-skin-refreshing-facial-wash-150ml',
    'https://www.purplle.com/product/wishcare-hair-growth-serum-concentrate-resdensyl-anagain-caffeine-biotin-keratin-and-rice-water'
]

for url in urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
        # try standard og:image
        match = re.search(r'property="og:image" content="([^"]+)"', html)
        if match:
            print(f"{url} -> {match.group(1)}")
        else:
            # try meta name="og:image" or other variants
            match = re.search(r'content="([^"]+)" property="og:image"', html)
            if match:
                print(f"{url} -> {match.group(1)}")
            else:
                print(f"{url} -> No og:image found")
    except Exception as e:
        print(f"{url} -> Error: {e}")
