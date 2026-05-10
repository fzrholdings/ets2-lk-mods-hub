const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');

parse

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
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
      if (posts.length === 0) {
        hasMore = false;
        break;
      }
      for (const post of posts) {
        try {
          const mod = await extractModData(post);
          if (mod.downloadUrl) {
            await db.collection('mods').doc(`${post.id}`).set(mod, { merge: true });
            total++;
            console.log(`✅ ${mod.name} saved/updated`);
          }
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
  console.log(`🟢 Sync completed. Total processed: ${total}`);
}

async function extractModData(post) {
  const postUrl = post.link;
  console.log(`🔍 Fetching details from ${postUrl}`);
  
  const pageRes = await axios.get(postUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = pageRes.data;
  const $ = cheerio.load(html);

  let downloadUrl = '';
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && href.includes('modsfile.com')) {
      downloadUrl = href;
      return false;
    }
  });

  let imageUrl = '';
  if (post.featured_media) {
    try {
      const mediaRes = await axios.get(`https://www.ets2world.com/wp-json/wp/v2/media/${post.featured_media}`);
      imageUrl = mediaRes.data.source_url;
    } catch (e) {
      console.warn('Image fetch failed');
    }
  }

  const description = $(post.excerpt.rendered).text().substring(0, 300);

  return {
    name: post.title.rendered,
    category: 'ETS2 Mod',
    gameVersion: '1.59',
    author: 'ETS2World',
    downloadUrl: downloadUrl,
    modsfileUrl: downloadUrl,
    imageUrl: imageUrl,
    description: description,
    sourceUrl: postUrl,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };
}

syncMods().catch(console.error);