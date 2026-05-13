import json
import re
import time
import cloudscraper
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from xml.etree import ElementTree as ET

def extract_mod_page_data(page_url):
    scraper = cloudscraper.create_scraper()
    try:
        response = scraper.get(page_url, timeout=30, headers={
            'Referer': 'https://www.ets2world.com/'
        })
        if response.status_code != 200:
            return None, None, None
        html = response.text
    except Exception as e:
        print(f"      ⚠️ Request failed: {e}")
        return None, None, None

    soup = BeautifulSoup(html, 'html.parser')

    # 1. modsfile.com link
    download_link = None
    match = re.search(r'href=["\'](https?://modsfile\.com/[^"\']+)["\']', html, re.IGNORECASE)
    if match:
        download_link = match.group(1)
    else:
        match2 = re.search(r'https?://modsfile\.com/[^\s"\']+', html)
        if match2:
            download_link = match2.group(0)

    # 2. Image URL – from og:image
    image_url = ''
    og_image = soup.find('meta', property='og:image')
    if og_image and og_image.get('content'):
        image_url = og_image['content'].strip()
        if not image_url.startswith('http'):
            image_url = urljoin(page_url, image_url)
        print(f"      🖼️ Image: {image_url[:80]}...")
    else:
        print(f"      ⚠️ No og:image")

    # 3. Description
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

def get_all_mod_urls_from_sitemap():
    """Fetch all post URLs from sitemap.xml (or sitemap-posts.xml)"""
    base_sitemap = "https://www.ets2world.com/sitemap.xml"
    scraper = cloudscraper.create_scraper()
    try:
        resp = scraper.get(base_sitemap, timeout=30)
        if resp.status_code != 200:
            print(f"❌ Failed to fetch sitemap: {resp.status_code}")
            return []
        root = ET.fromstring(resp.content)
        # Namespace handling
        ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        # Look for sitemap index first
        sitemaps = root.findall('s:sitemap', ns)
        if sitemaps:
            # It's an index, get all sitemap URLs
            all_urls = []
            for sitemap in sitemaps:
                loc = sitemap.find('s:loc', ns).text
                print(f"📄 Processing sitemap: {loc}")
                sitemap_resp = scraper.get(loc, timeout=30)
                if sitemap_resp.status_code == 200:
                    sitemap_root = ET.fromstring(sitemap_resp.content)
                    urls = [url.text for url in sitemap_root.findall('s:url/s:loc', ns)]
                    all_urls.extend(urls)
                time.sleep(0.5)
            return all_urls
        else:
            # Direct sitemap with urls
            urls = [url.text for url in root.findall('s:url/s:loc', ns)]
            return urls
    except Exception as e:
        print(f"❌ Sitemap error: {e}")
        return []

def main():
    print("🟢 Syncing mods from ets2world.com using sitemap...")
    mod_urls = get_all_mod_urls_from_sitemap()
    print(f"📄 Found {len(mod_urls)} mod pages in sitemap")
    all_mods = []
    # Filter only URLs that look like mod posts (optional)
    mod_urls = [url for url in mod_urls if '/ets2/' in url or '/ats/' in url]
    print(f"🔍 Filtered to {len(mod_urls)} mod pages")
    for idx, url in enumerate(mod_urls, 1):
        print(f"\n🔍 [{idx}/{len(mod_urls)}] Processing: {url}")
        download_link, image_url, description = extract_mod_page_data(url)
        if not download_link:
            print(f"   ❌ No modsfile.com link found")
            continue
        # Extract title from URL or page
        title = url.split('/')[-2].replace('-', ' ').title()
        doc_id = re.sub(r'[^a-zA-Z0-9]', '_', url)[:100]
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
            'sourceUrl': url,
            'timestamp': '2026-05-14'
        })
        print(f"   ✅ Saved: {title}")
        time.sleep(0.5)  # be polite
        # Optional: limit for testing, remove for full run
        # if idx >= 500: break

    with open('mods.json', 'w', encoding='utf-8') as f:
        json.dump(all_mods, f, indent=2, ensure_ascii=False)
    print(f"\n🎉 Total saved {len(all_mods)} mods to mods.json")

if __name__ == "__main__":
    main()