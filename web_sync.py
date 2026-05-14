import os
import json
import re
import time
import cloudscraper
import requests
import threading
import logging
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from xml.etree import ElementTree as ET
from flask import Flask

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
sync_lock = threading.Lock()

# ========== YOUR EXISTING FUNCTIONS (copy from .github/scripts/sync_mods.py) ==========
MODS_JSON_PATH = "mods.json"
BASE_SITEMAP = "https://www.ets2world.com/sitemap.xml"

def extract_mod_page_data(page_url):
    scraper = cloudscraper.create_scraper()
    try:
        response = scraper.get(page_url, timeout=30, headers={'Referer': 'https://www.ets2world.com/'})
        if response.status_code != 200:
            return None, None, None
        html = response.text
    except Exception as e:
        logging.warning(f"Request failed: {e}")
        return None, None, None

    soup = BeautifulSoup(html, 'html.parser')
    # modsfile link
    download_link = None
    match = re.search(r'href=["\'](https?://modsfile\.com/[^"\']+)["\']', html, re.IGNORECASE)
    if match:
        download_link = match.group(1)
    else:
        match2 = re.search(r'https?://modsfile\.com/[^\s"\']+', html)
        if match2:
            download_link = match2.group(0)

    # Image URL
    image_url = ''
    thumbnail = soup.find('div', class_='thumbnail1')
    if thumbnail:
        img = thumbnail.find('img')
        if img and img.get('src'):
            candidate = img['src'].strip()
            if not candidate.startswith('http'):
                candidate = urljoin(page_url, candidate)
            image_url = candidate
    if not image_url:
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            candidate = og_image['content'].strip()
            if not candidate.startswith('http'):
                candidate = urljoin(page_url, candidate)
            image_url = candidate
    if not image_url:
        post_img = soup.find('img', class_='wp-post-image')
        if post_img and post_img.get('src'):
            candidate = post_img['src'].strip()
            if not candidate.startswith('http'):
                candidate = urljoin(page_url, candidate)
            image_url = candidate

    # Description
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

def get_all_mod_urls():
    scraper = cloudscraper.create_scraper()
    try:
        resp = scraper.get(BASE_SITEMAP, timeout=30)
        if resp.status_code != 200:
            return []
        root = ET.fromstring(resp.content)
        ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        sitemaps = root.findall('s:sitemap', ns)
        all_urls = []
        for sitemap in sitemaps:
            loc = sitemap.find('s:loc', ns).text
            if 'post-sitemap' in loc:
                logging.info(f"Processing sitemap: {loc}")
                sitemap_resp = scraper.get(loc, timeout=30)
                if sitemap_resp.status_code == 200:
                    sitemap_root = ET.fromstring(sitemap_resp.content)
                    urls = [url.text for url in sitemap_root.findall('s:url/s:loc', ns)]
                    all_urls.extend(urls)
                time.sleep(0.5)
        return all_urls
    except Exception as e:
        logging.error(f"Sitemap error: {e}")
        return []

def sync_mods():
    if not sync_lock.acquire(blocking=False):
        logging.warning("Sync already running")
        return
    try:
        logging.info("🟢 Starting mod sync...")
        mod_urls = get_all_mod_urls()
        exclude_keywords = ['/tag/', '/author/', '/category/', '/page/', '/feed/']
        mod_urls = [url for url in mod_urls if not any(k in url for k in exclude_keywords)]
        logging.info(f"📄 Found {len(mod_urls)} mod pages")
        all_mods = []
        limit = 1000  # adjust as needed
        for idx, url in enumerate(mod_urls[:limit], 1):
            logging.info(f"🔍 [{idx}/{min(len(mod_urls), limit)}] Processing: {url}")
            dl, img, desc = extract_mod_page_data(url)
            if not dl:
                continue
            title = url.split('/')[-2].replace('-', ' ').title()
            doc_id = re.sub(r'[^a-zA-Z0-9]', '_', url)[:100]
            all_mods.append({
                'id': doc_id,
                'name': title,
                'category': 'ETS2 Mod',
                'gameVersion': '1.59',
                'author': 'ETS2World',
                'downloadUrl': dl,
                'modsfileUrl': dl,
                'imageUrl': img,
                'description': desc,
                'sourceUrl': url,
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            })
            time.sleep(0.5)
        with open(MODS_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(all_mods, f, indent=2, ensure_ascii=False)
        logging.info(f"🎉 Saved {len(all_mods)} mods to {MODS_JSON_PATH}")
    except Exception as e:
        logging.error(f"Sync failed: {e}")
    finally:
        sync_lock.release()

# ========== FLASK ROUTES ==========
@app.route('/')
def index():
    return "ETS2 Mod Sync service is running. Use /sync to trigger sync."

@app.route('/health')
def health():
    return "OK", 200

@app.route('/sync')
def manual_sync():
    if sync_lock.locked():
        return "Sync already in progress", 409
    threading.Thread(target=sync_mods).start()
    return "Sync started. Check logs.", 200

# ========== MAIN ==========
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8000)  # Render uses port 8000 by default