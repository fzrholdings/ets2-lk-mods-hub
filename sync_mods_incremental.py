import os
import json
import re
import time
import cloudscraper
import logging
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from xml.etree import ElementTree as ET

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

MODS_JSON_PATH = "mods.json"
BASE_SITEMAP = "https://www.ets2world.com/sitemap.xml"

def is_version_ge_159(version_str):
    """Return True if version >= 1.59"""
    if not version_str:
        return False
    try:
        # extract first number like 1.59 or 1.59.2
        parts = str(version_str).split('.')
        if len(parts) >= 2:
            major = int(parts[0])
            minor = int(parts[1])
            if major > 1:
                return True
            if major == 1 and minor >= 59:
                return True
        return False
    except:
        return False

def extract_mod_page_data(page_url):
    scraper = cloudscraper.create_scraper()
    try:
        response = scraper.get(page_url, timeout=30, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        if response.status_code != 200:
            return None
        html = response.text
    except Exception as e:
        logging.warning(f"Request failed: {e}")
        return None

    soup = BeautifulSoup(html, 'html.parser')
    
    # download link
    download_link = None
    match = re.search(r'href=["\'](https?://modsfile\.com/[^"\']+)["\']', html, re.IGNORECASE)
    if match:
        download_link = match.group(1)
    else:
        match2 = re.search(r'https?://modsfile\.com/[^\s"\']+', html)
        if match2:
            download_link = match2.group(0)
    if not download_link:
        return None
    
    # image URL
    image_url = ''
    og_image = soup.find('meta', property='og:image')
    if og_image and og_image.get('content'):
        image_url = og_image['content']
    if not image_url:
        thumbnail = soup.find('div', class_='thumbnail1')
        if thumbnail:
            img = thumbnail.find('img')
            if img and img.get('src'):
                image_url = img['src']
    if not image_url:
        post_img = soup.find('img', class_='wp-post-image')
        if post_img and post_img.get('src'):
            image_url = post_img['src']
    
    # description
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
    
    # category
    category = 'ETS2 Mod'
    breadcrumb = soup.find('div', class_='breadcrumbs')
    if breadcrumb:
        links = breadcrumb.find_all('a')
        if len(links) >= 2:
            category = links[1].get_text(strip=True)
    if '/ets2-trucks/' in page_url:
        category = 'ETS2 Trucks'
    elif '/ets2-parts-tuning/' in page_url:
        category = 'ETS2 Parts/Tuning'
    elif '/ets2-trailers/' in page_url:
        category = 'ETS2 Trailers'
    elif '/ets2-cars/' in page_url:
        category = 'ETS2 Cars'
    elif '/ets2-buses/' in page_url:
        category = 'ETS2 Buses'
    
    # game version
    game_version = '1.59'
    version_pattern = re.compile(r'(\d+\.\d+(?:\.\d+)?)')
    if entry_inner:
        text_sample = entry_inner.get_text()[:2000]
        versions = version_pattern.findall(text_sample)
        for v in versions:
            if v.startswith('1.') and len(v) >= 4:
                game_version = v
                break
    
    # version filter: only 1.59 and above
    if not is_version_ge_159(game_version):
        return None
    
    # author
    author = 'ETS2World'
    author_span = soup.find('span', class_='author vcard')
    if author_span:
        author = author_span.get_text(strip=True)
    else:
        author_link = soup.find('a', rel='author')
        if author_link:
            author = author_link.get_text(strip=True)
    
    title = page_url.split('/')[-2].replace('-', ' ').title()
    doc_id = re.sub(r'[^a-zA-Z0-9]', '_', page_url)[:100]
    
    return {
        'id': doc_id,
        'name': title,
        'category': category,
        'gameVersion': game_version,
        'author': author,
        'downloadUrl': download_link,
        'modsfileUrl': download_link,
        'imageUrl': image_url,
        'description': description,
        'sourceUrl': page_url,
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }

def get_all_mod_urls():
    """Fetch all post URLs from sitemap (only post-sitemap) in reverse order (newest first)."""
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
                logging.info(f"Fetching sitemap: {loc}")
                sitemap_resp = scraper.get(loc, timeout=30)
                if sitemap_resp.status_code == 200:
                    sitemap_root = ET.fromstring(sitemap_resp.content)
                    urls = [url.text for url in sitemap_root.findall('s:url/s:loc', ns)]
                    all_urls.extend(urls)
        # remove non-mod pages
        exclude_keywords = ['/tag/', '/author/', '/category/', '/page/', '/feed/']
        all_urls = [url for url in all_urls if not any(k in url for k in exclude_keywords)]
        # reverse so newest first
        all_urls.reverse()
        return all_urls
    except Exception as e:
        logging.error(f"Sitemap error: {e}")
        return []

def load_existing_mods():
    """Load existing mods.json, return dict of sourceUrl -> mod object and list of mods."""
    if not os.path.exists(MODS_JSON_PATH):
        return {}, []
    with open(MODS_JSON_PATH, 'r', encoding='utf-8') as f:
        try:
            existing = json.load(f)
            if not isinstance(existing, list):
                existing = []
            existing_map = {mod.get('sourceUrl'): mod for mod in existing if mod.get('sourceUrl')}
            return existing_map, existing
        except:
            return {}, []

def save_mods(mods_list):
    """Save mods list to mods.json"""
    with open(MODS_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(mods_list, f, indent=2, ensure_ascii=False)
    logging.info(f"💾 Saved {len(mods_list)} mods to mods.json")

def sync_incremental():
    logging.info("🔄 Starting incremental sync (version >= 1.59 only, newest first)")
    
    # load existing
    existing_map, existing_mods = load_existing_mods()
    logging.info(f"📂 Existing mods: {len(existing_mods)}")
    
    # get all mod URLs in reverse order
    all_urls = get_all_mod_urls()
    total = len(all_urls)
    logging.info(f"🌐 Total mod pages from sitemap: {total}")
    
    new_mods = []
    new_count = 0
    checked_count = 0
    
    for idx, url in enumerate(all_urls, 1):
        if url in existing_map:
            # already have this mod, since URLs are in order we can stop after reaching existing ones?
            # but because of version filter, some existing might be skipped anyway.
            # we continue until we have checked enough but we can break after a threshold to save time
            # for incremental, we can break after encountering first existing (since we go newest first)
            # however, if version filter skipped older versions, the existing_map may contain older.
            # So we check a few more? Actually reverse order, once we hit a URL already in map,
            # all remaining are older, but because our version filter only keeps 1.59+, many older will be filtered.
            # To be safe, we still continue but limit to max 500 new checks per run.
            pass
        
        logging.info(f"🔍 [{idx}/{total}] Checking: {url}")
        mod_data = extract_mod_page_data(url)
        if mod_data is None:
            # download link missing or version <1.59
            continue
        
        if url not in existing_map:
            new_mods.append(mod_data)
            new_count += 1
            logging.info(f"✅ NEW MOD: {mod_data['name']} (v{mod_data['gameVersion']})")
        
        # to avoid long runtime, stop after 50 new mods or after checking 500 URLs
        if new_count >= 50:
            logging.info("🛑 Reached 50 new mods, stopping.")
            break
        if idx >= 500:
            logging.info("🛑 Checked 500 URLs, stopping.")
            break
        
        time.sleep(1)  # be polite
    
    if new_mods:
        # prepend new mods to existing (newest first)
        updated_mods = new_mods + existing_mods
        save_mods(updated_mods)
        logging.info(f"✨ Added {len(new_mods)} new mods (total {len(updated_mods)})")
    else:
        logging.info("✅ No new mods found.")

if __name__ == "__main__":
    sync_incremental()