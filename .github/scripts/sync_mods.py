import json
import re
import time
import cloudscraper
from xml.etree import ElementTree as ET
from urllib.parse import urljoin

def extract_mod_page_data(page_url):
    """
    Fetches the mod page and extracts:
    - modsfile.com download link
    - image URL (og:image or first img)
    - description (og:description or meta description)
    Returns tuple (download_link, image_url, description)
    """
    scraper = cloudscraper.create_scraper()
    try:
        response = scraper.get(page_url, timeout=30)
        if response.status_code != 200:
            print(f"      ⚠️ HTTP {response.status_code}")
            return None, None, None
        html = response.text
    except Exception as e:
        print(f"      ⚠️ Request failed: {e}")
        return None, None, None

    # 1. Extract modsfile.com link
    download_link = None
    match = re.search(r'href=["\'](https?://modsfile\.com/[^"\']+)["\']', html, re.IGNORECASE)
    if match:
        download_link = match.group(1)
    else:
        match2 = re.search(r'https?://modsfile\.com/[^\s"\']+', html)
        if match2:
            download_link = match2.group(0)

    # 2. Extract image URL
    image_url = ''
    # Try og:image
    og_match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if og_match:
        image_url = og_match.group(1)
    else:
        # Try first img tag
        img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if img_match:
            img_src = img_match.group(1)
            if img_src.startswith('http'):
                image_url = img_src
            else:
                image_url = urljoin(page_url, img_src)

    # 3. Extract description
    description = ''
    # Try og:description
    og_desc = re.search(r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if og_desc:
        description = og_desc.group(1)
    else:
        # Try meta name="description"
        meta_desc = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if meta_desc:
            description = meta_desc.group(1)
    # Clean HTML tags if any remain
    description = re.sub(r'<[^>]+>', '', description).strip()
    # Truncate to 500 chars
    if len(description) > 500:
        description = description[:497] + '...'

    return download_link, image_url, description

def main():
    print("🟢 Syncing mods from ets2world.com RSS feed with images & descriptions...")
    base_feed_url = "https://www.ets2world.com/feed/"
    page = 1
    all_mods = []
    scraper = cloudscraper.create_scraper()
    
    while True:
        feed_url = f"{base_feed_url}?paged={page}"
        print(f"📄 Fetching page {page}: {feed_url}")
        try:
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
                download_link, image_url, description = extract_mod_page_data(link)
                if not download_link:
                    print(f"   ❌ No modsfile.com link found")
                    continue
                print(f"   ✅ Found download link: {download_link}")
                if image_url:
                    print(f"   🖼️ Image: {image_url[:80]}...")
                if description:
                    print(f"   📝 Description: {description[:60]}...")
                doc_id = re.sub(r'[^a-zA-Z0-9]', '_', link)[:100]
                all_mods.append({
                    'id': doc_id,
                    'name': title,
                    'category': 'ETS2 Mod',
                    'gameVersion': '1.59',
                    'author': 'ETS2World',
                    'downloadUrl': download_link,
                    'modsfileUrl': download_link,
                    'imageUrl': image_url,
                    'description': description,
                    'sourceUrl': link,
                    'timestamp': '2026-05-14'
                })
            page += 1
            time.sleep(0.5)  # Small delay to be polite
        except Exception as e:
            print(f"❌ Error on page {page}: {e}")
            break
    
    with open('mods.json', 'w', encoding='utf-8') as f:
        json.dump(all_mods, f, indent=2, ensure_ascii=False)
    print(f"🎉 Total saved {len(all_mods)} mods with images and descriptions to mods.json")

if __name__ == "__main__":
    main()