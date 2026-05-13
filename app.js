// ========== NO FIREBASE ==========
let allMods = [];
let currentPage = 1;
const modsPerPage = 50;   // එක පිටුවකට mods 50 බැගින්
let totalPages = 0;

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

// ========== DOWNLOAD MOD (modal with iframe) ==========
function downloadMod(modsfileUrl, buttonElement) {
    if (!modsfileUrl || !modsfileUrl.includes('modsfile.com')) {
        alert('Invalid download link.');
        return;
    }
    const modal = document.getElementById('downloadModal');
    const iframe = document.getElementById('modalIframe');
    iframe.src = modsfileUrl;
    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('downloadModal');
    const iframe = document.getElementById('modalIframe');
    iframe.src = 'about:blank';
    modal.style.display = 'none';
}

// ========== RENDER MODS FOR CURRENT PAGE ==========
function renderMods() {
    const container = document.getElementById("modsContainer");
    if (!container) return;
    const start = (currentPage - 1) * modsPerPage;
    const end = start + modsPerPage;
    const pageMods = allMods.slice(start, end);
    
    if (pageMods.length === 0) {
        container.innerHTML = "<div style='text-align:center; padding:2rem;'>✨ No mods found.</div>";
        return;
    }
    
    container.innerHTML = "";
    pageMods.forEach(mod => {
        const downloadLink = mod.modsfileUrl || mod.downloadUrl;
        const category = mod.category || 'ETS2 Mod';
        const gameVersion = mod.gameVersion || '1.59';
        const author = mod.author || 'ETS2World';
        
        container.innerHTML += `
            <div class="mod-card">
                <img src="${mod.imageUrl || 'https://via.placeholder.com/280x150?text=No+Image'}"
                     onerror="this.src='https://via.placeholder.com/280x150?text=No+Image'"
                     style="width:100%; height:150px; object-fit:cover; border-radius:10px;">
                <h3>${escapeHtml(mod.name)}</h3>
                <div class="mod-meta">📁 ${escapeHtml(category)} | 🎮 v${escapeHtml(gameVersion)}<br>✍️ ${escapeHtml(author)}</div>
                <div class="mod-desc">${escapeHtml(mod.description || '')}</div>
                <button class="download-btn" onclick="downloadMod('${escapeHtml(downloadLink)}', this)">⬇️ Download</button>
            </div>
        `;
    });
    
    // Update pagination buttons state
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');
    if (prevBtn) prevBtn.disabled = (currentPage === 1);
    if (nextBtn) nextBtn.disabled = (currentPage === totalPages);
    if (pageInfo) pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
}

// ========== LOAD MODS FROM JSON ==========
async function loadMods(search = "") {
    const container = document.getElementById("modsContainer");
    if (!container) return;
    container.innerHTML = "<div style='text-align:center; padding:2rem;'>Loading mods...</div>";
    
    try {
        const response = await fetch('mods.json');
        if (!response.ok) throw new Error('Failed to load mods.json');
        let mods = await response.json();
        
        if (search) {
            mods = mods.filter(mod => 
                mod.name.toLowerCase().includes(search) || 
                (mod.category && mod.category.toLowerCase().includes(search))
            );
        }
        
        allMods = mods;
        totalPages = Math.ceil(allMods.length / modsPerPage);
        if (totalPages === 0) totalPages = 1;
        currentPage = 1;
        renderMods();
        
        // Show pagination controls if more than one page
        const paginationDiv = document.getElementById('paginationControls');
        if (paginationDiv) {
            paginationDiv.style.display = totalPages > 1 ? 'flex' : 'none';
        }
    } catch (err) {
        console.error("Error loading mods:", err);
        container.innerHTML = "<div style='text-align:center; padding:2rem;'>Error loading mods. Please try again later.</div>";
    }
}

// ========== PAGINATION FUNCTIONS ==========
function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        renderMods();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderMods();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ========== SEARCH & INIT ==========
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("keyup", (e) => {
            // When searching, reset to page 1 and filter allMods
            const term = e.target.value.toLowerCase();
            // Reload from original JSON? Better to re-fetch and filter? 
            // For simplicity, we re-fetch and filter.
            loadMods(term);
        });
    }
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('downloadModal');
        if (event.target === modal) {
            closeModal();
        }
    };
    
    loadMods();
});