// ETSCFM MODS HUB - app.js (loading state added, nothing else changed)

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

function showLoading() {
    modsContainer.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <div>Loading mods...</div>
        </div>
    `;
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
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredMods.length / modsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderCurrentPage();
    }
}

async function loadMods() {
    showLoading();
    try {
        const res = await fetch('/mods.json');
        if (!res.ok) throw new Error();
        const data = await res.json();
        allMods = Array.isArray(data) ? data : [];
        applyFilters();
    } catch (err) {
        modsContainer.innerHTML = '<div class="error">Failed to load mods. Please try again later.</div>';
    }
}

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

loadMods();
