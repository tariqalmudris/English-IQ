// pwa.js — PWA Registration & Install Prompt Handler

(function () {
    'use strict';

    // ─── Register Service Worker ─────────────────────────────────────────────
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => {
                    console.log('[PWA] Service Worker registered. Scope:', reg.scope);

                    // Check for updates every 60 seconds
                    setInterval(() => reg.update(), 60_000);

                    // Listen for new SW waiting to activate
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                showUpdateBanner();
                            }
                        });
                    });
                })
                .catch(err => console.warn('[PWA] SW registration failed:', err));
        });
    }

    // ─── "Add to Home Screen" Install Prompt ────────────────────────────────
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallBanner();
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        hideInstallBanner();
        showToast('✅ تم تثبيت التطبيق بنجاح!');
    });

    // ─── Install Banner UI ───────────────────────────────────────────────────
    function showInstallBanner() {
        if (document.getElementById('pwa-install-banner')) return;

        // Don't show if already running as standalone
        if (window.matchMedia('(display-mode: standalone)').matches) return;

        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.innerHTML = `
            <div class="pwa-banner-icon">📱</div>
            <div class="pwa-banner-text">
                <strong>ثبّت تطبيق English IQ Iraq</strong>
                <span>وصول سريع بدون متصفح</span>
            </div>
            <button id="pwa-install-btn" class="pwa-install-btn">تثبيت</button>
            <button id="pwa-dismiss-btn" class="pwa-dismiss-btn" aria-label="إغلاق">✕</button>
        `;
        document.body.appendChild(banner);

        // Animate in
        requestAnimationFrame(() => banner.classList.add('pwa-banner--visible'));

        document.getElementById('pwa-install-btn').addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('[PWA] Install outcome:', outcome);
            deferredPrompt = null;
            hideInstallBanner();
        });

        document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
            hideInstallBanner();
            // Don't show again for this session
            sessionStorage.setItem('pwa-banner-dismissed', '1');
        });
    }

    function hideInstallBanner() {
        const banner = document.getElementById('pwa-install-banner');
        if (!banner) return;
        banner.classList.remove('pwa-banner--visible');
        setTimeout(() => banner.remove(), 400);
    }

    // ─── Update Banner UI ────────────────────────────────────────────────────
    function showUpdateBanner() {
        if (document.getElementById('pwa-update-banner')) return;
        const banner = document.createElement('div');
        banner.id = 'pwa-update-banner';
        banner.className = 'pwa-update-banner';
        banner.innerHTML = `
            <span>🔄 تحديث جديد متاح!</span>
            <button onclick="window.location.reload()" class="pwa-update-reload-btn">تحديث الآن</button>
            <button onclick="this.parentElement.remove()" class="pwa-dismiss-btn" aria-label="لاحقاً">✕</button>
        `;
        document.body.appendChild(banner);
        requestAnimationFrame(() => banner.classList.add('pwa-banner--visible'));
    }

    // ─── Generic toast (reuse favorites toast if present) ────────────────────
    function showToast(msg) {
        if (typeof showFavToast === 'function') {
            showFavToast(msg);
            return;
        }
        let toast = document.getElementById('pwa-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'pwa-toast';
            toast.className = 'fav-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('fav-toast--show');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => toast.classList.remove('fav-toast--show'), 3000);
    }

})();
