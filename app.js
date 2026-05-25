// ETSCFM MODS HUB - Premium Edition

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
const modCountSpan = document.getElementById('modCount');

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

function updateModCount() {
    if (modCountSpan) {
        modCountSpan.textContent = filteredMods.length;
    }
}

function showLoadingScreen() {
    modsContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading mods...</div>
            <div class="loading-subtext">Fetching the finest trucking mods</div>
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
            (mod.description && mod.description.toLowerCase().includes(searchTerm)) ||
            (mod.category && mod.category.toLowerCase().includes(searchTerm));

        const matchesGameType = gameType === 'all' || getGameType(mod) === gameType;
        const modVersion = mod.gameVersion || '';
        const matchesVersion = version === 'all' || modVersion.includes(version);

        return matchesSearch && matchesGameType && matchesVersion;
    });

    currentPage = 1;
    updateModCount();
    renderCurrentPage();
}

function renderCurrentPage() {
    if (!filteredMods.length) {
        modsContainer.innerHTML = '<div class="no-mods"><i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>No mods found. Try adjusting your search or filters.</div>';
        updatePaginationInfo();
        return;
    }

    const start = (currentPage - 1) * modsPerPage;
    const end = start + modsPerPage;
    const pageMods = filteredMods.slice(start, end);

    modsContainer.innerHTML = '';
    pageMods.forEach((mod) => {
        const imgUrl = mod.imageUrl && mod.imageUrl.trim() ? mod.imageUrl : 'https://placehold.co/400x200/1a1a2e/6366f1?text=No+Preview';
        const gameTypeLabel = getGameType(mod);
        const versionLabel = mod.gameVersion || 'N/A';
        const authorLabel = mod.author || 'Anonymous';
        const desc = mod.description ? (mod.description.length > 100 ? mod.description.substring(0, 100) + '…' : mod.description) : 'No description available';
        const downloadUrl = mod.downloadUrl || mod.modsfileUrl || '#';

        const card = document.createElement('div');
        card.className = 'mod-card';
        card.setAttribute('data-mod', JSON.stringify(mod).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
        
        card.innerHTML = `
            <img src="${imgUrl}" alt="${escapeHtml(mod.name)}" loading="lazy" onerror="this.src='https://placehold.co/400x200/1a1a2e/6366f1?text=Image+Error'">
            <h3>${escapeHtml(mod.name)}</h3>
            <div class="mod-badges">
                <span class="badge game-badge"><i class="fas ${gameTypeLabel === 'ETS2' ? 'fa-truck' : 'fa-truck-fast'}"></i> ${escapeHtml(gameTypeLabel)}</span>
                <span class="badge version-badge"><i class="fas fa-code-branch"></i> v${escapeHtml(versionLabel)}</span>
            </div>
            <div class="mod-meta">
                <i class="fas fa-user"></i> ${escapeHtml(authorLabel)}
            </div>
            <div class="mod-desc">${escapeHtml(desc)}</div>
            <button class="download-btn" data-url="${escapeHtml(downloadUrl)}">
                <i class="fas fa-download"></i> Download Mod
            </button>
        `;
        
        modsContainer.appendChild(card);
    });

    // Download buttons
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = btn.getAttribute('data-url');
            if (url && url !== '#') {
                openDownloadModal(url);
            } else {
                alert('Download link not available for this mod.');
            }
        });
    });

    // Card click for details
    document.querySelectorAll('.mod-card').forEach((card, idx) => {
        const mod = pageMods[idx];
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('download-btn') || e.target.closest('.download-btn')) return;
            if (mod) openDetailsModal(mod);
        });
    });

    updatePaginationInfo();
}

