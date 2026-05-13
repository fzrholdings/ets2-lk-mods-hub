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

// Fetch single mod page and extract modsfile.com link
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
    
    // Look for any <a> tag where href attribute contains 'modsfile.com'
    let downloadUrl = '';
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('modsfile.com')) {
        downloadUrl = href;
        return false; // stop loop
      }
    });
    return downloadUrl;
  } catch (err) {
    console.warn(`   ⚠️ Error fetching ${modPageUrl}: ${err.message}`);
    return '';
  }
}

async function syncMods() {
  console.log('🟢 Starting sync from ets2world.com...');
  let page = 1;
  let hasMore = true;
  let total = 0;

  while (hasMore) {
    console.log(`📄 Fetching page ${page}...`);
    const apiUrl = `https://www.ets2world.com/wp-json/wp/v2/posts?page=${page}&per_page=50`;
    try {
      const response = await axios.get(apiUrl);
      const posts = response.data;
      if (posts.length === 0) {
        hasMore = false;
        break;
      }

      for (const post of posts) {
        const title = post.title.rendered;
        console.log(`🔍 Processing: ${title}`);
        
        const downloadUrl = await getDownloadLink(post.link);
        if (!downloadUrl) {
          console.log(`⚠️ No modsfile.com link for: ${title}`);
          continue;
        }

        // Get image if available
        let imageUrl = '';
        if (post.featured_media) {
          try {
            const mediaRes = await axios.get(`https://www.ets2world.com/wp-json/wp/v2/media/${post.featured_media}`);
            imageUrl = mediaRes.data.source_url;
          } catch(e) { /* ignore */ }
        }

        const modData = {
          name: title,
          category: 'ETS2 Mod',
          gameVersion: '1.59',
          author: 'ETS2World',
          downloadUrl: downloadUrl,
          modsfileUrl: downloadUrl,
          imageUrl: imageUrl,
          description: post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 300),
          sourceUrl: post.link,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('mods').doc(`${post.id}`).set(modData, { merge: true });
        total++;
        console.log(`✅ ${title} saved. Link: ${downloadUrl}`);
      }
      page++;
    } catch (err) {
      console.error('Error fetching posts:', err.message);
      hasMore = false;
    }
  }
  console.log(`🟢 Sync completed. Total mods with valid links: ${total}`);
}

syncMods().catch(console.error);