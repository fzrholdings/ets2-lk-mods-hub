import os
import json
import re
import cloudscraper
from xml.etree import ElementTree as ET

def main():
    print("🟢 Syncing mods from ets2world.com RSS feed...")
    feed_url = "https://www.ets2world.com/feed/"
    
    # Bypass Cloudflare
    scraper = cloudscraper.create_scraper()
    response = scraper.get(feed_url, timeout=30)
    
    if response.status_code != 200:
        print(f"❌ Failed to fetch RSS feed: {response.status_code}")
        return
    
    print("✅ RSS feed fetched successfully")
    
    # Parse XML
    root = ET.fromstring(response.content)
    items = root.findall('.//item')
    print(f"📄 Found {len(items)} mods")
    
    mods_list = []
    for item in items:
        title = item.find('title').text if item.find('title') is not None else "No title"
        link = item.find('link').text if item.find('link') is not None else ""
        description = item.find('description').text if item.find('description') is not None else ""
        
        # Create a simple ID from link
        doc_id = re.sub(r'[^a-zA-Z0-9]', '_', link)[:100] if link else "unknown"
        
        mods_list.append({
            'id': doc_id,
            'name': title,
            'downloadUrl': link,
            'modsfileUrl': link,
            'gameVersion': '1.59',
            'author': 'ETS2World',
            'imageUrl': '',
            'description': description[:300].replace('\n', ' '),
            'sourceUrl': link,
            'timestamp': '2026-05-13'  # static date for now
        })
        print(f"  ✅ Processed: {title}")
    
    # Save to JSON file
    with open('mods.json', 'w', encoding='utf-8') as f:
        json.dump(mods_list, f, indent=2, ensure_ascii=False)
    
    print(f"🎉 Saved {len(mods_list)} mods to mods.json")

if __name__ == "__main__":
    main()