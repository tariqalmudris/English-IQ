// script.js

document.addEventListener('DOMContentLoaded', () => {

    // --- Share Application Implementation ---
    window.shareApp = async () => {
        const shareData = {
            title: 'دروسي العراقية — English IQ Iraq',
            text: 'تعلم الإنجليزية بذكاء مع منصة دروسي العراقية — English IQ Iraq للمراحل المتوسطة والإعدادية.',
            url: window.location.origin + window.location.pathname
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                console.log('[App] Shared successfully');
            } else {
                // Fallback: Copy to clipboard
                await navigator.clipboard.writeText(shareData.url);
                showToast('📋 تم نسخ رابط التطبيق! شاركه الآن مع زملائك');
            }
        } catch (err) {
            console.error('[App] Share failed:', err);
        }
    };

    // Helper to show toast (simple alert for now)
    function showToast(msg) {
        alert(msg);
    }
    // 1. Setup Highlight CSS dynamically if not present
    if (!document.getElementById('search-highlight-style')) {
        const style = document.createElement('style');
        style.id = 'search-highlight-style';
        style.textContent = `
            .search-highlight {
                background-color: rgba(250, 204, 21, 0.4);
                color: inherit;
                border-radius: 3px;
                padding: 0 2px;
                transition: background-color 0.3s;
                font-weight: 800;
            }
        `;
        document.head.appendChild(style);
    }

    const searchInputs = document.querySelectorAll('.search-input');
    
    // Classes of items that can be filtered
    const filterableSelectors = [
        '.lesson-card', // For grade-template.html
        '.detail-card', // For middle-stage.html & secondary-stage.html
        '.grade-card'   // For index.html
    ];

    searchInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            const regex = createArabicRegex(query);

            // Filter standard cards
            filterableSelectors.forEach(selector => {
                const items = document.querySelectorAll(selector);
                
                items.forEach(item => {
                    // Always restore original text first to clean up old marks
                    restoreOriginalText(item);
                    
                    if (query === '') {
                        item.style.display = ''; 
                        return;
                    }
                    
                    // Highlight logic returns true if a match is found
                    const hasMatch = highlightNode(item, regex);
                    
                    if (hasMatch) {
                        item.style.display = ''; 
                    } else {
                        item.style.display = 'none';
                    }
                });
            });

            // Special logic for index.html: parent stage-section handling
            const stageSections = document.querySelectorAll('.stage-section');
            stageSections.forEach(section => {
                const header = section.querySelector('.stage-header');
                
                if (query === '') {
                    section.style.display = '';
                    restoreOriginalText(header);
                    return;
                }
                
                restoreOriginalText(header);
                
                // Check if any grade-card inside is visible
                let hasVisibleCards = false;
                section.querySelectorAll('.grade-card').forEach(card => {
                    if (card.style.display !== 'none') {
                        hasVisibleCards = true;
                    }
                });
                
                // Check if the stage header itself matches the query
                const headerMatch = highlightNode(header, regex);
                
                if (hasVisibleCards || headerMatch) {
                    section.style.display = '';
                    
                    // Force open the accordion stage to show the matched results
                    if (!section.classList.contains('active')) {
                        section.classList.add('active');
                    }
                    
                    // If the user searches for the header itself (e.g. "إعدادية"), let's ensure all its cards are shown
                    if (headerMatch && !hasVisibleCards) {
                        section.querySelectorAll('.grade-card').forEach(card => {
                            card.style.display = '';
                        });
                    }
                } else {
                    section.style.display = 'none';
                }
            });
        });
    });

    /**
     * Normalizes Arabic text to handle variations in characters (Alif, Yaa, Haa)
     */
    function createArabicRegex(query) {
        let escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let dynamicRegex = escaped
            .replace(/[اأإآ]/g, '[اأإآ]')
            .replace(/[هة]/g, '[هة]')
            .replace(/[يى]/g, '[يى]');
        return new RegExp(`(${dynamicRegex})`, 'gi');
    }

    /**
     * Unwraps all highlighted generic marked text safely.
     */
    function restoreOriginalText(element) {
        if (!element) return;
        const marks = element.querySelectorAll('mark.search-highlight');
        marks.forEach(mark => {
            const parent = mark.parentNode;
            if (parent) {
                parent.replaceChild(document.createTextNode(mark.textContent), mark);
                parent.normalize();
            }
        });
    }

    /**
     * Wraps matched text inside a Node with a styled mark element.
     */
    function highlightNode(node, regex) {
        if (!node) return false;
        
        const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
        let n;
        const textNodes = [];
        
        // Collect all valid text nodes
        while (n = walk.nextNode()) {
            if (n.nodeValue.trim() !== '' && 
                n.parentNode.nodeName !== 'SCRIPT' && 
                n.parentNode.nodeName !== 'STYLE') {
                textNodes.push(n);
            }
        }

        let hasMatch = false;

        textNodes.forEach(textNode => {
            const text = textNode.nodeValue;
            if (regex.test(text)) {
                hasMatch = true;
                const fragment = document.createDocumentFragment();
                let lastIdx = 0;
                
                // Important to reset lastIndex when iterating with exec()
                regex.lastIndex = 0;
                let match;
                while ((match = regex.exec(text)) !== null) {
                    const offset = match.index;
                    // Append text preceding the match
                    fragment.appendChild(document.createTextNode(text.slice(lastIdx, offset)));
                    
                    // Create mark element for the match
                    const mark = document.createElement('mark');
                    mark.className = 'search-highlight';
                    mark.textContent = match[0];
                    fragment.appendChild(mark);
                    
                    lastIdx = offset + match[0].length;
                }
                
                // Append remaining text after all matches
                fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
                textNode.parentNode.replaceChild(fragment, textNode);
            }
        });

        return hasMatch;
    }

    // --- Dynamic Lesson Loader System ---
    const lessonsContainer = document.getElementById('lessonsContainer');
    
    // Check if we are on the grade template page and data is imported
    if (lessonsContainer && typeof LESSONS_DATA !== 'undefined' && typeof ICONS !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        let targetGrade = urlParams.get('grade');
        let targetTitle = urlParams.get('title');

        // Fallback to data attribute if simple static dev/test is preferred
        if (!targetGrade) {
            targetGrade = lessonsContainer.getAttribute('data-grade');
        }

        // Dynamically update page title if provided
        if (targetTitle) {
            const titleEl = document.querySelector('.page-title');
            if (titleEl) {
                titleEl.textContent = targetTitle;
                document.title = `${targetTitle} | منصة الإنجليزية`;
            }
        }

        // Dynamically update back button URL
        const backBtn = document.querySelector('.page-header .back-btn');
        if (backBtn && targetGrade) {
            if (targetGrade.startsWith('prep-') || targetGrade.startsWith('secondary-')) {
                backBtn.href = 'secondary-stage.html';
            } else if (targetGrade.startsWith('middle-')) {
                backBtn.href = 'middle-stage.html';
            } else {
                backBtn.href = 'index.html';
            }
        }

        // Render matching lessons
        if (targetGrade) {
            const filteredLessons = LESSONS_DATA.filter(lesson => lesson.grade === targetGrade);
            
            let html = '';
            filteredLessons.forEach((lesson, index) => {
                const iconSvg = ICONS[lesson.icon] || ICONS['video'];
                // Staggered animation matching our CSS logic (0.05s increments)
                const delay = 0.05 * (index + 1);
                
                html += `
                <div class="lesson-card" style="animation-delay: ${delay}s" data-lesson-id="${lesson.id}">
                    <div class="lesson-icon-bg">
                        ${iconSvg}
                    </div>
                    <div class="lesson-info">
                        <span class="lesson-meta">${lesson.meta}</span>
                        <h3 class="lesson-title">${lesson.title}</h3>
                    </div>
                    <div class="lesson-actions">
                        <a href="${lesson.path}" class="watch-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653z" />
                            </svg>
                            مشاهدة الدرس
                        </a>
                    </div>
                </div>
                `;
            });
            
            // Empty state placeholder
            if (filteredLessons.length === 0) {
                html = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                        <svg style="margin: 0 auto 16px; width: 64px; height: 64px; opacity: 0.5;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">لا توجد دروس متاحة</h3>
                        <p style="font-size: 1.1rem;">سيتم إضافة الدروس الخاصة بهذا الصف قريباً.</p>
                    </div>
                `;
            }

            lessonsContainer.innerHTML = html;

            // Inject ⭐ favorite buttons after HTML is in the DOM
            if (typeof createFavBtn === 'function') {
                filteredLessons.forEach(lesson => {
                    const card = lessonsContainer.querySelector(`[data-lesson-id="${lesson.id}"]`);
                    if (!card) return;
                    const actionsDiv = card.querySelector('.lesson-actions');
                    const favBtn = createFavBtn(lesson);
                    actionsDiv.appendChild(favBtn);
                });
            }

            // ── Lazy reveal: animate cards only when they enter viewport ──
            initLazyReveal();
        }
    }

    // ── Lazy Reveal via IntersectionObserver ─────────────────────────────
    function initLazyReveal() {
        // Cards rendered with CSS slideUp animation — override to lazy mode
        const cards = document.querySelectorAll(
            '.lesson-card, .detail-card, .grade-card, .stage-section'
        );
        if (!cards.length || !('IntersectionObserver' in window)) return;

        // Remove animation from out-of-view cards; keep it for visible ones
        cards.forEach(card => {
            card.classList.add('lazy-hidden');
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.remove('lazy-hidden');
                    entry.target.classList.add('lazy-visible');
                    observer.unobserve(entry.target); // fire once
                }
            });
        }, {
            threshold: 0.08,
            rootMargin: '0px 0px -40px 0px'
        });

        cards.forEach(card => observer.observe(card));
    }

    // Also run lazy reveal for stage/detail pages (non-lesson pages)
    initLazyReveal();
});
