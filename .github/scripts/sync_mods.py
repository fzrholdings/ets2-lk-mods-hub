import os
import base64
import json
import re
import firebase_admin
from firebase_admin import credentials, firestore
import cloudscraper
from xml.etree import ElementTree as ET

def main():
    firebase_config_base64 = os.environ.get('FIREBASE_CONFIG_BASE64')
    if not firebase_config_base64:
        raise Exception("FIREBASE_CONFIG_BASE64 environment variable not set.")
    
    # Strip any whitespace
    firebase_config_base64 = firebase_config_base64.strip()
    print(f"Base64 length: {len(firebase_config_base64)}")
    
    try:
        cred_json = base64.b64decode(firebase_config_base64).decode('utf-8')
        print(f"Decoded JSON length: {len(cred_json)}")
        cred_dict = json.loads(cred_json)
        print("JSON parsed successfully. Project ID:", cred_dict.get('project_id'))
    except Exception as e:
        print(f"Base64 decode or JSON parse failed: {e}")
        raise
    
    cred = credentials.Certificate(cred_dict)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    
    # ... rest of your script (fetch RSS, etc.)