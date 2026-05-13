import os
import base64
import json
import re
import firebase_admin
from firebase_admin import credentials, firestore
import cloudscraper
from xml.etree import ElementTree as ET

def main():
    # 1. Firebase සම්බන්ධ කිරීම
    firebase_config_base64 = os.environ.get('FIREBASE_CONFIG_BASE64')
    if not firebase_config_base64:
        raise Exception("FIREBASE_CONFIG_BASE64 environment variable not set.")

    cred_json = base64.b64decode(firebase_config_base64).decode('utf-8')
    cred_dict = json.loads(cred_json)
    cred = credentials.Certificate(cred_dict)

    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)

    db = firestore.client()

    # 2. Cloudflare Bypass එකෙන් RSS Feed එක Fetch කිරීම
    scraper = cloudscraper.create_scraper()
    feed_url = "https://www.ets2world.com/feed/"
    response = scraper.get(feed_url)

    if response.status_code != 200:
        print(f"Error fetching RSS feed: HTTP {response.status_code}")
        return

    # 3. XML Parse කර Mods තොරතුරු උකහාගැනීම
    root = ET.fromstring(response.content)
    namespace = {'atom': 'http://www.w3.org/2005/Atom'}
    items = root.findall('.//item')

    for item in items:
        title = item.find('title').text
        link = item.find('link').text
        description = item.find('description').text

        # 4. Document ID එක URL එකෙන් සාදාගැනීම
        doc_id = re.sub(r'[^a-zA-Z0-9]', '_', link)[:1500] # Firestore ID Limits

        # 5. Data එක Firestore වෙත Save කිරීම
        mod_data = {
            'name': title,
            'downloadUrl': link, # මෙතනදී direct download link එක extract කිරීමට වෙනම තර්කනයක් අවශ්‍යයි. (Step 2)
            'gameVersion': '1.59',
            'author': 'ETS2World',
            'modsfileUrl': link,
            'imageUrl': '',
            'description': description,
            'sourceUrl': link,
            'timestamp': firestore.SERVER_TIMESTAMP
        }
        db.collection('mods').document(doc_id).set(mod_data, merge=True)
        print(f"Processed: {title}")

if __name__ == "__main__":
    main()