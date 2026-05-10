// ========== FIREBASE CONFIG ==========
const firebaseConfig = {
    apiKey: "AIzaSyA2TdxuK8ShYEVF4yi1Fg8KOfoY7ymWzkU",
    authDomain: "lk-ets2-mods-hub-ca78e.firebaseapp.com",
    projectId: "lk-ets2-mods-hub-ca78e",
    storageBucket: "lk-ets2-mods-hub-ca78e.firebasestorage.app",
    messagingSenderId: "784056421027",
    appId: "1:784056421027:web:0e0c894e0b0eed17934d16"
};

// ========== INIT FIREBASE ==========
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
firebase.auth().signInAnonymously().catch(error => console.warn("Auth error:", error));

// ========== WORKER URL (NO trailing slash issues) ==========
const WORKER_URL = 'https://modsfile-bypass.slherotech3.workers.dev';

// ========== HELPER ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== DOWNLOAD VIA WORKER (with fallback) ==========
async function downloadMod(modsfileUrl, buttonElement) {
    if (!modsfileUrl) {
        alert('No download link available for this mod.');
        return;
    }

    // Save original button text for restoration
    const originalText = buttonElement.innerText;
    buttonElement.innerText = '⏳ Getting link...';
    buttonElement.disabled = true;

    try {
        // 🔁 Call the Cloudflare Worker
        const response = await fetch(`${WORKER_URL}?url=${encodeURIComponent(modsfileUrl)}`);
        const data = await response.json();

        // ✅ Worker returned a valid direct link
        if (data && data.success === true && data.directLink) {
            window.open(data.directLink, '_blank');
            buttonElement.innerText = '⬇️ Download';
            buttonElement.disabled = false;
            return;
        }

        // ⚠️ Worker responded but no direct link – maybe the link is not a modsfile.com link
        console.warn('Worker response:', data);
        // Fallback: open the original modsfile.com page so user can try manually
        if (confirm('Direct link not available. Do you want to open the original download page?')) {
            window.open(modsfileUrl, '_blank');
        } else {
            alert('Direct link not available. Please try later.');
        }
    } catch (err) {
        console.error('Worker error:', err);
        // If Worker fails completely, fallback to original modsfile page
        if (confirm('Download service temporarily unavailable. Open original page?')) {
            window.open(modsfileUrl, '_blank');
        } else {
            alert('Error: ' + err.message);
        }
    } finally {
        buttonElement.innerText = originalText;
        buttonElement.disabled = false;
    }
}

// ========== LOAD MODS FROM FIRESTORE ==========
function loadMods(search = "") {
    const container = document.getElementById("modsContainer");
    if (!container) return;
    container.innerHTML = "<div style='text-align:center; padding:2rem;'>Loading mods...</div>";

    db.collection("mods").orderBy("timestamp", "desc").get()
        .then(snapshot => {
            if (snapshot.empty) {
                container.innerHTML = "<div style='text-align:center; padding:2rem;'>✨ No mods yet. Be the first to add!</div>";
                return;
            }
            container.innerHTML = "";
            snapshot.forEach(doc => {
                const m = doc.data();
                // Apply search filter
                if (search && !m.name.toLowerCase().includes(search) && !m.category.toLowerCase().includes(search)) return;

                // Decide which download UI to show
                let downloadHtml = '';
                if (m.modsfileUrl && m.modsfileUrl.includes('modsfile.com')) {
                    // ✅ Use Worker bypass
                    downloadHtml = `<button class="download-btn" onclick="downloadMod('${escapeHtml(m.modsfileUrl)}', this)">⬇️ Download</button>`;
                } else if (m.downloadUrl) {
                    // ⚠️ Fallback: direct link or other host (no bypass)
                    downloadHtml = `<a href="${escapeHtml(m.downloadUrl)}" target="_blank" class="download-btn">⬇️ Download</a>`;
                } else {
                    downloadHtml = '<span class="no-link">No link available</span>';
                }

                container.innerHTML += `
                    <div class="mod-card">
                        <img src="${m.imageUrl || 'https://via.placeholder.com/280x150?text=No+Image'}"
                             onerror="this.src='https://via.placeholder.com/280x150?text=No+Image'"
                             style="width:100%; height:150px; object-fit:cover; border-radius:10px;">
                        <h3>${escapeHtml(m.name)}</h3>
                        <div class="mod-meta">📁 ${escapeHtml(m.category)} | 🎮 v${escapeHtml(m.gameVersion)}<br>✍️ ${escapeHtml(m.author)}</div>
                        <div class="mod-desc">${escapeHtml(m.description || '')}</div>
                        ${downloadHtml}
                    </div>
                `;
            });
        })
        .catch(err => {
            console.error("Firestore error:", err);
            container.innerHTML = "Error loading mods. Check console.";
        });
}

// ========== ADD A NEW MOD (MANUAL) ==========
function addMod() {
    const name = document.getElementById("modName")?.value.trim();
    const category = document.getElementById("modCategory")?.value.trim();
    const version = document.getElementById("modVersion")?.value.trim();
    const author = document.getElementById("modAuthor")?.value.trim();
    const dlUrl = document.getElementById("modDownloadUrl")?.value.trim();
    const imgUrl = document.getElementById("modImageUrl")?.value.trim();
    const desc = document.getElementById("modDesc")?.value.trim();

    if (!name || !category || !version || !author || !dlUrl) {
        alert("Please fill all required fields.");
        return;
    }

    db.collection("mods").add({
        name,
        category,
        gameVersion: version,
        author,
        downloadUrl: dlUrl,       // fallback
        modsfileUrl: dlUrl,       // if dlUrl is a modsfile.com link → Worker will be used
        imageUrl: imgUrl,
        description: desc,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Mod added successfully!");
        loadMods();
        // Clear the form
        document.getElementById("modName").value = "";
        document.getElementById("modCategory").value = "";
        document.getElementById("modVersion").value = "";
        document.getElementById("modAuthor").value = "";
        document.getElementById("modDownloadUrl").value = "";
        document.getElementById("modImageUrl").value = "";
        document.getElementById("modDesc").value = "";
        // Optionally hide the form
        const form = document.getElementById("addForm");
        if (form) form.style.display = "none";
    }).catch(err => alert("Error adding mod: " + err.message));
}

// ========== TOGGLE ADD MOD FORM ==========
function toggleForm() {
    const form = document.getElementById("addForm");
    if (form) form.style.display = form.style.display === "none" ? "block" : "none";
}

// ========== SEARCH & INIT ==========
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("keyup", (e) => loadMods(e.target.value.toLowerCase()));
    }
    loadMods();
});
