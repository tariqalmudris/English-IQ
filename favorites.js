// favorites.js — Shared Favorites Manager (works offline, localStorage only)

const FAVORITES_KEY = 'englishiq_favorites';

// ─── Core API ──────────────────────────────────────────────────────────────

function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    } catch {
        return [];
    }
}

function saveFavorites(list) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
}

function isFavorite(id) {
    return getFavorites().some(f => f.id === id);
}

function toggleFavorite(lessonObj) {
    let list = getFavorites();
    const idx = list.findIndex(f => f.id === lessonObj.id);
    if (idx === -1) {
        list.push(lessonObj);
    } else {
        list.splice(idx, 1);
    }
    saveFavorites(list);
    return idx === -1; // true = just added
}

function removeFavorite(id) {
    saveFavorites(getFavorites().filter(f => f.id !== id));
}

// ─── UI Helper: create the ⭐ button for a lesson card ─────────────────────

function createFavBtn(lesson) {
    const btn = document.createElement('button');
    btn.className = 'fav-btn' + (isFavorite(lesson.id) ? ' fav-btn--active' : '');
    btn.setAttribute('aria-label', 'إضافة للمفضلة');
    btn.setAttribute('data-lesson-id', lesson.id);
    btn.innerHTML = `
        <span class="fav-icon">⭐</span>
        <span class="fav-label">${isFavorite(lesson.id) ? 'في المفضلة' : 'إضافة للمفضلة'}</span>
    `;

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const added = toggleFavorite(lesson);
        btn.classList.toggle('fav-btn--active', added);
        btn.querySelector('.fav-label').textContent = added ? 'في المفضلة' : 'إضافة للمفضلة';

        // Pulse animation
        btn.classList.remove('fav-btn--pulse');
        void btn.offsetWidth; // reflow to restart animation
        btn.classList.add('fav-btn--pulse');

        // Toast notification
        showFavToast(added ? '⭐ تمت الإضافة للمفضلة!' : '🗑️ تم الحذف من المفضلة');
    });

    return btn;
}

// ─── Toast ─────────────────────────────────────────────────────────────────

function showFavToast(msg) {
    let toast = document.getElementById('fav-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'fav-toast';
        toast.className = 'fav-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('fav-toast--show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('fav-toast--show'), 2800);
}

// ─── Favorites badge on nav link ────────────────────────────────────────────

function updateFavNavBadge() {
    const badge = document.getElementById('fav-nav-badge');
    if (!badge) return;
    const count = getFavorites().length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

// Auto-update badge on every page load
document.addEventListener('DOMContentLoaded', updateFavNavBadge);
window.addEventListener('storage', updateFavNavBadge); // syncs across tabs
