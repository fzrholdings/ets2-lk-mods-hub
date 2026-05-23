// ========== ETSCFM MODS HUB - FINAL APP.JS ==========
// No Firebase – loads mods.json directly
// Features: search, pagination, download modal, responsive

let allMods = [];
let currentPage = 1;
const modsPerPage = 50;          // එක පිටුවකට mods 50 බැගින්
let totalPages = 0;
let currentSearchTerm = "";

// ========== HELPER: escape HTML ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== DOWNLOAD MOD (opens iframe modal) ==========
function downloadMod(modsfileUrl, buttonElement) {
    if (!modsfileUrl || !modsfileUrl.includes('modsfile.com')) {
        alert('Invalid download link or URL missing.');
        return;
    }
    const modal = document.getElementById('downloadModal');
    const iframe = document.getElementById('modalIframe');
    if (modal && iframe) {
        iframe.src = modsfileUrl;
        modal.style.display = 'flex';
    } else {
        // fallback: open in new tab
        window.open(modsfileUrl, '_blank');
    }
}

function closeModal() {
    const modal = document.getElementById('downloadModal');
    const iframe = document.getElementById('modalIframe');
    if (modal) modal.style.display = 'none';
    if (iframe) iframe.src = 'about:blank';
}

// ========== RENDER CURRENT PAGE ==========
function renderMods() {
    const container = document.getElementById("modsContainer");
    if (!container) return;

    const start = (currentPage - 1) * modsPerPage;
    const end = start + modsPerPage;
    const pageMods = allMods.slice(start, end);

    if (pageMods.length === 0) {
        container.innerHTML = "<div class='no-mods'>No mods found. Try a different search.</div>";
        // update pagination buttons
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const pageInfo = document.getElementById('pageInfo');
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        if (pageInfo) pageInfo.innerText = `Page 0 of 0`;
        return;
    }

    container.innerHTML = "";
    for (const mod of pageMods) {
        const downloadLink = mod.modsfileUrl || mod.downloadUrl || '#';
        const category = mod.category || 'ETS2 Mod';
        const gameVersion = mod.gameVersion || '1.59';
        const author = mod.author || 'ETS2World';
        const description = mod.description ? mod.description.substring(0, 120) + (mod.description.length > 120 ? '…' : '') : 'No description available.';
        
        // Image handling – use imageUrl if exists, else placeholder
        let imageHtml = '';
        if (mod.imageUrl && mod.imageUrl.trim() !== '') {
            imageHtml = `<img src="${escapeHtml(mod.imageUrl)}" 
                               referrerpolicy="no-referrer"
                               loading="lazy"
                               onerror="this.src='https://via.placeholder.com/300x150?text=No+Image'"
                               alt="${escapeHtml(mod.name)}">`;
        } else {
            imageHtml = `<img src="https://via.placeholder.com/300x150?text=No+Image" alt="placeholder">`;
        }

        container.innerHTML += `
            <div class="mod-card">
                ${imageHtml}
                <h3>${escapeHtml(mod.name)}</h3>
                <div class="mod-badges">
                    <span class="badge game-badge">${escapeHtml(category)}</span>
                    <span class="badge version-badge">v${escapeHtml(gameVersion)}</span>
                </div>
                <div class="mod-meta">${escapeHtml(author)}</div>
                <div class="mod-desc">${escapeHtml(description)}</div>
                <button class="download-btn" data-url="${escapeHtml(downloadLink)}">Download</button>
            </div>
        `;
    }

    // Attach download event listeners to all download buttons
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.removeEventListener('click', handleDownloadClick);
        btn.addEventListener('click', handleDownloadClick);
    });

    // Update pagination controls state
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');
    if (prevBtn) prevBtn.disabled = (currentPage === 1);
    if (nextBtn) nextBtn.disabled = (currentPage === totalPages);
    if (pageInfo) pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
}

// Separate handler for download buttons (to use event.target)
function handleDownloadClick(e) {
    const btn = e.currentTarget;
    const url = btn.getAttribute('data-url');
    if (url && url !== '#') {
        downloadMod(url, btn);
    } else {
        alert('Download link not available.');
    }
}

// ========== LOAD MODS FROM mods.json ==========
async function loadMods(searchTerm = "") {
    const container = document.getElementById("modsContainer");
    if (!container) return;
    container.innerHTML = "<div class='no-mods'>Loading mods...</div>";

    try {
        // Add cache-busting timestamp to avoid stale Cloudflare cache
        const timestamp = Date.now();
        const response = await fetch(`mods.json?t=${timestamp}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        let mods = await response.json();
        
        // Ensure mods is an array
        if (!Array.isArray(mods)) mods = [];

        // Apply search filter if any
        if (searchTerm && searchTerm.trim() !== "") {
            const term = searchTerm.toLowerCase();
            mods = mods.filter(mod => 
                (mod.name && mod.name.toLowerCase().includes(term)) ||
                (mod.category && mod.category.toLowerCase().includes(term)) ||
                (mod.author && mod.author.toLowerCase().includes(term))
            );
        }

        allMods = mods;
        totalPages = Math.ceil(allMods.length / modsPerPage);
        if (totalPages === 0) totalPages = 1;
        currentPage = 1;
        renderMods();

        // Show/hide pagination wrapper
        const paginationDiv = document.getElementById('paginationControls');
        if (paginationDiv) {
            paginationDiv.style.display = totalPages > 1 ? 'flex' : 'none';
        }
    } catch (err) {
        console.error("Error loading mods:", err);
        container.innerHTML = "<div class='error'>Failed to load mods. Please refresh or try again later.</div>";
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

// ========== SEARCH & INITIALIZATION ==========
document.addEventListener("DOMContentLoaded", () => {
    // Setup search input
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentSearchTerm = e.target.value;
                loadMods(currentSearchTerm);
            }, 300);
        });
    }

    // Setup modal close on background click
    window.onclick = function(event) {
        const modal = document.getElementById('downloadModal');
        if (event.target === modal) {
            closeModal();
        }
    };

    // Initial load
    loadMods();
});
