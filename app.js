// ETSCFM MODS HUB - FINAL APP.JS

let allMods = [];
let filteredMods = [];
let currentPage = 1;
const modsPerPage = 24;

const modsContainer = document.getElementById('modsContainer');
const searchInput = document.getElementById('searchInput');
const gameTypeFilter = document.getElementById('gameTypeFilter');
const versionFilter = document.getElementById('versionFilter');
const prevBtn = document.getElementById('prevPageBtn');
const nextBtn = document.getElementById('nextPageBtn');
const pageInfoSpan = document.getElementById('pageInfo');

function getGameType(mod) {
    const name = (mod.name || '').toUpperCase();
    const category = (mod.category || '').toUpperCase();
    if (name.includes('ATS') || category.includes('ATS')) return 'ATS';
    return 'ETS2';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Loading screen with spinning circle
function showLoadingScreen() {
    modsContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading mods...</div>
            <div class="loading-subtext">Please wait while we fetch the latest mods</div>
        </div>
    `;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    pageInfoSpan.textContent = "Loading...";
}

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const gameType = gameTypeFilter.value;
    const version = versionFilter.value;

    filteredMods = allMods.filter(mod => {
        const matchesSearch = searchTerm === '' ||
            (mod.name && mod.name.toLowerCase().includes(searchTerm)) ||
            (mod.author && mod.author.toLowerCase().includes(searchTerm)) ||
            (mod.description && mod.description.toLowerCase().includes(searchTerm));

        const matchesGameType = gameType === 'all' || getGameType(mod) === gameType;
        const modVersion = mod.gameVersion || '';
        const matchesVersion = version === 'all' || modVersion.includes(version);

        return matchesSearch && matchesGameType && matchesVersion;
    });

    currentPage = 1;
    renderCurrentPage();
}

function renderCurrentPage() {
    if (!filteredMods.length) {
        modsContainer.innerHTML = '<div class="no-mods">No mods found. Try different filters.</div>';
        updatePaginationInfo();
        return;
    }

    const start = (currentPage - 1) * modsPerPage;
    const end = start + modsPerPage;
    const pageMods = filteredMods.slice(start, end);

    modsContainer.innerHTML = '';
    pageMods.forEach((mod, idx) => {
        const originalIndex = allMods.indexOf(mod);
        const card = document.createElement('div');
        card.className = 'mod-card';
        card.setAttribute('data-mod-index', originalIndex);

        const imgUrl = mod.imageUrl && mod.imageUrl.trim() ? mod.imageUrl : 'https://via.placeholder.com/300x150?text=No+Image';
        const gameTypeLabel = getGameType(mod);
        const versionLabel = mod.gameVersion || 'N/A';
        const authorLabel = mod.author || 'Unknown';
        const desc = mod.description ? (mod.description.length > 100 ? mod.description.substring(0, 100) + '…' : mod.description) : 'No description';

        card.innerHTML = `
            <img src="${imgUrl}" alt="${escapeHtml(mod.name)}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x150?text=Image+Error'">
            <h3>${escapeHtml(mod.name)}</h3>
            <div class="mod-badges">
                <span class="badge game-badge">${escapeHtml(gameTypeLabel)}</span>
                <span class="badge version-badge">v${escapeHtml(versionLabel)}</span>
            </div>
            <div class="mod-meta">${escapeHtml(authorLabel)}</div>
            <div class="mod-desc">${escapeHtml(desc)}</div>
            <button class="download-btn" data-url="${escapeHtml(mod.downloadUrl || '')}">Download</button>
        `;
        modsContainer.appendChild(card);
    });

    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = btn.getAttribute('data-url');
            if (url && url !== '') {
                openDownloadModal(url);
            } else {
                alert('Download link not available');
            }
        });
    });

    document.querySelectorAll('.mod-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('download-btn')) return;
            const index = parseInt(card.getAttribute('data-mod-index'));
            const mod = allMods[index];
            if (mod) openDetailsModal(mod);
        });
    });

    updatePaginationInfo();
}

function openDetailsModal(mod) {
    const modal = document.getElementById('detailsModal');
    const container = document.getElementById('detailsContent');
    const gameType = getGameType(mod);
    const downloadUrl = mod.downloadUrl || '#';

    container.innerHTML = `
        <div class="details-image">
            <img src="${mod.imageUrl && mod.imageUrl.trim() ? mod.imageUrl : 'https://via.placeholder.com/400x200?text=No+Image'}" alt="${escapeHtml(mod.name)}" onerror="this.src='https://via.placeholder.com/400x200?text=No+Image'">
        </div>
        <h2>${escapeHtml(mod.name)}</h2>
        <div class="details-meta">
            <span class="badge game-badge">${gameType}</span>
            <span class="badge version-badge">Version: ${mod.gameVersion || 'N/A'}</span>
        </div>
        <p class="details-author"><strong>Author:</strong> ${escapeHtml(mod.author || 'Unknown')}</p>
        <p class="details-category"><strong>Category:</strong> ${escapeHtml(mod.category || 'General')}</p>
        <div class="details-description">
            <strong>Description:</strong>
            <p>${escapeHtml(mod.description || 'No description available.')}</p>
        </div>
        <button class="download-details-btn" data-url="${escapeHtml(downloadUrl)}">Download Mod</button>
    `;

    modal.style.display = 'flex';

    const detailsBtn = container.querySelector('.download-details-btn');
    if (detailsBtn) {
        detailsBtn.addEventListener('click', (e) => {
            const url = detailsBtn.getAttribute('data-url');
            if (url && url !== '#') {
                openDownloadModal(url);
            } else {
                alert('Download link not available');
            }
        });
    }
}

function openDownloadModal(url) {
    const modal = document.getElementById('downloadModal');
    const iframe = document.getElementById('modalIframe');
    if (modal && iframe) {
        iframe.src = url;
        modal.style.display = 'flex';
    } else {
        window.open(url, '_blank');
    }
}

function closeModals() {
    document.getElementById('detailsModal').style.display = 'none';
    document.getElementById('downloadModal').style.display = 'none';
    const iframe = document.getElementById('modalIframe');
    if (iframe) iframe.src = 'about:blank';
}

function updatePaginationInfo() {
    const totalPages = Math.ceil(filteredMods.length / modsPerPage);
    pageInfoSpan.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderCurrentPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredMods.length / modsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderCurrentPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Fallback demo mods (in case mods.json is missing)
function getFallbackMods() {
    return [
        { id: 1, name: "Scania NextGen Rework v2.0", author: "SCS Modding", category: "Truck", gameVersion: "1.59", description: "Complete rework of Scania NextGen with custom interior, sounds and chassis options. High quality 4K textures.", imageUrl: "https://via.placeholder.com/300x150?text=Scania+NextGen", downloadUrl: "#" },
        { id: 2, name: "Realistic Rain & Thunder", author: "Darkcaptain", category: "Weather", gameVersion: "1.58", description: "Enhanced rain effects, thunder sounds, and improved water spray from tires.", imageUrl: "https://via.placeholder.com/300x150?text=Realistic+Rain", downloadUrl: "#" },
        { id: 3, name: "Western Star 5700XE", author: "Jon Ruda", category: "Truck", gameVersion: "1.57", description: "Detailed Western Star 5700XE with custom animations, tuning parts, and multiple cabins.", imageUrl: "https://via.placeholder.com/300x150?text=Western+Star", downloadUrl: "#" },
        { id: 4, name: "Promods Canada Expansion", author: "Promods Team", category: "Map", gameVersion: "1.59", description: "Massive map expansion adding British Columbia and Yukon. Over 20 new cities.", imageUrl: "https://via.placeholder.com/300x150?text=Promods+Canada", downloadUrl: "#" },
        { id: 5, name: "Jazzycat Trailers Pack", author: "Jazzycat", category: "Trailer", gameVersion: "1.56", description: "Over 300 new real company trailers including refrigerated, curtain siders and tankers.", imageUrl: "https://via.placeholder.com/300x150?text=Trailers+Pack", downloadUrl: "#" },
        { id: 6, name: "Sound Fixes Pack", author: "Drive Safely", category: "Sound", gameVersion: "1.59", description: "Over 1000 realistic sound effects for AI traffic, weather, interiors and environment.", imageUrl: "https://via.placeholder.com/300x150?text=Sound+Fixes", downloadUrl: "#" },
        { id: 7, name: "Kenworth W900 Tuning Pack", author: "Outlaw Gaming", category: "Tuning", gameVersion: "1.58", description: "Custom grilles, lightbars, bullbars, and interior accessories for Kenworth W900.", imageUrl: "https://via.placeholder.com/300x150?text=Kenworth+Tuning", downloadUrl: "#" },
        { id: 8, name: "Realistic Graphics Mod", author: "DamianSV", category: "Graphics", gameVersion: "1.59", description: "Complete graphics overhaul with reshade, better skies, and improved lighting.", imageUrl: "https://via.placeholder.com/300x150?text=Realistic+Graphics", downloadUrl: "#" }
    ];
}

async function loadMods() {
    showLoadingScreen();
    
    try {
        const timestamp = Date.now();
        const response = await fetch(`/mods.json?t=${timestamp}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        allMods = Array.isArray(data) && data.length ? data : getFallbackMods();
    } catch (err) {
        console.warn("mods.json not found or error, using fallback demo mods");
        allMods = getFallbackMods();
    }
    
    applyFilters();
}

// Event listeners
searchInput.addEventListener('input', applyFilters);
gameTypeFilter.addEventListener('change', applyFilters);
versionFilter.addEventListener('change', applyFilters);
prevBtn.addEventListener('click', prevPage);
nextBtn.addEventListener('click', nextPage);

document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', closeModals);
});

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) closeModals();
});

// Start the app
loadMods();
