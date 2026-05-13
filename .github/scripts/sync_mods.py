import json
import re
import time
import cloudscraper
import xml.etree.ElementTree as ET   # 👈 THIS WAS MISSING
from bs4 import BeautifulSoup
from urllib.parse import urljoin

def extract_mod_page_data(page_url):
    """Fetch mod page and extract download link, image URL, and full description."""
    scraper = cloudscraper.create_scraper()
    try:
        response = scraper.get(page_url, timeout=30, headers={
            'Referer': 'https://www.ets2world.com/'
        })
        if response.status_code != 200:
            print(f"      ⚠️ HTTP {response.status_code}")
            return None, None, None
        html = response.text
    except Exception as e:
        print(f"      ⚠️ Request failed: {e}")
        return None, None, None

    # 1. modsfile.com link (keep your existing method)
    download_link = None
    match = re.search(r'href=["\'](https?://modsfile\.com/[^"\']+)["\']', html, re.IGNORECASE)
    if match:
        download_link = match.group(1)
    else:
        match2 = re.search(r'https?://modsfile\.com/[^\s"\']+', html)
        if match2:
            download_link = match2.group(0)

    # 2. Image URL – using BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    image_url = ''

    # Try og:image first (best option)
    og_image = soup.find('meta', property='og:image')
    if og_image and og_image.get('content'):
        image_url = og_image['content']
        print(f"      🖼️ og:image found: {image_url[:60]}...")
    else:
        # Fallback to thumbnail1 div
        thumbnail = soup.find('div', class_='thumbnail1')
        if thumbnail:
            img = thumbnail.find('img')
            if img and img.get('src'):
                image_url = img['src']
                # Make absolute URL if relative
                if not image_url.startswith('http'):
                    image_url = urljoin(page_url, image_url)
                print(f"      🖼️ thumbnail found: {image_url[:60]}...")

    # 3. Description – collect from <p> tags inside .entry-inner
    description_parts = []
    entry_inner = soup.find('div', class_='entry-inner') or soup.find('div', class_='entry')
    if entry_inner:
        for p in entry_inner.find_all('p'):
            text = p.get_text(strip=True)
            if text and len(text) > 20:
                description_parts.append(text)
    if not description_parts:
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            description_parts = [meta_desc['content']]
    description = '\n\n'.join(description_parts[:5])
    description = re.sub(r'\n{3,}', '\n\n', description)
    if len(description) > 800:
        description = description[:797] + '...'

    return download_link, image_url, description

def main():
    print("🟢 Syncing mods from ets2world.com RSS feed...")
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
            root = ET.fromstring(response.content)   # ✅ now ET is defined
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
                print(f"   ✅ Found download link: {download_link[:80]}...")
                if image_url:
                    print(f"   🖼️ Image saved")
                if description:
                    print(f"   📝 Description saved")
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
            time.sleep(0.5)   # be nice to the server
        except Exception as e:
            print(f"❌ Error on page {page}: {e}")
            break

    with open('mods.json', 'w', encoding='utf-8') as f:
        json.dump(all_mods, f, indent=2, ensure_ascii=False)
    print(f"🎉 Total saved {len(all_mods)} mods to mods.json")

if __name__ == "__main__":
    main()