const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');

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

async function syncMods() {
  console.log('🟢 Sync started from ets2world.com...');
  let page = 1;
  let hasMore = true;
  let total = 0;

  while (hasMore) {
    console.log(`📄 Fetching page ${page}...`);
    const url = `https://www.ets2world.com/wp-json/wp/v2/posts?page=${page}&per_page=50`;
    try {
      const response = await axios.get(url);
      const posts = response.data;
      if (posts.length === 0) { hasMore = false; break; }
      for (const post of posts) {
        try {
          const $ = cheerio.load(post.content.rendered);
          let downloadUrl = '';
          $('a').each((_, el) => {
            const href = $(el).attr('href');
            if (href && href.includes('modsfile.com')) { downloadUrl = href; return false; }
          });
          if (!downloadUrl) { console.log(`⚠️ No modsfile link for: ${post.title.rendered}`); continue; }
          let imageUrl = '';
          if (post.featured_media) {
            try {
              const mediaRes = await axios.get(`https://www.ets2world.com/wp-json/wp/v2/media/${post.featured_media}`);
              imageUrl = mediaRes.data.source_url;
            } catch(e) { console.warn('Image fetch failed'); }
          }
          const modData = {
            name: post.title.rendered,
            category: 'ETS2 Mod',
            gameVersion: '1.59',
            author: 'ETS2World',
            downloadUrl: downloadUrl,
            modsfileUrl: downloadUrl,
            imageUrl: imageUrl,
            description: $(post.excerpt.rendered).text().substring(0,300),
            sourceUrl: post.link,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          };
          await db.collection('mods').doc(`${post.id}`).set(modData, { merge: true });
          total++;
          console.log(`✅ ${modData.name} saved/updated`);
        } catch(err) { console.error(`❌ Error on post ${post.id}:`, err.message); }
      }
      page++;
    } catch(err) { console.error('Page fetch error:', err.message); hasMore = false; }
  }
  console.log(`🟢 Sync completed. Total processed: ${total}`);
}

syncMods().catch(console.error);