(() => {
    document.documentElement.classList.add('js-ready');
    const STORAGE_KEY = 'siteTheme';
    const DARK = 'dark';
    const LIGHT = 'light';
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)');

    function readPreference() {
        try {
            const value = localStorage.getItem(STORAGE_KEY);
            return value === DARK || value === LIGHT ? value : null;
        } catch {
            return null;
        }
    }

    function writePreference(value) {
        try {
            if (value === DARK || value === LIGHT) {
                localStorage.setItem(STORAGE_KEY, value);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch {
            // The theme still works when storage is unavailable.
        }
    }

    function systemTheme() {
        return systemPreference.matches ? DARK : LIGHT;
    }

    function ensureThemeColor() {
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'theme-color';
            document.head.appendChild(meta);
        }
        return meta;
    }

    function ensureAnnouncer() {
        let announcer = document.getElementById('theme-status');
        if (!announcer && document.body) {
            announcer = document.createElement('span');
            announcer.id = 'theme-status';
            announcer.className = 'theme-sr-only';
            announcer.setAttribute('role', 'status');
            announcer.setAttribute('aria-live', 'polite');
            document.body.appendChild(announcer);
        }
        return announcer;
    }

    function updateButtons(activeTheme, source) {
        document.querySelectorAll('.theme-toggle').forEach((button) => {
            const icon = button.querySelector('i');
            const label = button.querySelector('span');
            const isDark = activeTheme === DARK;
            const nextLabel = isDark ? 'Terang' : 'Gelap';

            if (icon) {
                icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
                icon.setAttribute('aria-hidden', 'true');
            }
            if (label) label.textContent = nextLabel;

            button.type = 'button';
            button.setAttribute('aria-pressed', String(isDark));
            button.setAttribute('aria-label', 'Gunakan mode ' + nextLabel.toLowerCase());
            button.title = 'Mode ' + (isDark ? 'gelap' : 'terang') + ' aktif. Klik untuk mode ' + nextLabel.toLowerCase() + '. Shift+klik untuk mengikuti sistem.';
            button.dataset.themeSource = source;
        });
    }

    function applyTheme(theme, options = {}) {
        const activeTheme = theme === DARK ? DARK : LIGHT;
        const source = options.source === 'system' ? 'system' : 'manual';

        document.documentElement.dataset.theme = activeTheme;
        document.documentElement.dataset.themeSource = source;
        document.documentElement.style.colorScheme = activeTheme;
        if (document.body) document.body.dataset.theme = activeTheme;

        ensureThemeColor().content = activeTheme === DARK ? '#06110c' : '#f8faf9';
        updateButtons(activeTheme, source);

        if (options.persist === true) writePreference(activeTheme);
        if (options.persist === false && source === 'system') writePreference(null);

        if (options.announce) {
            const announcer = ensureAnnouncer();
            if (announcer) {
                announcer.textContent = source === 'system'
                    ? 'Tema mengikuti sistem. Mode ' + (activeTheme === DARK ? 'gelap' : 'terang') + ' aktif.'
                    : 'Mode ' + (activeTheme === DARK ? 'gelap' : 'terang') + ' aktif.';
            }
        }

        window.dispatchEvent(new CustomEvent('hmi:themechange', {
            detail: { theme: activeTheme, source }
        }));
    }

    function addFallbackToggle() {
        const existingCount = document.querySelectorAll('.theme-toggle').length;
        if (existingCount >= 2 || document.querySelector('.theme-fab')) return;

        const button = document.createElement('button');
        button.className = 'theme-toggle theme-fab' + (existingCount ? ' theme-fab-mobile' : '');
        button.innerHTML = '<i class="fas fa-moon" aria-hidden="true"></i><span>Gelap</span>';
        document.body.appendChild(button);
    }

    function initializeBody() {
        const current = document.documentElement.dataset.theme || LIGHT;
        document.body.dataset.theme = current;
        addFallbackToggle();
        ensureAnnouncer();
        updateButtons(current, document.documentElement.dataset.themeSource || 'manual');

        // Trigger page enter animation
        document.body.classList.add('page-loaded');

        requestAnimationFrame(() => {
            requestAnimationFrame(() => document.documentElement.classList.add('theme-ready'));
        });
    }

    const savedPreference = readPreference();
    applyTheme(savedPreference || LIGHT, {
        source: 'manual'
    });

    document.addEventListener('click', (event) => {
        const button = event.target.closest('.theme-toggle');
        if (!button) return;

        if (event.shiftKey) {
            applyTheme(systemTheme(), {
                source: 'system',
                persist: false,
                announce: true
            });
            return;
        }

        const current = document.documentElement.dataset.theme;
        applyTheme(current === DARK ? LIGHT : DARK, {
            source: 'manual',
            persist: true,
            announce: true
        });
    });

    systemPreference.addEventListener('change', () => {
        if (!readPreference() && document.documentElement.dataset.themeSource === 'system') {
            applyTheme(systemTheme(), { source: 'system', announce: true });
        }
    });

    window.addEventListener('storage', (event) => {
        if (event.key !== STORAGE_KEY) return;
        const preference = event.newValue === DARK || event.newValue === LIGHT
            ? event.newValue
            : null;
        applyTheme(preference || LIGHT, {
            source: preference ? 'manual' : 'manual'
        });
    });

    // Global link click transition interceptor
    document.addEventListener('click', (event) => {
        if (event.defaultPrevented) return;
        const link = event.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || link.target || link.hasAttribute('download')) return;

        try {
            const url = new URL(link.href, window.location.origin);
            if (url.origin !== window.location.origin) return;
            if (url.pathname === window.location.pathname) return;
        } catch {
            return;
        }

        event.preventDefault();
        document.body.classList.add('page-exit');
        setTimeout(() => {
            window.location.href = link.href;
        }, 240);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeBody, { once: true });
    } else {
        initializeBody();
    }
})();
