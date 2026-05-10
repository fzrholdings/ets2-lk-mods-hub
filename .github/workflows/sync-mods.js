const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function syncMods() {
  console.log('🟢 Sync started...');
  let page = 1;
  let hasMore = true;
  let total = 0;
  while (hasMore) {
    const url = `https://www.ets2world.com/wp-json/wp/v2/posts?page=${page}&per_page=50`;
    try {
      const res = await axios.get(url);
      const posts = res.data;
      if (posts.length === 0) { hasMore = false; break; }
      for (const post of posts) {
        const mod = await extractModData(post);
        if (mod.downloadUrl) {
          await db.collection('mods').doc(`${post.id}`).set(mod, { merge: true });
          total++;
          console.log(`✅ ${mod.name}`);
        }
      }
      page++;
    } catch(err) { hasMore = false; }
  }
  console.log(`🟢 Done. Total: ${total}`);
}

async function extractModData(post) {
  const postUrl = post.link;
  const pageRes = await axios.get(postUrl);
  const $ = cheerio.load(pageRes.data);
  let downloadUrl = '';
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && href.includes('modsfile.com')) { downloadUrl = href; return false; }
  });
  let imageUrl = '';
  if (post.featured_media) {
    try {
      const mediaRes = await axios.get(`https://www.ets2world.com/wp-json/wp/v2/media/${post.featured_media}`);
      imageUrl = mediaRes.data.source_url;
    } catch(e) {}
  }
  return {
    name: post.title.rendered,
    category: 'ETS2 Mod',
    gameVersion: '1.59',
    author: 'ETS2World',
    downloadUrl: downloadUrl,
    modsfileUrl: downloadUrl,
    imageUrl: imageUrl,
    description: $(post.excerpt.rendered).text().substring(0,300),
    sourceUrl: postUrl,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };
}

syncMods().catch(console.error);