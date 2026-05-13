const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');
const { parseString } = require('xml2js');
const { promisify } = require('util');

const parseXml = promisify(parseString);

// Firebase Secret (base64)
const base64Secret = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
if (!base64Secret) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_BASE64 secret not found');
  process.exit(1);
}

let serviceAccount;
try {
  const jsonString = Buffer.from(base64Secret, 'base64').toString('utf8');
  serviceAccount = JSON.parse(jsonString);
  console.log('✅ Service account parsed successfully');
} catch (e) {
  console.error('❌ Failed to parse service account:', e.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  console.log('✅ Firebase Admin initialized');
}
const db = admin.firestore();

async function getDownloadLink(modPageUrl) {
  try {
    const response = await axios.get(modPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.ets2world.com/'
      },
      timeout: 15000
    });
    const html = response.data;
    const $ = cheerio.load(html);
    let downloadUrl = '';
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('modsfile.com')) {
        downloadUrl = href;
        return false;
      }
    });
    return downloadUrl;
  } catch (err) {
    console.warn(`   ⚠️ Error fetching ${modPageUrl}: ${err.message}`);
    return '';
  }
}

async function syncModsFromRss() {
  const feedUrl = 'https://www.ets2world.com/feed/';
  console.log(`🟢 Fetching RSS feed: ${feedUrl}`);
  try {
    const response = await axios.get(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const xml = response.data;
    const result = await parseXml(xml);
    const items = result.rss.channel[0].item;
    if (!items || items.length === 0) {
      console.log('No items found in RSS feed');
      return;
    }
    let total = 0;
    for (const item of items) {
      const title = item.title[0];
      const link = item.link[0];
      console.log(`🔍 Processing: ${title}`);
      const downloadUrl = await getDownloadLink(link);
      if (!downloadUrl) {
        console.log(`⚠️ No modsfile.com link for: ${title}`);
        continue;
      }
      // Extract image from description
      let imageUrl = '';
      const description = item.description ? item.description[0] : '';
      const $ = cheerio.load(description);
      const img = $('img').first();
      if (img.length) imageUrl = img.attr('src');
      // Use post ID from link (optional)
      const idMatch = link.match(/\/(\d+)\//);
      const postId = idMatch ? idMatch[1] : Buffer.from(link).toString('base64').slice(0, 20);
      const modData = {
        name: title,
        category: 'ETS2 Mod',
        gameVersion: '1.59',
        author: 'ETS2World',
        downloadUrl: downloadUrl,
        modsfileUrl: downloadUrl,
        imageUrl: imageUrl,
        description: description.replace(/<[^>]*>/g, '').substring(0, 300),
        sourceUrl: link,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('mods').doc(`${postId}`).set(modData, { merge: true });
      total++;
      console.log(`✅ ${title} saved. Link: ${downloadUrl}`);
    }
    console.log(`🟢 Sync completed. Total mods saved: ${total}`);
  } catch (err) {
    console.error('RSS fetch error:', err.message);
  }
}

syncModsFromRss().catch(console.error);