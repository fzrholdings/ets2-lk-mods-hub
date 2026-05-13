import json
import re
import cloudscraper
from xml.etree import ElementTree as ET

def get_download_link(mod_page_url):
    """Fetch mod page and extract modsfile.com link using cloudscraper"""
    try:
        scraper = cloudscraper.create_scraper()
        response = scraper.get(mod_page_url, timeout=30)
        if response.status_code != 200:
            return None
        html = response.text
        # Find any link containing modsfile.com
        match = re.search(r'https?://modsfile\.com/[^\s"\']+', html)
        if match:
            return match.group(0)
    except Exception as e:
        print(f"  ⚠️ Error fetching {mod_page_url}: {e}")
    return None

def main():
    print("🟢 Syncing mods from ets2world.com RSS feed...")
    feed_url = "https://www.ets2world.com/feed/"
    scraper = cloudscraper.create_scraper()
    response = scraper.get(feed_url, timeout=30)
    if response.status_code != 200:
        print(f"❌ Failed to fetch RSS: {response.status_code}")
        return
    print("✅ RSS feed fetched successfully")
    root = ET.fromstring(response.content)
    items = root.findall('.//item')
    print(f"📄 Found {len(items)} mods")
    mods_list = []
    for item in items:
        title = item.find('title').text if item.find('title') is not None else "No title"
        link = item.find('link').text if item.find('link') is not None else ""
        print(f"🔍 Processing: {title}")
        download_link = get_download_link(link)
        if not download_link:
            print(f"  ⚠️ No modsfile.com link found for: {title}")
            continue
        print(f"  ✅ Found download link: {download_link}")
        # Clean description
        description = item.find('description').text if item.find('description') is not None else ""
        description_clean = re.sub(r'<[^>]+>', '', description)[:300]
        # Create ID from link
        doc_id = re.sub(r'[^a-zA-Z0-9]', '_', link)[:100]
        mods_list.append({
            'id': doc_id,
            'name': title,
            'downloadUrl': download_link,
            'modsfileUrl': download_link,
            'gameVersion': '1.59',
            'author': 'ETS2World',
            'imageUrl': '',
            'description': description_clean,
            'sourceUrl': link,
            'timestamp': '2026-05-13'
        })
    with open('mods.json', 'w', encoding='utf-8') as f:
        json.dump(mods_list, f, indent=2, ensure_ascii=False)
    print(f"🎉 Saved {len(mods_list)} mods with direct download links to mods.json")

if __name__ == "__main__":
    main()