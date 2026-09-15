(() => {
    if (['/admin.html', '/privacy.html'].includes(window.location.pathname)) return;

    const storageKey = 'law_cookie_consent';

    function setGatePaused(paused) {
        window.dispatchEvent(new CustomEvent('cookie-consent-gate', { detail: { paused } }));
    }

    function dismiss(value, overlay) {
        localStorage.setItem(storageKey, value);
        overlay.remove();
        document.body.style.overflow = '';
        setGatePaused(false);
        window.dispatchEvent(new CustomEvent('cookie-consent', { detail: { value } }));
    }

    function render() {
        if (localStorage.getItem(storageKey)) return;
        setGatePaused(true);

        const overlay = document.createElement('div');
        overlay.className = 'cookie-consent-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'cookieConsentTitle');

        const card = document.createElement('section');
        card.className = 'cookie-consent-card';
        const heading = document.createElement('h2');
        heading.id = 'cookieConsentTitle';
        heading.dataset.i18n = 'cookie_title';
        const copy = document.createElement('p');
        copy.dataset.i18n = 'cookie_copy';
        const policy = document.createElement('a');
        policy.href = '/privacy.html';
        policy.dataset.i18n = 'cookie_policy';
        const actions = document.createElement('div');
        actions.className = 'cookie-consent-actions';
        const accept = document.createElement('button');
        accept.type = 'button';
        accept.className = 'submit-button';
        accept.dataset.i18n = 'accept';
        accept.addEventListener('click', () => dismiss('accepted', overlay));
        const decline = document.createElement('button');
        decline.type = 'button';
        decline.className = 'cookie-decline-button';
        decline.dataset.i18n = 'decline';
        decline.addEventListener('click', () => dismiss('declined', overlay));
        actions.append(accept, decline);
        card.append(heading, copy, policy, actions);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        window.siteI18n?.applyLanguage(window.siteI18n.getLanguage());
        document.body.style.overflow = 'hidden';
        accept.focus();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
    else render();
})();
