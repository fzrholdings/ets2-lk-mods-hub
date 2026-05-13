import os
import base64
import json
import re
import sys
import cloudscraper
import firebase_admin
from firebase_admin import credentials, firestore
from xml.etree import ElementTree as ET

def main():
    print("DEBUG: Script started")
    
    # Get secret
    firebase_config_base64 = os.environ.get('FIREBASE_CONFIG_BASE64')
    if not firebase_config_base64:
        print("ERROR: FIREBASE_CONFIG_BASE64 environment variable not set")
        sys.exit(1)
    
    print(f"DEBUG: Secret length: {len(firebase_config_base64)}")
    
    # Decode and parse JSON
    try:
        cred_json = base64.b64decode(firebase_config_base64).decode('utf-8')
        print(f"DEBUG: Decoded JSON length: {len(cred_json)}")
        cred_dict = json.loads(cred_json)
        print(f"DEBUG: Project ID: {cred_dict.get('project_id')}")
    except Exception as e:
        print(f"ERROR: Failed to decode/parse: {e}")
        sys.exit(1)
    
    # Initialize Firebase
    try:
        cred = credentials.Certificate(cred_dict)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("DEBUG: Firebase initialized successfully")
    except Exception as e:
        print(f"ERROR: Firebase init failed: {e}")
        sys.exit(1)
    
    # Fetch RSS feed using cloudscraper
    feed_url = "https://www.ets2world.com/feed/"
    print(f"DEBUG: Fetching RSS feed from {feed_url}")
    try:
        scraper = cloudscraper.create_scraper()
        response = scraper.get(feed_url, timeout=30)
        print(f"DEBUG: HTTP status code: {response.status_code}")
        if response.status_code != 200:
            print(f"ERROR: RSS feed returned {response.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"ERROR: Failed to fetch RSS: {e}")
        sys.exit(1)
    
    # Parse XML
    try:
        root = ET.fromstring(response.content)
        items = root.findall('.//item')
        print(f"DEBUG: Found {len(items)} items in RSS feed")
    except Exception as e:
        print(f"ERROR: XML parsing failed: {e}")
        sys.exit(1)
    
    # Process each item
    for item in items:
        title = item.find('title').text if item.find('title') is not None else "No title"
        link = item.find('link').text if item.find('link') is not None else ""
        description = item.find('description').text if item.find('description') is not None else ""
        
        print(f"Processing: {title}")
        
        # Create document ID
        doc_id = re.sub(r'[^a-zA-Z0-9]', '_', link)[:1500] if link else "unknown"
        
        mod_data = {
            'name': title,
            'downloadUrl': link,
            'gameVersion': '1.59',
            'author': 'ETS2World',
            'modsfileUrl': link,
            'imageUrl': '',
            'description': description[:500],
            'sourceUrl': link,
            'timestamp': firestore.SERVER_TIMESTAMP
        }
        
        try:
            db.collection('mods').document(doc_id).set(mod_data, merge=True)
            print(f"  -> Saved: {title}")
        except Exception as e:
            print(f"  -> ERROR saving {title}: {e}")
    
    print("DEBUG: Script finished")

if __name__ == "__main__":
    main()