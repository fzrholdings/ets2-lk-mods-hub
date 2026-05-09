// Firebase Config (replace with your own)
const firebaseConfig = {
    apiKey: "AIzaSyA2TdxuK8ShYEVF4yi1Fg8KOfoY7ymWzkU",
    authDomain: "lk-ets2-mods-hub-ca78e.firebaseapp.com",
    projectId: "lk-ets2-mods-hub-ca78e",
    storageBucket: "lk-ets2-mods-hub-ca78e.firebasestorage.app",
    messagingSenderId: "784056421027",
    appId: "1:784056421027:web:0e0c894e0b0eed17934d16"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
firebase.auth().signInAnonymously().catch(console.warn);

function loadMods(search = "") {
    const container = document.getElementById("modsContainer");
    container.innerHTML = "<div style='text-align:center; padding:2rem;'>Loading mods...</div>";
    db.collection("mods").orderBy("timestamp", "desc").get().then(snapshot => {
        if(snapshot.empty) { container.innerHTML = "<div style='text-align:center; padding:2rem;'>No mods yet. Be the first to add!</div>"; return; }
        container.innerHTML = "";
        snapshot.forEach(doc => {
            const m = doc.data();
            if(search && !m.name.toLowerCase().includes(search) && !m.category.toLowerCase().includes(search)) return;
            container.innerHTML += `
                <div class="mod-card">
                    <img src="${m.imageUrl || 'https://via.placeholder.com/280x160?text=No+Image'}" onerror="this.src='https://via.placeholder.com/280x160?text=Image+Error'">
                    <h3>${escapeHtml(m.name)}</h3>
                    <div class="mod-meta">📁 ${escapeHtml(m.category)} | 🎮 v${escapeHtml(m.gameVersion)}<br>✍️ ${escapeHtml(m.author)}</div>
                    <div class="mod-desc">${escapeHtml(m.description || 'No description')}</div>
                    <a href="${m.downloadUrl}" target="_blank" class="download-btn">⬇️ Direct Download</a>
                </div>
            `;
        });
    }).catch(err => { console.error(err); container.innerHTML = "Error loading mods"; });
}

function addMod() {
    const name = document.getElementById("modName").value.trim();
    const category = document.getElementById("modCategory").value.trim();
    const version = document.getElementById("modVersion").value.trim();
    const author = document.getElementById("modAuthor").value.trim();
    const dlUrl = document.getElementById("modDownloadUrl").value.trim();
    const imgUrl = document.getElementById("modImageUrl").value.trim();
    const desc = document.getElementById("modDesc").value.trim();
    if(!name || !category || !version || !author || !dlUrl) {
        alert("Please fill: name, category, version, author, download link");
        return;
    }
    db.collection("mods").add({
        name, category, gameVersion: version, author, downloadUrl: dlUrl, imageUrl: imgUrl, description: desc,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Mod added!");
        loadMods();
        document.getElementById("modName").value = "";
        document.getElementById("modCategory").value = "";
        document.getElementById("modVersion").value = "";
        document.getElementById("modAuthor").value = "";
        document.getElementById("modDownloadUrl").value = "";
        document.getElementById("modImageUrl").value = "";
        document.getElementById("modDesc").value = "";
    }).catch(err => alert("Error: "+err.message));
}

function escapeHtml(str) { 
    if(!str) return '';
    return str.replace(/[&<>]/g, function(m){ if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); 
}

document.getElementById("searchInput").addEventListener("keyup", (e) => loadMods(e.target.value.toLowerCase()));
loadMods();
