// nav.js — Smooth Navigation & View Transitions
(function () {
    'use strict';

    // ── 1. CSS Cross-Document View Transitions (Chrome 126+) ────────────────
    // Handled purely via CSS: @view-transition { navigation: auto }
    // This file handles the JS fallback + link interception

    // ── 2. Page-entry animation class ───────────────────────────────────────
    document.documentElement.classList.add('page-loading');
    window.addEventListener('load', () => {
        requestAnimationFrame(() => {
            document.documentElement.classList.remove('page-loading');
            document.documentElement.classList.add('page-ready');
        });
    });

    // ── 3. Intercept internal link clicks for smooth transitions ────────────
    function isSameSite(href) {
        try {
            const url = new URL(href, location.href);
            return url.origin === location.origin &&
                   !href.startsWith('#') &&
                   !href.startsWith('javascript');
        } catch { return false; }
    }

    function navigateTo(href) {
        // Use View Transitions API if available (Chrome 111+)
        if (document.startViewTransition) {
            document.startViewTransition(() => {
                window.location.href = href;
            });
        } else {
            // CSS-only fade fallback
            document.documentElement.classList.add('page-exit');
            setTimeout(() => { window.location.href = href; }, 220);
        }
    }

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || !isSameSite(href)) return;
        // Skip back-btn, watch-btn going to external video, and hash links
        if (href.startsWith('#')) return;
        if (link.target === '_blank') return;

        e.preventDefault();
        navigateTo(link.href);
    }, true);

    // ── 4. Prefetch likely next pages on hover ───────────────────────────────
    const prefetched = new Set();
    function prefetch(url) {
        if (prefetched.has(url)) return;
        prefetched.add(url);
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.as = 'document';
        document.head.appendChild(link);
    }

    document.addEventListener('mouseover', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || !isSameSite(href) || href.startsWith('#')) return;
        prefetch(new URL(href, location.href).href);
    }, { passive: true });

    // Also prefetch on touchstart (mobile)
    document.addEventListener('touchstart', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || !isSameSite(href) || href.startsWith('#')) return;
        prefetch(new URL(href, location.href).href);
    }, { passive: true });

    // ── 5. Back/Forward cache support ────────────────────────────────────────
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            // Page restored from bfcache — remove exit classes
            document.documentElement.classList.remove('page-exit', 'page-loading');
            document.documentElement.classList.add('page-ready');
        }
    });

})();
