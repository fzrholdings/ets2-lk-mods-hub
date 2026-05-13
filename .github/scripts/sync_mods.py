import json
import re
import cloudscraper
from xml.etree import ElementTree as ET

def extract_modsfile_link(page_url):
    """Fetch mod page and extract the first modsfile.com link"""
    try:
        scraper = cloudscraper.create_scraper()
        response = scraper.get(page_url, timeout=30)
        if response.status_code != 200:
            print(f"      ⚠️ HTTP {response.status_code}")
            return None
        html = response.text
        # Look for any <a> tag whose href contains 'modsfile.com'
        # Using regex to catch href="..." or href='...'
        match = re.search(r'href=["\'](https?://modsfile\.com/[^"\']+)["\']', html, re.IGNORECASE)
        if match:
            return match.group(1)
        # Alternative: just find the URL anywhere in the page
        match2 = re.search(r'https?://modsfile\.com/[^\s"\']+', html)
        if match2:
            return match2.group(0)
        return None
    except Exception as e:
        print(f"      ⚠️ Exception: {e}")
        return None

def main():
    print("🟢 Syncing mods from ets2world.com RSS feed...")
    base_feed_url = "https://www.ets2world.com/feed/"
    page = 1
    total_mods = 0
    all_mods_list = []

    while True:
        feed_url = f"{base_feed_url}?paged={page}"
        print(f"📄 Fetching page {page}: {feed_url}")
        scraper = cloudscraper.create_scraper()
        response = scraper.get(feed_url, timeout=30)
        if response.status_code != 200:
            print(f"❌ Failed to fetch page {page}: HTTP {response.status_code}")
            break
        root = ET.fromstring(response.content)
        items = root.findall('.//item')
        if not items:
            print(f"📭 No more items at page {page}. Stopping.")
            break
        print(f"📄 Found {len(items)} mods on page {page}")
        for item in items:
            title = item.find('title').text if item.find('title') is not None else "No title"
            link = item.find('link').text if item.find('link') is not None else ""
            print(f"🔍 Processing: {title}")
            download_link = extract_modsfile_link(link)
            if not download_link:
                print(f"   ❌ No modsfile.com link found")
                continue
            print(f"   ✅ Found: {download_link}")
            description = item.find('description').text if item.find('description') is not None else ""
            description_clean = re.sub(r'<[^>]+>', '', description)[:300]
            doc_id = re.sub(r'[^a-zA-Z0-9]', '_', link)[:100]
            all_mods_list.append({
                'id': doc_id,
                'name': title,
                'category': 'ETS2 Mod',
                'gameVersion': '1.59',
                'author': 'ETS2World',
                'downloadUrl': download_link,
                'modsfileUrl': download_link,
                'imageUrl': '',
                'description': description_clean,
                'sourceUrl': link,
                'timestamp': '2026-05-13'
            })
            total_mods += 1
        page += 1
        # ඉතා ඉක්මනින් requests යැවීමෙන් block වීම වළක්වා ගැනීමට
        import time
        time.sleep(1)

    with open('mods.json', 'w', encoding='utf-8') as f:
        json.dump(all_mods_list, f, indent=2, ensure_ascii=False)
    print(f"🎉 Total saved {total_mods} mods from {page-1} pages to mods.json")

if __name__ == "__main__":
    main()