// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyA2TdxuK8ShYEVF4yi1Fg8KOfoY7ymWzkU",
    authDomain: "lk-ets2-mods-hub-ca78e.firebaseapp.com",
    projectId: "lk-ets2-mods-hub-ca78e",
    storageBucket: "lk-ets2-mods-hub-ca78e.firebasestorage.app",
    messagingSenderId: "784056421027",
    appId: "1:784056421027:web:0e0c894e0b0eed17934d16"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
firebase.auth().signInAnonymously().catch(error => console.warn("Auth error:", error));

// Cloudflare Worker URL (replace with your actual worker URL)
const WORKER_URL = 'https://modsfile-bypass.slherotech3.workers.dev'; // 👈 CHANGE THIS

// ------ Helper functions ------
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ------ Download via Worker ------
async function downloadMod(modsfileUrl, buttonElement) {
    if (!modsfileUrl) {
        alert('No download link available for this mod.');
        return;
    }
    buttonElement.innerText = 'Getting link...';
    buttonElement.disabled = true;
    try {
        const response = await fetch(`${WORKER_URL}?url=${encodeURIComponent(modsfileUrl)}`);
        const data = await response.json();
        if (data.success && data.directLink) {
            window.open(data.directLink, '_blank');
        } else {
            alert('Direct link not available. Please try later.');
        }
    } catch (err) {
        console.error(err);
        alert('Error: ' + err.message);
    } finally {
        buttonElement.innerText = 'Download';
        buttonElement.disabled = false;
    }
}

// ------ Load mods from Firestore ------
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
                // Search filter
                if (search && !m.name.toLowerCase().includes(search) && !m.category.toLowerCase().includes(search)) return;
                
                // Use modsfileUrl if exists; otherwise fallback to downloadUrl
                const downloadLinkOrButton = m.modsfileUrl 
                    ? `<button class="download-btn" onclick="downloadMod('${escapeHtml(m.modsfileUrl)}', this)">Download</button>`
                    : (m.downloadUrl ? `<a href="${escapeHtml(m.downloadUrl)}" target="_blank" class="download-btn">⬇️ Download</a>` : '<span>No link</span>');
                
                container.innerHTML += `
                    <div class="mod-card">
                        <img src="${m.imageUrl || 'https://via.placeholder.com/280x150?text=No+Image'}" 
                             onerror="this.src='https://via.placeholder.com/280x150?text=No+Image'" 
                             style="width:100%; height:150px; object-fit:cover; border-radius:10px;">
                        <h3>${escapeHtml(m.name)}</h3>
                        <div class="mod-meta">📁 ${escapeHtml(m.category)} | 🎮 v${escapeHtml(m.gameVersion)}<br>✍️ ${escapeHtml(m.author)}</div>
                        <div class="mod-desc">${escapeHtml(m.description || '')}</div>
                        ${downloadLinkOrButton}
                    </div>
                `;
            });
        })
        .catch(err => {
            console.error("Firestore error:", err);
            container.innerHTML = "Error loading mods. Check console.";
        });
}

// ------ Add a new mod (manual form) ------
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
        name, category, gameVersion: version, author,
        downloadUrl: dlUrl,   // optional fallback
        modsfileUrl: dlUrl,   // if the user pastes a modsfile.com link, it will be used for bypass
        imageUrl: imgUrl,
        description: desc,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Mod added successfully!");
        loadMods();
        // Clear form
        document.getElementById("modName").value = "";
        document.getElementById("modCategory").value = "";
        document.getElementById("modVersion").value = "";
        document.getElementById("modAuthor").value = "";
        document.getElementById("modDownloadUrl").value = "";
        document.getElementById("modImageUrl").value = "";
        document.getElementById("modDesc").value = "";
        // Optionally hide form
        const form = document.getElementById("addForm");
        if (form) form.style.display = "none";
    }).catch(err => alert("Error adding mod: " + err.message));
}

// ------ Toggle Add Mod form visibility ------
function toggleForm() {
    const form = document.getElementById("addForm");
    if (form) form.style.display = form.style.display === "none" ? "block" : "none";
}

// ------ Set up search listener and initial load ------
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("keyup", (e) => loadMods(e.target.value.toLowerCase()));
    }
    loadMods();
});