function openDetailsModal(mod) {
    const modal = document.getElementById('detailsModal');
    const container = document.getElementById('detailsContent');
    const gameType = getGameType(mod);
    const downloadUrl = mod.downloadUrl || mod.modsfileUrl || '#';
    const imgSrc = mod.imageUrl && mod.imageUrl.trim() ? mod.imageUrl : 'https://placehold.co/600x300/1a1a2e/6366f1?text=No+Preview';

    container.innerHTML = `
        <div class="details-image">
            <img src="${imgSrc}" alt="${escapeHtml(mod.name)}" onerror="this.src='https://placehold.co/600x300/1a1a2e/6366f1?text=No+Image'">
        </div>
        <h2>${escapeHtml(mod.name)}</h2>
        <div class="details-meta">
            <span class="badge game-badge"><i class="fas ${gameType === 'ETS2' ? 'fa-truck' : 'fa-truck-fast'}"></i> ${gameType}</span>
            <span class="badge version-badge"><i class="fas fa-code-branch"></i> Version ${mod.gameVersion || 'N/A'}</span>
        </div>
        <p class="details-author"><strong><i class="fas fa-user"></i> Author:</strong> ${escapeHtml(mod.author || 'Unknown')}</p>
        <p class="details-category"><strong><i class="fas fa-folder"></i> Category:</strong> ${escapeHtml(mod.category || 'General')}</p>
        <div class="details-description">
            <strong><i class="fas fa-info-circle"></i> Description:</strong>
            <p>${escapeHtml(mod.description || 'No description available.')}</p>
        </div>
        <button class="download-details-btn" data-url="${escapeHtml(downloadUrl)}">
            <i class="fas fa-download"></i> Download Mod
        </button>
    `;

    modal.style.display = 'flex';

    const detailsBtn = container.querySelector('.download-details-btn');
    if (detailsBtn) {
        detailsBtn.addEventListener('click', (e) => {
            const url = detailsBtn.getAttribute('data-url');
            if (url && url !== '#') {
                openDownloadModal(url);
            } else {
                alert('Download link not available.');
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
    const totalPages = Math.ceil(filteredMods.length / modsPerPage) || 1;
    pageInfoSpan.textContent = `Page ${currentPage} of ${totalPages}`;
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

function getFallbackMods() {
    return [
        { id: 1, name: "Scania NextGen Rework v2.0", author: "SCS Modding", category: "Truck", gameVersion: "1.59", description: "Complete rework of Scania NextGen with custom interior, sounds and chassis options. High quality 4K textures and realistic animations.", imageUrl: "https://placehold.co/400x200/1a1a2e/6366f1?text=Scania+NextGen", downloadUrl: "#" },
        { id: 2, name: "Realistic Rain & Thunder", author: "Darkcaptain", category: "Weather", gameVersion: "1.58", description: "Enhanced rain effects, thunder sounds, and improved water spray from tires. Compatible with all maps.", imageUrl: "https://placehold.co/400x200/1a1a2e/6366f1?text=Realistic+Rain", downloadUrl: "#" },
        { id: 3, name: "Western Star 5700XE", author: "Jon Ruda", category: "Truck", gameVersion: "1.57", description: "Detailed Western Star 5700XE with custom animations, tuning parts, and multiple cabins.", imageUrl: "https://placehold.co/400x200/1a1a2e/6366f1?text=Western+Star", downloadUrl: "#" },
        { id: 4, name: "Promods Canada Expansion", author: "Promods Team", category: "Map", gameVersion: "1.59", description: "Massive map expansion adding British Columbia and Yukon. Over 20 new cities.", imageUrl: "https://placehold.co/400x200/1a1a2e/6366f1?text=Promods+Canada", downloadUrl: "#" },
        { id: 5, name: "Jazzycat Trailers Pack", author: "Jazzycat", category: "Trailer", gameVersion: "1.56", description: "Over 300 new real company trailers including refrigerated, curtain siders and tankers.", imageUrl: "https://placehold.co/400x200/1a1a2e/6366f1?text=Trailers+Pack", downloadUrl: "#" },
        { id: 6, name: "Sound Fixes Pack", author: "Drive Safely", category: "Sound", gameVersion: "1.59", description: "Over 1000 realistic sound effects for AI traffic, weather, interiors and environment.", imageUrl: "https://placehold.co/400x200/1a1a2e/6366f1?text=Sound+Fixes", downloadUrl: "#" }
    ];
}

async function loadMods() {
    showLoadingScreen();
    
    try {
        const timestamp = Date.now();
        const response = await fetch(`/mods.json?t=${timestamp}`);
        
        if (!response.ok) throw new Error();
        const data = await response.json();
        allMods = Array.isArray(data) && data.length ? data : getFallbackMods();
    } catch (err) {
        console.warn("Using fallback mods");
        allMods = getFallbackMods();
    }
    
    applyFilters();
}

// Event Listeners
searchInput.addEventListener('input', applyFilters);
gameTypeFilter.addEventListener('change', applyFilters);
versionFilter.addEventListener('change', applyFilters);
prevBtn.addEventListener('click', prevPage);
nextBtn.addEventListener('click', nextPage);

document.getElementById('closeDetailsBtn')?.addEventListener('click', closeModals);
document.getElementById('closeDownloadBtn')?.addEventListener('click', closeModals);
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) closeModals();
});

loadMods();
