const axios = require('axios');
const admin = require('firebase-admin');

// Use the existing base64 secret parsing
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
          // --- Use a regular expression to find any modsfile.com link in the raw content ---
          const content = post.content.rendered;
          const regex = /https?:\/\/modsfile\.com\/[^\s"']+/i;
          const match = content.match(regex);
          const downloadUrl = match ? match[0] : '';

          if (!downloadUrl) {
            console.log(`⚠️ No modsfile link found for: ${post.title.rendered}`);
            continue;
          }

          // Get the featured image
          let imageUrl = '';
          if (post.featured_media) {
            try {
              const mediaRes = await axios.get(`https://www.ets2world.com/wp-json/wp/v2/media/${post.featured_media}`);
              imageUrl = mediaRes.data.source_url;
            } catch (e) {
              console.warn(`⚠️ Image fetch failed for ${post.title.rendered}`);
            }
          }

          const modData = {
            name: post.title.rendered,
            category: 'ETS2 Mod',
            gameVersion: '1.59',
            author: post.author || 'ETS2World',
            downloadUrl: downloadUrl,
            modsfileUrl: downloadUrl,
            imageUrl: imageUrl,
            description: post.excerpt.rendered.replace(/<[^>]*>?/gm, '').substring(0, 300),
            sourceUrl: post.link,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          };

          await db.collection('mods').doc(`${post.id}`).set(modData, { merge: true });
          total++;
          console.log(`✅ ${modData.name} saved with link: ${downloadUrl}`);
        } catch (err) {
          console.error(`❌ Error on post ${post.id}:`, err.message);
        }
      }
      page++;
    } catch (err) {
      console.error('Page fetch error:', err.message);
      hasMore = false;
    }
  }
  console.log(`🟢 Sync completed. Total mods with valid links saved: ${total}`);
}

syncMods().catch(console.error);